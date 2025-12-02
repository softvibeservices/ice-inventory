// src/app/api/customers/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";

// CREATE CUSTOMER
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, contacts, shopName, shopAddress,  userId } = body;

    if (!name || !contacts?.length || !shopName || !shopAddress || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const customer = await Customer.create({
      ...body,
      credit: 0,
      debit: 0,
      totalSales: 0,
      remarks: "",
    });

    return NextResponse.json(customer, { status: 201 });
  } catch{
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

    const customers = await Customer.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(customers);
  } catch  {
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

    const updated = await Customer.findOneAndUpdate({ _id: id, userId }, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Customer not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch  {
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

    const deleted = await Customer.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return NextResponse.json({ error: "Customer not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch  {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
