// src/app/api/delivery/update/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

/**
 * PATCH /api/delivery/update
 * Body: { partnerId, name?, email?, phone?, status?, userId?, adminId?, adminEmail? }
 *
 * Authorization: allow when ANY of:
 *  - userId === partner.createdByUser (shop owner)
 *  - adminId === partner.createdByUser (admin operating as owner)
 *  - adminEmail === partner.adminEmail (case-insensitive)
 *  - adminId === process.env.NEXT_PUBLIC_ADMIN_ID (global admin override)
 *  - adminEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL (global admin override)
 *
 * If email changes ensure uniqueness for same createdByUser (or null).
 */
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

    // normalize adminEmail comparisons
    const providedAdminEmail = adminEmailRaw ? String(adminEmailRaw).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;

    // environment-level admin overrides
    const envAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase() : null;
    const envAdminId = process.env.NEXT_PUBLIC_ADMIN_ID ? String(process.env.NEXT_PUBLIC_ADMIN_ID) : null;

    // Normalize createdByUser (stored as string or null)
    const createdByUserVal = partner.createdByUser ? String(partner.createdByUser) : null;

    // Authorization checks
    const okByOwner = userId && createdByUserVal && String(userId) === String(createdByUserVal);
    const okByAdminIdMatchesOwner = adminId && createdByUserVal && String(adminId) === String(createdByUserVal);
    const okByAdminEmail = providedAdminEmail && partnerAdminEmail && providedAdminEmail === partnerAdminEmail;
    const okByEnvAdminEmail = envAdminEmail && (providedAdminEmail === envAdminEmail || partnerAdminEmail === envAdminEmail);
    const okByEnvAdminId = envAdminId && adminId && String(adminId) === String(envAdminId);
    // Also, allow when adminId equals envAdminId even when admin email not provided:
    const okByAdminIdGlobal = envAdminId && adminId && String(adminId) === String(envAdminId);

    if (!okByOwner && !okByAdminIdMatchesOwner && !okByAdminEmail && !okByEnvAdminEmail && !okByEnvAdminId && !okByAdminIdGlobal) {
      return NextResponse.json({ error: "Not authorized to update this partner" }, { status: 403 });
    }

    // Validate status when provided
    if (status !== undefined && status !== null) {
      const s = String(status).toLowerCase();
      if (!["pending", "approved", "rejected"].includes(s)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      partner.status = s as any;
    }

    // If email is changing, ensure uniqueness within the same shop (createdByUser)
    if (email && String(email).trim().length > 0) {
      const normEmail = String(email).toLowerCase().trim();
      // find conflicting partner with same email + same createdByUser but different _id
      const conflict = await DeliveryPartner.findOne({
        email: normEmail,
        createdByUser: createdByUserVal,
        _id: { $ne: partner._id },
      }).lean();

      if (conflict) {
        return NextResponse.json(
          { error: "Another partner with this email already exists for this shop. Use a different email or remove the existing partner first." },
          { status: 409 }
        );
      }

      partner.email = normEmail;
    }

    if (name !== undefined) partner.name = String(name).trim();
    if (phone !== undefined) partner.phone = phone || null;

    // allow admin to update adminEmail only when they are authorized by adminEmail or env admin
    if (body.adminEmail !== undefined) {
      // only allow setting if the requester qualifies as admin (okByAdminEmail or global env admin)
      const canSetAdminEmail = okByAdminEmail || okByEnvAdminEmail || okByEnvAdminId || okByAdminIdGlobal || okByAdminIdMatchesOwner;
      if (canSetAdminEmail) {
        partner.adminEmail = body.adminEmail ? String(body.adminEmail).toLowerCase() : null;
      } else {
        // silently ignore or return error — choose explicit error to be clear
        return NextResponse.json({ error: "Not authorized to update adminEmail" }, { status: 403 });
      }
    }

    // persist
    await partner.save();

    const normalized = {
      _id: partner._id ? String(partner._id) : null,
      name: partner.name,
      email: partner.email ?? null,
      phone: partner.phone ?? null,
      avatar: partner.avatar ?? null,
      status: partner.status ?? "pending",
      createdByUser: partner.createdByUser ?? null,
      adminEmail: partner.adminEmail ?? null,
      createdAt: partner.createdAt ? new Date(partner.createdAt).toISOString() : null,
      notifiedAt: partner.notifiedAt ? new Date(partner.notifiedAt).toISOString() : null,
      metadata: partner.metadata ?? {},
    };

    return NextResponse.json({ message: "Partner updated", partner: normalized }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /api/delivery/update error:", err);
    return NextResponse.json({ error: "Failed to update partner", details: err?.message ?? String(err) }, { status: 500 });
  }
}
