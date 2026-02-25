// src/app/api/delivery/update/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      partnerId,
      name,
      email,
      phone,
      status,
      userId,
      adminId,
      adminEmail: adminEmailRaw,
    } = body ?? {};

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    if (!userId && !adminId && !adminEmailRaw && !process.env.NEXT_PUBLIC_ADMIN_EMAIL && !process.env.NEXT_PUBLIC_ADMIN_ID) {
      return NextResponse.json({ error: "userId or adminId or adminEmail required for authorization" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const providedAdminEmail = adminEmailRaw ? String(adminEmailRaw).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;

    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase() : null;
    const envAdminId = process.env.NEXT_PUBLIC_ADMIN_ID ? String(process.env.NEXT_PUBLIC_ADMIN_ID) : null;

    // createdByUser is now ObjectId — use toString() for comparison
    const createdByUserVal = partner.createdByUser ? partner.createdByUser.toString() : null;

    const okByOwner = userId && createdByUserVal && String(userId) === createdByUserVal;
    const okByAdminIdMatchesOwner = adminId && createdByUserVal && String(adminId) === createdByUserVal;
    const okByAdminEmail = providedAdminEmail && partnerAdminEmail && providedAdminEmail === partnerAdminEmail;
    const okByEnvAdminEmail = envAdminEmail && (providedAdminEmail === envAdminEmail || partnerAdminEmail === envAdminEmail);
    const okByEnvAdminId = envAdminId && adminId && String(adminId) === String(envAdminId);
    const okByAdminIdGlobal = envAdminId && adminId && String(adminId) === String(envAdminId);

    if (!okByOwner && !okByAdminIdMatchesOwner && !okByAdminEmail && !okByEnvAdminEmail && !okByEnvAdminId && !okByAdminIdGlobal) {
      return NextResponse.json({ error: "Not authorized to update this partner" }, { status: 403 });
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

    if (body.adminEmail !== undefined) {
      const canSetAdminEmail = okByAdminEmail || okByEnvAdminEmail || okByEnvAdminId || okByAdminIdGlobal || okByAdminIdMatchesOwner;
      if (canSetAdminEmail) {
        partner.adminEmail = body.adminEmail ? String(body.adminEmail).toLowerCase() : null;
      } else {
        return NextResponse.json({ error: "Not authorized to update adminEmail" }, { status: 403 });
      }
    }

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
    return NextResponse.json({ error: "Failed to update partner", details: err?.message ?? String(err) }, { status: 500 });
  }
}
