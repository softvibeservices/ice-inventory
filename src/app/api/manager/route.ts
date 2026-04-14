// src/app/api/manager/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";
import bcrypt from "bcryptjs";
import { verifyUserRequest } from "@/lib/userAuth";
import {
  checkManagerLimit,
  checkFeatureFlag,
} from "@/lib/subscriptionGuard";

// ─────────────────────────────────────────────
//  POST — Create manager (OTP verified)
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create managers" },
      { status: 403 }
    );
  }

  try {
    const { name, email, contact, password, otp } = await req.json();

    if (!name || !email || !contact || !password || !otp) {
      return NextResponse.json(
        { error: "All fields including OTP are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const adminObjId = new mongoose.Types.ObjectId(auth.userId);

    // ─── PHASE 3: Manager seat limit + feature flag guard ────────────────────
    // Launch and free_trial plans have 0 manager seats — check the feature flag
    // first so we can give a clear "upgrade required" message before doing any
    // OTP validation work.

    // Step 1: Check if the plan allows any manager seats at all
    const featureCheck = await checkFeatureFlag(auth.userId, "hasDeliveryModule");
    // Note: managers are available on Scale+ which also has hasDeliveryModule.
    // But Launch plan has 0 managers even without delivery. We check the manager
    // count directly — checkManagerLimit handles the 0-seat case correctly.

    // Step 2: Count current active + pending managers
    const currentManagerCount = await User.countDocuments({
      adminId: adminObjId,
      role: "manager",
      $or: [{ isPending: false }, { isPending: { $exists: false } }],
    });

    // Also count pending managers awaiting OTP verification
    const pendingCount = await User.countDocuments({
      adminId: adminObjId,
      role: "manager",
      isPending: true,
    });

    const totalManagerCount = currentManagerCount + pendingCount;

    const managerCheck = await checkManagerLimit(auth.userId, totalManagerCount);
    if (!managerCheck.allowed) {
      return NextResponse.json(
        {
          error:
            managerCheck.limit === 0
              ? "Your current plan does not include manager seats. Upgrade to Scale or Business to add managers."
              : `You have reached your manager seat limit (${managerCheck.used}/${managerCheck.limit}). Upgrade your plan or purchase a Manager Seat add-on.`,
          upgradeRequired: true,
          used: managerCheck.used,
          limit: managerCheck.limit,
        },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const pendingManager = await User.findOne({
      adminId: adminObjId,
      email,
      role: "manager",
      isPending: true,
    });

    if (!pendingManager) {
      return NextResponse.json(
        { error: "No pending verification found. Please request OTP again." },
        { status: 404 }
      );
    }

    if (pendingManager.otpExpires && pendingManager.otpExpires < new Date()) {
      await User.findByIdAndDelete(pendingManager._id);
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (pendingManager.otp !== String(otp).trim()) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    const existingManager = await User.findOne({
      adminId: adminObjId,
      email,
      role: "manager",
      isPending: { $ne: true },
    });

    if (existingManager) {
      await User.findByIdAndDelete(pendingManager._id);
      return NextResponse.json(
        { error: "Manager already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const manager = await User.findByIdAndUpdate(
      pendingManager._id,
      {
        name,
        contact,
        password: hashed,
        isVerified: true,
        isPending: false,
        otp: null,
        otpExpires: null,
        tokenVersion: 0,
      },
      { new: true, select: "-password" }
    );

    return NextResponse.json(manager, { status: 201 });
  } catch (e: any) {
    console.error("Error creating manager:", e);
    return NextResponse.json(
      { error: "Failed to create manager" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  GET — List managers
// ─────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can view managers" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const managers = await User.find({
      adminId: new mongoose.Types.ObjectId(auth.userId),
      role: "manager",
      $or: [{ isPending: false }, { isPending: { $exists: false } }],
    }).select("-password");

    return NextResponse.json(managers);
  } catch (e: any) {
    console.error("Error fetching managers:", e);
    return NextResponse.json(
      { error: "Failed to load managers" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  PUT — Update manager info
// ─────────────────────────────────────────────
export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can update managers" },
      { status: 403 }
    );
  }

  try {
    const { id, name, email, contact } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Manager id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await User.findOneAndUpdate(
      {
        _id: id,
        adminId: new mongoose.Types.ObjectId(auth.userId),
        role: "manager",
        isPending: { $ne: true },
      },
      { name, email, contact },
      { new: true, select: "-password" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("Error updating manager:", e);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  PATCH — Block / Unblock / Ban a manager
//  body: { id: string, action: "block" | "unblock" | "ban" }
//  "block" and "ban" both: increment tokenVersion → force-logout all sessions
//  "unblock": restore to approved
// ─────────────────────────────────────────────
export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can manage managers" },
      { status: 403 }
    );
  }

  try {
    const { id, action } = await req.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: "Manager id and action are required" },
        { status: 400 }
      );
    }

    if (!["block", "unblock", "ban"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: block | unblock | ban" },
        { status: 400 }
      );
    }

    await connectDB();

    const manager = await User.findOne({
      _id: id,
      adminId: new mongoose.Types.ObjectId(auth.userId),
      role: "manager",
      isPending: { $ne: true },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    if (action === "block" || action === "ban") {
      // Increment tokenVersion → invalidates ALL existing JWTs for this manager
      const updated = await User.findByIdAndUpdate(
        manager._id,
        {
          status: "blocked",
          $inc: { tokenVersion: 1 },
        },
        { new: true, select: "-password" }
      );
      return NextResponse.json({
        success: true,
        message: `Manager ${action === "ban" ? "banned" : "blocked"} and all sessions invalidated.`,
        manager: updated,
      });
    }

    if (action === "unblock") {
      const updated = await User.findByIdAndUpdate(
        manager._id,
        { status: "approved" },
        { new: true, select: "-password" }
      );
      return NextResponse.json({
        success: true,
        message: "Manager unblocked successfully.",
        manager: updated,
      });
    }
  } catch (e: any) {
    console.error("Error updating manager status:", e);
    return NextResponse.json(
      { error: "Failed to update manager status" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  DELETE — Delete manager + wipe their devices
// ─────────────────────────────────────────────
export async function DELETE(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can delete managers" },
      { status: 403 }
    );
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Manager id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const deleted = await User.findOneAndDelete({
      _id: id,
      adminId: new mongoose.Types.ObjectId(auth.userId),
      role: "manager",
      isPending: { $ne: true },
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }

    // Clean up all device records for the deleted manager
    await Device.deleteMany({ userId: deleted._id });

    return NextResponse.json({
      success: true,
      message: "Manager and all associated sessions deleted.",
    });
  } catch (e: any) {
    console.error("Error deleting manager:", e);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}