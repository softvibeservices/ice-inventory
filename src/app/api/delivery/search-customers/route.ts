// src/app/api/delivery/search-customers/route.ts
//
// GET /api/delivery/search-customers
//
// TWO MODES — determined by the presence of the `q` param:
//
// ── MODE 1: SEARCH (q is non-empty) ──────────────────────────────────────────
//   ?q=raju
//   Returns up to 10 customers matching name or shopName (existing behaviour).
//   Response: { customers: Customer[] }
//
// ── MODE 2: PAGINATED LIST (q is absent or empty) ────────────────────────────
//   ?page=1&limit=20        (defaults: page=1, limit=20, max limit=50)
//   Returns ALL manager-scoped customers sorted by name, with pagination meta.
//   Response: { customers: Customer[], total: number, page: number, hasMore: boolean }
//
// Backwards-compatible: existing callers that pass ?q= are completely unaffected.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import DeliveryPartner from "@/models/DeliveryPartner";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

// ─── Shared field projection ──────────────────────────────────────────────────
const CUSTOMER_FIELDS = "name shopName shopAddress contacts location" as const;

// ─── Helper: resolve manager ObjectId from delivery partner record ────────────
async function resolveManagerId(
  partnerId: string
): Promise<mongoose.Types.ObjectId | NextResponse> {
  const partner = (await DeliveryPartner.findById(partnerId)
    .select("createdByUser")
    .lean()) as { createdByUser?: mongoose.Types.ObjectId | string } | null;

  if (!partner || !partner.createdByUser) {
    return NextResponse.json(
      { error: "Unable to determine manager for this delivery partner" },
      { status: 400 }
    );
  }

  const userObjectId =
    partner.createdByUser instanceof mongoose.Types.ObjectId
      ? partner.createdByUser
      : mongoose.Types.ObjectId.isValid(String(partner.createdByUser))
      ? new mongoose.Types.ObjectId(String(partner.createdByUser))
      : null;

  if (!userObjectId) {
    return NextResponse.json({ error: "Invalid manager ID" }, { status: 400 });
  }

  return userObjectId;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  // 🔐 Auth
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { partnerId } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim().toLowerCase();

    await connectDB();

    // ── Resolve manager ID (needed by both modes) ─────────────────────────────
    const managerIdOrError = await resolveManagerId(partnerId);
    if (managerIdOrError instanceof NextResponse) return managerIdOrError;
    const userObjectId = managerIdOrError;

    // ── MODE 1: SEARCH ────────────────────────────────────────────────────────
    if (query.length > 0) {
      const customers = await Customer.find({
        userId: userObjectId,
        $or: [
          { name: { $regex: query, $options: "i" } },
          { shopName: { $regex: query, $options: "i" } },
        ],
      })
        .limit(10)
        .select(CUSTOMER_FIELDS)
        .lean();

      return NextResponse.json({ customers }, { status: 200 });
    }

    // ── MODE 2: PAGINATED LIST ────────────────────────────────────────────────
    // Parse and clamp pagination params.
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);

    // Clamp to safe ranges: page ≥ 1, limit 1–50.
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const skip = (page - 1) * limit;

    // Run count + fetch in parallel to minimise latency.
    const [customers, total] = await Promise.all([
      Customer.find({ userId: userObjectId })
        .sort({ name: 1 })            // alphabetical — best for "browse all" UX
        .skip(skip)
        .limit(limit)
        .select(CUSTOMER_FIELDS)
        .lean(),
      Customer.countDocuments({ userId: userObjectId }),
    ]);

    const hasMore = skip + customers.length < total;

    return NextResponse.json(
      {
        customers,
        total,
        page,
        hasMore,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/delivery/search-customers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}