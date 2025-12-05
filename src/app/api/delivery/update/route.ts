// src/app/api/delivery/update/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import mongoose from "mongoose";

/**
 * PATCH /api/delivery/update
 * body: { partnerId, name?, email?, phone?, status?, userId?, adminEmail?, adminId? }
 *
 * Authorization:
 *   - owner: userId must match partner.createdByUser
 *   - adminEmail: must match partner.adminEmail (case-insensitive)
 *   - adminId: if provided must equal process.env.ADMIN_ID (recommended for admin actions)
 *
 * Behavior:
 *   - Validate partnerId
 *   - If email changed: check uniqueness per shop (createdByUser)
 *   - Save and return normalized partner
 */

function safeToLower(s?: any) {
  if (!s && s !== "") return undefined;
  return String(s).toLowerCase();
}

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
      adminEmail: adminEmailRaw,
      adminId: adminIdRaw,
    } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });

    // At least one form of authorization must be present
    if (!userId && !adminEmailRaw && !adminIdRaw) {
      return NextResponse.json({ error: "userId or adminEmail or adminId required for authorization" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    // Authorization checks
    const okByUser = userId && String(partner.createdByUser) === String(userId);
    const okByEmail =
      adminEmailRaw && partner.adminEmail && String(partner.adminEmail).toLowerCase() === String(adminEmailRaw).toLowerCase();
    const serverAdminId = process.env.ADMIN_ID ? String(process.env.ADMIN_ID) : null;
    const okByAdminId = adminIdRaw && serverAdminId && String(adminIdRaw) === serverAdminId;

    if (!okByUser && !okByEmail && !okByAdminId) {
      return NextResponse.json({ error: "Not authorized to update this partner" }, { status: 403 });
    }

    // Validate status if provided
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!["pending", "approved", "rejected"].includes(s)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      partner.status = s as any;
    }

    if (name !== undefined) partner.name = String(name).trim();

    // If email changed, ensure uniqueness for same shop (createdByUser)
    if (email !== undefined) {
      if (!String(email).includes("@")) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      const normEmail = String(email).toLowerCase();
      const shopOwner = partner.createdByUser ?? null;

      const conflict = await DeliveryPartner.findOne({
        email: normEmail,
        createdByUser: shopOwner,
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

    if (phone !== undefined) partner.phone = phone || null;

    // Allow updating adminEmail only by authorized admin (okByEmail OR okByAdminId)
    if (adminEmailRaw !== undefined && (okByEmail || okByAdminId)) {
      partner.adminEmail = safeToLower(adminEmailRaw) ?? null;
    }

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
