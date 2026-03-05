// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";

// CREATE CUSTOMER
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, contacts, shopName, shopAddress, area, userId } = body;

    if (!name || !contacts?.length || !shopName || !shopAddress || !area || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const customer = await Customer.create({
      ...body,
      userId: new mongoose.Types.ObjectId(userId),
      // ✅ REMOVED hardcoded overrides — now uses values from body (form)
    });

    return NextResponse.json(customer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}

// GET CUSTOMERS
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const customers = await Customer.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

// UPDATE CUSTOMER
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, userId, ...updates } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Customer ID and User ID required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const updated = await Customer.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Customer not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE CUSTOMER
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { id, userId } = await req.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Customer ID and User ID required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const deleted = await Customer.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Customer not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
