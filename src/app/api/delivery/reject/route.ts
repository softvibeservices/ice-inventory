// src/app/api/delivery/reject/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId, adminEmail } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    if (!userId && !adminEmail) return NextResponse.json({ error: "userId or adminEmail required" }, { status: 400 });

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const okByUser = userId && String(partner.createdByUser) === String(userId);
    const okByEmail = adminEmail && String(partner.adminEmail)?.toLowerCase() === String(adminEmail)?.toLowerCase();

    if (!okByUser && !okByEmail) {
      return NextResponse.json({ error: "Not authorized to reject this partner" }, { status: 403 });
    }

    partner.status = "rejected";
    partner.notifiedAt = new Date();
    await partner.save();

    // notify partner
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
