import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import mongoose from "mongoose";

/** escape regex to avoid accidental regex injection */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/delivery/list?userId=...&adminEmail=...&status=...
 *
 * Behavior:
 * - Prefer adminEmail when provided (query or NEXT_PUBLIC_ADMIN_EMAIL).
 * - If adminEmail is absent but userId provided, use userId matching createdByUser (string or ObjectId).
 * - adminEmail matching is case-insensitive exact match (safe by escaping).
 * - Returns normalized partner objects.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? undefined;
    const adminEmailQuery = searchParams.get("adminEmail") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    // server-side env fallback
    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase()
      : undefined;

    // prefer query adminEmail, else env fallback
    const adminEmailRaw = adminEmailQuery ?? envAdminEmail;
    const adminEmail = adminEmailRaw ? String(adminEmailRaw).toLowerCase() : undefined;

    if (!userId && !adminEmail) {
      return NextResponse.json(
        { error: "userId or adminEmail required (or set NEXT_PUBLIC_ADMIN_EMAIL)" },
        { status: 400 }
      );
    }

    await connectDB();

    const filter: any = {};

    if (adminEmail) {
      // match adminEmail case-insensitively but escape user input
      const safe = escapeRegex(adminEmail);
      filter.adminEmail = { $regex: new RegExp(`^${safe}$`, "i") };
    } else if (userId) {
      // Match createdByUser either as string or ObjectId
      const ors: any[] = [{ createdByUser: userId }, { createdByUser: String(userId) }, { ownerId: userId }, { ownerId: String(userId) }];
      if (mongoose.Types.ObjectId.isValid(userId)) {
        ors.push({ createdByUser: new mongoose.Types.ObjectId(userId) }, { ownerId: new mongoose.Types.ObjectId(userId) });
      }
      filter.$or = ors;
    }

    if (status) {
      filter.status = { $regex: new RegExp(`^${String(status)}$`, "i") };
    }

    const raw = await DeliveryPartner.find(filter).sort({ createdAt: -1 }).lean();

    const normalized = (Array.isArray(raw) ? raw : []).map((doc: any) => {
      const email = doc.email ? String(doc.email).toLowerCase() : doc.contactEmail ? String(doc.contactEmail).toLowerCase() : null;
      let admin = doc.adminEmail ?? doc.ownerEmail ?? null;
      admin = admin ? String(admin).toLowerCase() : null;

      let createdByUserVal: string | null = null;
      if (doc.createdByUser) createdByUserVal = typeof doc.createdByUser === "object" && doc.createdByUser._id ? String(doc.createdByUser._id) : String(doc.createdByUser);
      else if (doc.ownerId) createdByUserVal = typeof doc.ownerId === "object" && doc.ownerId._id ? String(doc.ownerId._id) : String(doc.ownerId);

      const s = doc.status ? String(doc.status).toLowerCase() : "pending";
      const statusNorm = s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";

      return {
        _id: doc._id ? String(doc._id) : (doc.id ? String(doc.id) : null),
        name: doc.name ?? doc.fullName ?? "Unknown",
        email,
        phone: doc.phone ?? doc.contact ?? null,
        avatar: doc.avatar ?? null,
        status: statusNorm,
        createdByUser: createdByUserVal,
        adminEmail: admin,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        notifiedAt: doc.notifiedAt ? new Date(doc.notifiedAt).toISOString() : null,
        metadata: doc.metadata ?? {},
      };
    });

    return NextResponse.json(normalized, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/delivery/list error:", err);
    return NextResponse.json({ error: "Failed to list partners", details: err?.message ?? String(err) }, { status: 500 });
  }
}
