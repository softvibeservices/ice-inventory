// src/app/api/delivery/register/route.ts


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";

function generateOtp(len = 6) {
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

/**
 * POST /api/delivery/register
 *
 * Behavior changes:
 *  - If partner with same email + createdByUser exists:
 *      - status === "pending"  => return 409 (already pending) (no new OTP / no re-notify)
 *      - status === "approved" => return 409 (already approved)
 *      - status === "rejected" => treat as re-request: set status to pending, generate OTP, notify admin+partner
 *  - If no partner exists -> create + notify
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, createdByUser, adminEmail: adminEmailFromClient } = body ?? {};

    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }

    await connectDB();

    // Determine adminEmail: priority -> explicit from client, then lookup from createdByUser
    let adminEmail: string | null = adminEmailFromClient ? String(adminEmailFromClient).toLowerCase() : null;
    if (!adminEmail && createdByUser) {
      try {
        const owner = await User.findById(String(createdByUser)).select("email");
        if (owner && owner.email) adminEmail = String(owner.email).toLowerCase();
      } catch (e) {
        console.warn("[delivery/register] owner lookup failed", e);
      }
    }

    // normalize partner email
    const partnerEmail = String(email).toLowerCase();

    // Normalize createdByUser value we will store (either string id or null)
    const createdByUserNormalized = createdByUser ? String(createdByUser) : null;

    // Find existing partner for the same shop (createdByUser) — exact match on createdByUser (including null)
    let partner = await DeliveryPartner.findOne({ email: partnerEmail, createdByUser: createdByUserNormalized });

    if (partner) {
      // If already pending -> do not re-create or re-send
      if (String(partner.status).toLowerCase() === "pending") {
        return NextResponse.json(
          { error: "A request from this delivery partner is already pending for this shop.", partnerId: partner._id },
          { status: 409 }
        );
      }

      // If already approved -> no request needed
      if (String(partner.status).toLowerCase() === "approved") {
        return NextResponse.json(
          { error: "This delivery partner is already approved for the shop.", partnerId: partner._id },
          { status: 409 }
        );
      }

      // If rejected -> allow re-request: update fields, set status -> pending, generate new OTP, notify admin & partner
      if (String(partner.status).toLowerCase() === "rejected") {
        partner.name = name;
        partner.phone = phone ?? partner.phone;
        partner.adminEmail = adminEmail ?? partner.adminEmail;
        partner.status = "pending";

        // generate OTP for new verification
        const otp = generateOtp();
        partner.otp = otp;
        partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await partner.save();

        // notify partner with OTP (best-effort)
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: partner.email,
            subject: "Delivery Partner Registration — Verification Code",
            text: `Your verification code is ${otp}. It will expire in 10 minutes. You will be able to login after the shop owner approves your request.`,
          });
        } catch (pErr) {
          console.error("[delivery/register] partner email failed (re-request):", pErr);
        }

        // notify admin if available
        if (adminEmail) {
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: adminEmail,
              subject: `New Delivery Partner Request — ${partner.name}`,
              html: `<p>Hello,</p>
                     <p>A delivery partner has re-requested access to your shop:</p>
                     <ul>
                       <li><strong>Name:</strong> ${partner.name}</li>
                       <li><strong>Email:</strong> ${partner.email}</li>
                       <li><strong>Phone:</strong> ${partner.phone ?? "-"}</li>
                     </ul>
                     <p>Approve or reject this request on your dashboard: <a href="${process.env.FRONTEND_URL || ""}/dashboard/profile">Go to Dashboard</a></p>
                     <p>— IceCream Inventory</p>`,
            });
            partner.notifiedAt = new Date();
            await partner.save();
          } catch (adminErr) {
            console.error("[delivery/register] admin notification failed (re-request)", adminErr);
          }
        }

        return NextResponse.json(
          { message: "Re-request submitted. Admin will be notified if configured.", partnerId: partner._id },
          { status: 200 }
        );
      }

      // Fallback: if partner exists but some unknown status — return conflict to be safe
      return NextResponse.json({ error: "Partner already exists for this shop.", partnerId: partner._id }, { status: 409 });
    }

    // No existing partner -> create new
    partner = new DeliveryPartner({
      name,
      email: partnerEmail,
      phone,
      createdByUser: createdByUserNormalized,
      adminEmail: adminEmail ?? null,
      status: "pending",
    });

    // generate OTP for partner verification (partner still cannot login until approved)
    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await partner.save();

    // send OTP to partner (best-effort)
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Registration — Verification Code",
        text: `Your verification code is ${otp}. It will expire in 10 minutes. You will be able to login after the shop owner approves your request.`,
      });
    } catch (pErr) {
      console.error("[delivery/register] partner email failed:", pErr);
    }

    // send notification to admin if adminEmail exists (best-effort)
    if (adminEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New Delivery Partner Request — ${partner.name}`,
          html: `<p>Hello,</p>
                 <p>A new delivery partner has requested access to your shop:</p>
                 <ul>
                   <li><strong>Name:</strong> ${partner.name}</li>
                   <li><strong>Email:</strong> ${partner.email}</li>
                   <li><strong>Phone:</strong> ${partner.phone ?? "-"}</li>
                 </ul>
                 <p>Approve or reject this request on your dashboard: <a href="${process.env.FRONTEND_URL || ""}/dashboard/profile">Go to Dashboard</a></p>
                 <p>— IceCream Inventory</p>`,
        });
        partner.notifiedAt = new Date();
        await partner.save();
      } catch (adminErr) {
        console.error("[delivery/register] admin notification failed", adminErr);
      }
    }

    return NextResponse.json(
      {
        message: "Request submitted. Admin will be notified if configured.",
        partnerId: partner._id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[delivery/register] error:", err);
    return NextResponse.json({ error: "Unable to register delivery partner at this time." }, { status: 500 });
  }
}
