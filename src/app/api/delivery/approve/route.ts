// src/app/api/delivery/approve/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";
import User from "@/models/User";

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId, adminEmail } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    if (!userId && !adminEmail) return NextResponse.json({ error: "userId or adminEmail required" }, { status: 400 });

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    // Authorization: allow if createdByUser matches userId OR adminEmail matches
    const okByUser = userId && String(partner.createdByUser) === String(userId);
    const okByEmail = adminEmail && String(partner.adminEmail)?.toLowerCase() === String(adminEmail)?.toLowerCase();

    // Additional fallback: if createdByUser is null but adminEmail equals provided adminEmail, allow
    if (!okByUser && !okByEmail) {
      return NextResponse.json({ error: "Not authorized to approve this partner" }, { status: 403 });
    }

    partner.status = "approved";
    partner.notifiedAt = new Date();
    await partner.save();

    // send email to partner about approval (best effort)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Approved",
        html: `<p>Hello ${partner.name},</p>
               <p>Your registration as a delivery partner has been <strong>approved</strong>. You can now login using OTP.</p>
               <p>— IceCream Inventory</p>`,
      });
    } catch (e) {
      console.error("[delivery/approve] partner notification failed", e);
    }

    return NextResponse.json({ message: "Partner approved", partner });
  } catch (err: any) {
    console.error("PATCH /api/delivery/approve error:", err);
    return NextResponse.json({ error: "Failed to approve partner" }, { status: 500 });
  }
}
