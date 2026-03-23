// src/app/api/delivery/delete/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyUserRequest } from "@/lib/userAuth";

export async function DELETE(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId } = body ?? {};

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const createdByUserVal = partner.createdByUser
      ? partner.createdByUser.toString()
      : null;

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
        { error: "Not authorized to delete this partner" },
        { status: 403 }
      );
    }

    await DeliveryPartner.deleteOne({ _id: partner._id });

    return NextResponse.json(
      { message: "Partner deleted", partnerId: String(partner._id) },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DELETE /api/delivery/delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete partner", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}