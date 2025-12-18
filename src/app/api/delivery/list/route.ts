// src\app\api\delivery\list\route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import mongoose from "mongoose";
import User from "@/models/User"; // 🔒 added

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? undefined;
    const adminEmailQuery = searchParams.get("adminEmail") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase()
      : undefined;

    const adminEmailRaw = adminEmailQuery ?? envAdminEmail;
    const adminEmail = adminEmailRaw
      ? String(adminEmailRaw).toLowerCase()
      : undefined;

    if (!userId && !adminEmail) {
      return NextResponse.json(
        {
          error:
            "userId or adminEmail required (or set NEXT_PUBLIC_ADMIN_EMAIL)",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // 🔒 SECURITY CHECK
    if (userId) {
      const user = await User.findById(userId).select("role");
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      if (user.role === "manager") {
        return NextResponse.json(
          { error: "Access denied: Managers not allowed" },
          { status: 403 }
        );
      }
    }

    // ✔ ORIGINAL DELIVERY LIST LOGIC
    const filter: any = {};

    if (adminEmail) {
      const safe = escapeRegex(adminEmail);
      filter.adminEmail = { $regex: new RegExp(`^${safe}$`, "i") };
    } else if (userId) {
      const ors: any[] = [
        { createdByUser: userId },
        { createdByUser: String(userId) },
        { ownerId: userId },
        { ownerId: String(userId) },
      ];
      if (mongoose.Types.ObjectId.isValid(userId)) {
        ors.push(
          { createdByUser: new mongoose.Types.ObjectId(userId) },
          { ownerId: new mongoose.Types.ObjectId(userId) }
        );
      }
      filter.$or = ors;
    }

    if (status) {
      filter.status = { $regex: new RegExp(`^${String(status)}$`, "i") };
    }

    const raw = await DeliveryPartner.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const normalized = (Array.isArray(raw) ? raw : []).map((doc: any) => {
      const email = doc.email
        ? String(doc.email).toLowerCase()
        : doc.contactEmail
        ? String(doc.contactEmail).toLowerCase()
        : null;
      let admin = doc.adminEmail ?? doc.ownerEmail ?? null;
      admin = admin ? String(admin).toLowerCase() : null;

      let createdByUserVal: string | null = null;
      if (doc.createdByUser)
        createdByUserVal =
          typeof doc.createdByUser === "object" && doc.createdByUser._id
            ? String(doc.createdByUser._id)
            : String(doc.createdByUser);
      else if (doc.ownerId)
        createdByUserVal =
          typeof doc.ownerId === "object" && doc.ownerId._id
            ? String(doc.ownerId._id)
            : String(doc.ownerId);

      const s = doc.status
        ? String(doc.status).toLowerCase()
        : "pending";
      const statusNorm =
        s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";

      return {
        _id: doc._id
          ? String(doc._id)
          : doc.id
          ? String(doc.id)
          : null,
        name: doc.name ?? doc.fullName ?? "Unknown",
        email,
        phone: doc.phone ?? doc.contact ?? null,
        avatar: doc.avatar ?? null,
        status: statusNorm,
        createdByUser: createdByUserVal,
        adminEmail: admin,
        createdAt: doc.createdAt
          ? new Date(doc.createdAt).toISOString()
          : null,
        notifiedAt: doc.notifiedAt
          ? new Date(doc.notifiedAt).toISOString()
          : null,
        metadata: doc.metadata ?? {},
      };
    });

    return NextResponse.json(normalized, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/delivery/list error:", err);
    return NextResponse.json(
      {
        error: "Failed to list partners",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
