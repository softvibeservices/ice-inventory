// src/app/api/delivery/list/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyUserRequest } from "@/lib/userAuth";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Access denied: Managers not allowed" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    // We still need adminEmail for backwards compat with legacy records
    // Import User only for email lookup — role is already in token
    const { default: User } = await import("@/models/User");
    const user = await User.findById(auth.userId).select("email");
    const adminEmail = user?.email ? String(user.email).toLowerCase() : null;

    const ors: any[] = [
      { createdByUser: userObjectId },
      { createdByUser: auth.userId }, // legacy string fallback
    ];

    if (adminEmail) {
      const safe = escapeRegex(adminEmail);
      ors.push({ adminEmail: { $regex: new RegExp(`^${safe}$`, "i") } });
    }

    const filter: any = { $or: ors };

    if (status) {
      filter.status = { $regex: new RegExp(`^${String(status)}$`, "i") };
    }

    const raw = await DeliveryPartner.find(filter).sort({ createdAt: -1 }).lean();

    const normalized = (Array.isArray(raw) ? raw : []).map((doc: any) => {
      const email = doc.email
        ? String(doc.email).toLowerCase()
        : doc.contactEmail
        ? String(doc.contactEmail).toLowerCase()
        : null;

      let admin = doc.adminEmail ?? doc.ownerEmail ?? null;
      admin = admin ? String(admin).toLowerCase() : null;

      let createdByUserVal: string | null = null;
      if (doc.createdByUser) {
        createdByUserVal =
          typeof doc.createdByUser === "object" && doc.createdByUser._id
            ? String(doc.createdByUser._id)
            : String(doc.createdByUser);
      }

      const s = doc.status ? String(doc.status).toLowerCase() : "pending";
      const statusNorm = s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";

      return {
        _id: doc._id ? String(doc._id) : null,
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
    return NextResponse.json(
      { error: "Failed to list partners", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}