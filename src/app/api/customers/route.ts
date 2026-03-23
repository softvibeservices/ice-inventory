// src/app/api/customers/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { verifyUserRequest } from "@/lib/userAuth";

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

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}