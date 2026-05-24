// src/app/api/activity-logs/route.ts
// ─────────────────────────────────────────────────────────────────────────────
//  GET  /api/activity-logs
//
//  Returns paginated ActivityLog entries for the authenticated shop owner.
//
//  Query params:
//    page        number   Page number, 1-based (default: 1)
//    limit       number   Docs per page, max 100 (default: 30)
//    category    string   Filter by category (order|customer|product|stock|bill|sticky_note|delivery)
//    actorRole   string   Filter by role (manager|delivery_partner)
//    actorId     string   Filter by a specific actor's ObjectId
//    action      string   Filter by a specific action enum value
//    startDate   string   ISO date — only logs on or after this date
//    endDate     string   ISO date — only logs on or before this date
//
//  Response:
//    {
//      logs:       IActivityLog[],
//      total:      number,   // total matching documents (for pagination)
//      page:       number,
//      totalPages: number,
//    }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {connectDB} from "@/lib/mongodb";
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
    // ── 1. Authenticate — must be the shop owner (admin role) ────────────────
    //  verifyUserRequest returns AuthPayload on success, NextResponse on failure.
    //  The instanceof guard narrows the type so TypeScript knows what we have.
    const auth = await verifyUserRequest(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden — only shop owners can view activity logs" },
        { status: 403 }
      );
    }

    //  For admin tokens, auth.userId is the admin's own _id.
    const adminId = auth.userId;

    await connectDB();

    // ── 2. Parse query params ────────────────────────────────────────────────
    const { searchParams } = req.nextUrl;

    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const skip  = (page - 1) * limit;

    // ── 3. Build filter ──────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      adminId,
    };

    const category  = searchParams.get("category")  as ActivityCategoryType | null;
    const actorRole = searchParams.get("actorRole");
    const actorId   = searchParams.get("actorId");
    const action    = searchParams.get("action")    as ActivityActionType | null;
    const startDate = searchParams.get("startDate");
    const endDate   = searchParams.get("endDate");

    if (category)  filter.category  = category;
    if (actorRole) filter.actorRole = actorRole;
    if (actorId)   filter.actorId   = actorId;
    if (action)    filter.action    = action;

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