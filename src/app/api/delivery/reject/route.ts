// src/app/api/delivery/reject/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";
import User from "@/models/User";

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const adminUser = await User.findById(userId).select("email role");
    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (adminUser.role === "manager") {
      return NextResponse.json({ error: "Managers cannot reject delivery partners" }, { status: 403 });
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const adminEmail = adminUser.email ? String(adminUser.email).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;
    // createdByUser is now ObjectId — use toString() for comparison
    const partnerCreatedBy = partner.createdByUser ? partner.createdByUser.toString() : null;

    const isAuthorized =
      (userId && partnerCreatedBy && userId === partnerCreatedBy) ||
      (adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerCreatedBy && adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerAdminEmail && partnerCreatedBy && userId === partnerCreatedBy);

    if (!isAuthorized) {
      console.error("Authorization failed:", { userId, adminEmail, partnerCreatedBy, partnerAdminEmail });
      return NextResponse.json({ error: "Not authorized to reject this partner" }, { status: 403 });
    }

    partner.status = "rejected";
    partner.notifiedAt = new Date();

    if (!partner.adminEmail && adminEmail) {
      partner.adminEmail = adminEmail;
    }

    if (!partner.createdByUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
      partner.createdByUser = new mongoose.Types.ObjectId(userId) as any;
    }

    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Request — Rejected",
        html: `<p>Hello ${partner.name},</p>
               <p>We're sorry — your delivery partner request has been <strong>rejected</strong>. Contact the shop owner for details.</p>
               <p>— IceCream Inventory</p>`,
      });
    } catch (e) {
      console.error("[delivery/reject] partner notification failed", e);
    }

    return NextResponse.json({ message: "Partner rejected", partner });
  } catch (err: any) {
    console.error("PATCH /api/delivery/reject error:", err);
    return NextResponse.json({ error: "Failed to reject partner" }, { status: 500 });
  }
}
