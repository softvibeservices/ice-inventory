// src\app\api\manager\route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Manager from "@/models/Manager";
import bcrypt from "bcryptjs";

// CREATE MANAGER with OTP verification
export async function POST(req: Request) {
  try {
    const { adminId, name, email, contact, password, otp } = await req.json();

    if (!adminId || !name || !email || !contact || !password || !otp) {
      return NextResponse.json({ 
        error: "All fields including OTP are required" 
      }, { status: 400 });
    }

    await connectDB();

    // Find the pending manager entry with OTP
    const pendingManager = await Manager.findOne({ 
      adminId, 
      email, 
      isPending: true 
    });

    if (!pendingManager) {
      return NextResponse.json({ 
        error: "No pending verification found. Please request OTP again." 
      }, { status: 404 });
    }

    // Check OTP expiry
    if (pendingManager.otpExpires && pendingManager.otpExpires < new Date()) {
      // Delete expired pending entry
      await Manager.findByIdAndDelete(pendingManager._id);
      return NextResponse.json({ 
        error: "OTP has expired. Please request a new one." 
      }, { status: 400 });
    }

    // Verify OTP
    if (pendingManager.otp !== String(otp).trim()) {
      return NextResponse.json({ 
        error: "Invalid OTP. Please check and try again." 
      }, { status: 400 });
    }

    // Check if verified manager already exists (non-pending)
    const existingManager = await Manager.findOne({ 
      adminId, 
      email,
      isPending: { $ne: true }
    });

    if (existingManager) {
      // Delete the pending entry since verified manager exists
      await Manager.findByIdAndDelete(pendingManager._id);
      return NextResponse.json({ 
        error: "Manager already exists" 
      }, { status: 409 });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Update the pending entry to create actual manager
    const manager = await Manager.findByIdAndUpdate(
      pendingManager._id,
      {
        name,
        contact,
        password: hashed,
        isPending: false,
        otp: null,
        otpExpires: null,
      },
      { new: true, select: '-password' }
    );

    return NextResponse.json(manager, { status: 201 });
  } catch (e: any) {
    console.error("Error creating manager:", e);
    return NextResponse.json({ 
      error: "Failed to create manager" 
    }, { status: 500 });
  }
}

// GET MANAGER LIST - Only return non-pending managers
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json({ error: "adminId required" }, { status: 400 });
    }

    await connectDB();
    
    // Only fetch verified managers (isPending is false or doesn't exist)
    const managers = await Manager.find({ 
      adminId,
      $or: [
        { isPending: false },
        { isPending: { $exists: false } }
      ]
    }).select("-password");

    return NextResponse.json(managers);
  } catch (e: any) {
    console.error("Error fetching managers:", e);
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
      { _id: id, adminId, isPending: { $ne: true } },
      { name, email, contact },
      { new: true, select: '-password' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("Error updating manager:", e);
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

    const deleted = await Manager.findOneAndDelete({ 
      _id: id, 
      adminId,
      isPending: { $ne: true }
    });

    if (!deleted) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error deleting manager:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}