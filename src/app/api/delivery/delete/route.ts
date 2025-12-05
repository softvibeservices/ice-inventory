// src/app/api/delivery/delete/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

/**
 * DELETE /api/delivery/delete
 * body: { partnerId, userId?, adminEmail?, adminId? }
 *
 * Authorization:
 *   - owner: userId must match partner.createdByUser
 *   - adminEmail: must match partner.adminEmail (case-insensitive)
 *   - adminId: must equal process.env.ADMIN_ID (recommended)
 *
 * Returns 200 + partnerId on success.
 */

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId, adminEmail: adminEmailRaw, adminId: adminIdRaw } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    if (!userId && !adminEmailRaw && !adminIdRaw) {
      return NextResponse.json({ error: "userId or adminEmail or adminId required for authorization" }, { status: 400 });
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(String(partnerId));
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const okByUser = userId && String(partner.createdByUser) === String(userId);
    const okByEmail = adminEmailRaw && partner.adminEmail && String(partner.adminEmail).toLowerCase() === String(adminEmailRaw).toLowerCase();
    const serverAdminId = process.env.ADMIN_ID ? String(process.env.ADMIN_ID) : null;
    const okByAdminId = adminIdRaw && serverAdminId && String(adminIdRaw) === serverAdminId;

    if (!okByUser && !okByEmail && !okByAdminId) {
      return NextResponse.json({ error: "Not authorized to delete this partner" }, { status: 403 });
    }

    await DeliveryPartner.deleteOne({ _id: partner._id });

    return NextResponse.json({ message: "Partner deleted", partnerId: String(partner._id) }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/delivery/delete error:", err);
    return NextResponse.json({ error: "Failed to delete partner", details: err?.message ?? String(err) }, { status: 500 });
  }
}
