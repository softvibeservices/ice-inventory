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

    // Remove userId from updates — never let client override it
    delete updates.userId;

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
      await createLog({
        ...actor,
        action: ActivityAction.CUSTOMER_EDITED,
        metadata: {
          customerId:   updated._id.toString(),
          customerName: updated.name,
          shopName:     updated.shopName,
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