// src\app\api\manager\route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Manager from "@/models/Manager";
import bcrypt from "bcryptjs";

// CREATE MANAGER
export async function POST(req: Request) {
  try {
    const { adminId, name, email, contact, password } = await req.json();

    if (!adminId || !name || !email || !contact || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    await connectDB();

    const exists = await Manager.findOne({ adminId, email });
    if (exists) {
      return NextResponse.json({ error: "Manager already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const manager = await Manager.create({
      adminId,
      name,
      email,
      contact,
      password: hashed,
    });

    return NextResponse.json(manager, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create manager" }, { status: 500 });
  }
}

// GET MANAGER LIST
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "adminId required" }, { status: 400 });
    }

    await connectDB();
    const managers = await Manager.find({ adminId }).select("-password");

    return NextResponse.json(managers);
  } catch {
    return NextResponse.json({ error: "Failed to load managers" }, { status: 500 });
  }
}

// UPDATE MANAGER
export async function PUT(req: Request) {
  try {
    const { id, adminId, name, email, contact } = await req.json();

    if (!id || !adminId) {
      return NextResponse.json({ error: "id & adminId required" }, { status: 400 });
    }

    await connectDB();

    const updated = await Manager.findOneAndUpdate(
      { _id: id, adminId },
      { name, email, contact },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update manager" }, { status: 500 });
  }
}

// DELETE MANAGER
export async function DELETE(req: Request) {
  try {
    const { id, adminId } = await req.json();

    if (!id || !adminId) {
      return NextResponse.json({ error: "id & adminId required" }, { status: 400 });
    }

    await connectDB();

    const deleted = await Manager.findOneAndDelete({ _id: id, adminId });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
