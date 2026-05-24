// src/app/api/activity-logs/route.ts
// ─────────────────────────────────────────────────────────────────────────────
//  GET  /api/activity-logs
//
//  Returns paginated ActivityLog entries.
//
//  Access rules:
//    admin   → sees ALL logs (managers + delivery partners) for their shop
//    manager → sees ONLY delivery_partner logs (never manager logs)
//
//  Query params:
//    page        number   Page number, 1-based (default: 1)
//    limit       number   Docs per page, max 100 (default: 30)
//    category    string   Filter by category (order|customer|product|stock|bill|sticky_note|delivery)
//    actorRole   string   Admin only — filter by role (manager|delivery_partner)
//    actorId     string   Filter by a specific actor's ObjectId
//    action      string   Filter by a specific action enum value
//    startDate   string   ISO date — only logs on or after this date
//    endDate     string   ISO date — only logs on or before this date
//
//  Response:
//    {
//      logs:       IActivityLog[],
//      total:      number,
//      page:       number,
//      totalPages: number,
//    }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyUserRequest } from "@/lib/userAuth";
import ActivityLog, {
  ActivityCategoryType,
  ActivityActionType,
} from "@/models/ActivityLog";

/** Max docs the client may request per page */
const MAX_LIMIT = 100;
/** Default docs per page */
const DEFAULT_LIMIT = 30;

export async function GET(req: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const auth = await verifyUserRequest(req);
    if (auth instanceof NextResponse) return auth;

    // Only admin and manager roles are allowed
    if (auth.role !== "admin" && auth.role !== "manager") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // For both admin and manager tokens, auth.userId is the shop-owner's _id.
    // (Manager JWTs store adminId in the userId field so all data queries work.)
    const adminId = auth.userId;

    await connectDB();

    // ── 2. Parse query params ────────────────────────────────────────────────
    const { searchParams } = req.nextUrl;

    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const skip  = (page - 1) * limit;

    // ── 3. Build filter ──────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { adminId };

    if (auth.role === "manager") {
      // ── Manager view: ONLY delivery partner logs ─────────────────────────
      // Managers must never see their own logs or any other manager's logs.
      // This is enforced server-side — the client cannot override this.
      filter.actorRole = "delivery_partner";
    } else {
      // ── Admin view: optional actorRole filter from query params ───────────
      const actorRole = searchParams.get("actorRole");
      if (actorRole) filter.actorRole = actorRole;
    }

    const category  = searchParams.get("category")  as ActivityCategoryType | null;
    const actorId   = searchParams.get("actorId");
    const action    = searchParams.get("action")    as ActivityActionType | null;
    const startDate = searchParams.get("startDate");
    const endDate   = searchParams.get("endDate");

    if (category) filter.category = category;
    if (actorId)  filter.actorId  = actorId;
    if (action)   filter.action   = action;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate);
    }

    // ── 4. Query ─────────────────────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      ActivityLog
        .find(filter)
        .sort({ createdAt: -1 })        // newest first
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    // ── 5. Respond ───────────────────────────────────────────────────────────
    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/activity-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}