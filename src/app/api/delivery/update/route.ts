// src/app/api/delivery/update/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, name, email, phone, status } = body ?? {};

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const createdByUserVal = partner.createdByUser ? partner.createdByUser.toString() : null;

    // Get admin email for legacy compatibility
    const { default: User } = await import("@/models/User");
    const adminUser = await User.findById(auth.userId).select("email");
    const adminEmail = adminUser?.email ? String(adminUser.email).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;

    const isAuthorized =
      (createdByUserVal && auth.userId === createdByUserVal) ||
      (adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Not authorized to update this partner" },
        { status: 403 }
      );
    }

    if (status !== undefined && status !== null) {
      const s = String(status).toLowerCase();
      if (!["pending", "approved", "rejected"].includes(s)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      partner.status = s as any;
    }

    if (email && String(email).trim().length > 0) {
      const normEmail = String(email).toLowerCase().trim();
      const conflict = await DeliveryPartner.findOne({
        email: normEmail,
        createdByUser: partner.createdByUser,
        _id: { $ne: partner._id },
      }).lean();

      if (conflict) {
        return NextResponse.json(
          { error: "Another partner with this email already exists for this shop." },
          { status: 409 }
        );
      }

      partner.email = normEmail;
    }

    if (name !== undefined) partner.name = String(name).trim();
    if (phone !== undefined) partner.phone = phone || null;

    await partner.save();

    const normalized = {
      _id: partner._id ? String(partner._id) : null,
      name: partner.name,
      email: partner.email ?? null,
      phone: partner.phone ?? null,
      avatar: (partner as any).avatar ?? null,
      status: partner.status ?? "pending",
      createdByUser: partner.createdByUser ? partner.createdByUser.toString() : null,
      adminEmail: partner.adminEmail ?? null,
      createdAt: partner.createdAt ? new Date(partner.createdAt).toISOString() : null,
      notifiedAt: partner.notifiedAt ? new Date(partner.notifiedAt).toISOString() : null,
      metadata: (partner as any).metadata ?? {},
    };

    return NextResponse.json({ message: "Partner updated", partner: normalized }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/delivery/update error:", err);
    return NextResponse.json(
      { error: "Failed to update partner", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}