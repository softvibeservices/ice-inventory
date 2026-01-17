// src/app/api/delivery/list/route.ts
// ✅ FIXED VERSION - Admin email comes from logged-in user, NOT from .env

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import mongoose from "mongoose";
import User from "@/models/User";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") ?? undefined;

    // ✅ SECURITY: userId is REQUIRED
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ SECURITY: Get the actual user's email and role
    const user = await User.findById(userId).select("email role");
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ SECURITY: Block managers from accessing delivery partners
    if (user.role === "manager") {
      return NextResponse.json(
        { error: "Access denied: Managers not allowed" },
        { status: 403 }
      );
    }

    // ✅ CORRECT: Use the logged-in user's email as adminEmail
    const adminEmail = user.email ? String(user.email).toLowerCase() : null;

    // ✅ BUILD FILTER: Find delivery partners belonging to THIS admin
    const filter: any = {};

    // Filter by userId (primary method)
    const ors: any[] = [
      { createdByUser: userId },
      { createdByUser: String(userId) },
    ];

    if (mongoose.Types.ObjectId.isValid(userId)) {
      ors.push({ createdByUser: new mongoose.Types.ObjectId(userId) });
    }

    // Also support adminEmail for backwards compatibility
    if (adminEmail) {
      const safe = escapeRegex(adminEmail);
      ors.push({ adminEmail: { $regex: new RegExp(`^${safe}$`, "i") } });
    }

    filter.$or = ors;

    // Filter by status if provided
    if (status) {
      filter.status = { $regex: new RegExp(`^${String(status)}$`, "i") };
    }

    // ✅ QUERY: Get delivery partners belonging to this admin
    const raw = await DeliveryPartner.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // ✅ NORMALIZE: Format the response
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
      const statusNorm =
        s === "approved"
          ? "approved"
          : s === "rejected"
          ? "rejected"
          : "pending";

      return {
        _id: doc._id ? String(doc._id) : doc.id ? String(doc.id) : null,
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