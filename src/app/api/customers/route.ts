// src/app/api/customers/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { verifyUserRequest } from "@/lib/userAuth";
import { checkCustomerLimit } from "@/lib/subscriptionGuard";

// ── Activity Log ──────────────────────────────────────────────────────────────
import { createLog, getManagerActor } from "@/lib/createLog";
import { ActivityAction } from "@/models/ActivityLog";
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const { name, contacts, shopName, shopAddress, area } = body;

    if (!name || !contacts?.length || !shopName || !shopAddress || !area) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ─── PHASE 3: Customer limit guard ────────────────────────────────────────
    // Count existing customers for this user before allowing creation.
    const currentCount = await Customer.countDocuments({
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    const customerCheck = await checkCustomerLimit(auth.userId, currentCount);
    if (!customerCheck.allowed) {
      return NextResponse.json(
        {
          error:
            customerCheck.limit === 0
              ? "Your subscription has expired. Please renew your plan to add customers."
              : `You have reached your customer limit (${customerCheck.used}/${customerCheck.limit}). Upgrade your plan to add more customers.`,
          upgradeRequired: true,
          used: customerCheck.used,
          limit: customerCheck.limit,
        },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Always use auth.userId — never trust userId from body
    const customer = await Customer.create({
      ...body,
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add customer" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const customers = await Customer.find({
      userId: new mongoose.Types.ObjectId(auth.userId),
    }).sort({ createdAt: -1 });

    return NextResponse.json(customers);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    // Remove server-managed fields — never let the client override these
    delete updates.userId;
    delete updates.totalSales; // totalSales is read-only; it is managed by the order/billing system

    // ── Fetch old document BEFORE updating (needed to diff changes) ─────────
    const oldDoc = await Customer.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(auth.userId),
    }).lean();

    const updated = await Customer.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(auth.userId) },
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Customer not found or not authorized" },
        { status: 404 }
      );
    }

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      // ── Build changedFields diff ─────────────────────────────────────────
      const TRACKED_FIELDS: Record<string, string> = {
        name:        "Customer Name",
        shopName:    "Shop Name",
        shopAddress: "Shop Address",
        area:        "Area",
        remarks:     "Remarks",
        credit:      "Credit",
        debit:       "Debit",
        // totalSales is intentionally excluded — it is read-only and managed
        // by the order/billing system, not editable by admin or manager.
      };

      const changedFields: Record<string, { before: unknown; after: unknown }> = {};

      if (oldDoc) {
        for (const [field, label] of Object.entries(TRACKED_FIELDS)) {
          const before = (oldDoc as Record<string, unknown>)[field];
          const after  = (updated as unknown as Record<string, unknown>)[field];

          // Stringify for stable comparison (handles number vs string edge cases)
          if (String(before ?? "") !== String(after ?? "")) {
            changedFields[label] = { before: before ?? "", after: after ?? "" };
          }
        }

        // Track contacts array separately
        const oldContacts = ((oldDoc as Record<string, unknown>).contacts as string[]) ?? [];
        const newContacts = (updated.contacts as string[]) ?? [];
        if (JSON.stringify(oldContacts) !== JSON.stringify(newContacts)) {
          changedFields["Contacts"] = {
            before: oldContacts.join(", ") || "—",
            after:  newContacts.join(", ")  || "—",
          };
        }

        // ── Track GPS location ──────────────────────────────────────────────
        // Only log a GPS change when BOTH lat and lng are valid finite numbers.
        // If either side has no real coordinates (null / undefined / NaN),
        // treat it as "no location" so we don't produce "undefined, undefined".
        const oldLoc = (oldDoc as Record<string, unknown>).location as
          | { latitude?: number; longitude?: number }
          | null
          | undefined;
        const newLoc = updated.location as
          | { latitude?: number; longitude?: number }
          | null
          | undefined;

        const isValidCoord = (
          loc: { latitude?: number; longitude?: number } | null | undefined
        ): loc is { latitude: number; longitude: number } =>
          loc != null &&
          typeof loc.latitude  === "number" && isFinite(loc.latitude) &&
          typeof loc.longitude === "number" && isFinite(loc.longitude);

        const oldGPS = isValidCoord(oldLoc)
          ? `${oldLoc.latitude}, ${oldLoc.longitude}`
          : "—";
        const newGPS = isValidCoord(newLoc)
          ? `${newLoc.latitude}, ${newLoc.longitude}`
          : "—";

        // Only record the diff if the GPS string actually changed
        if (oldGPS !== newGPS) {
          changedFields["GPS Location"] = { before: oldGPS, after: newGPS };
        }
        // ───────────────────────────────────────────────────────────────────
      }

      await createLog({
        ...actor,
        action: ActivityAction.CUSTOMER_EDITED,
        metadata: {
          customerId:   updated._id.toString(),
          customerName: updated.name,
          shopName:     updated.shopName,
          // Only include changedFields if we actually found differences
          ...(Object.keys(changedFields).length > 0 && { changedFields }),
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    const deleted = await Customer.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Customer not found or not authorized" },
        { status: 404 }
      );
    }

    // ── Activity Log ─────────────────────────────────────────────────────────
    const actor = await getManagerActor(auth);
    if (actor) {
      await createLog({
        ...actor,
        action: ActivityAction.CUSTOMER_DELETED,
        metadata: {
          customerId:   deleted._id.toString(),
          customerName: deleted.name,
          shopName:     deleted.shopName,
        },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}