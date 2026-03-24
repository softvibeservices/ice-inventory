// src/app/api/manager/devices/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Device from "@/models/Device";
import User from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

// ─────────────────────────────────────────────
//  GET — List devices for a specific manager
//  Query: ?managerId=<managerId>
// ─────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get("managerId");

  if (!managerId || !mongoose.Types.ObjectId.isValid(managerId)) {
    return NextResponse.json({ error: "Valid managerId is required" }, { status: 400 });
  }

  try {
    await connectDB();

    // Verify the manager belongs to this admin
    const manager = await User.findOne({
      _id: managerId,
      adminId: new mongoose.Types.ObjectId(auth.userId),
      role: "manager",
      isPending: { $ne: true },
    }).select("_id name");

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Devices are stored under the manager's own _id
    const devices = await Device.find({ userId: managerId }).sort({ lastSeen: -1 });

    const result = devices.map((d) => ({
      _id: d._id,
      deviceId: d.deviceId,
      label: d.label,
      browser: d.browser,
      platform: d.platform,
      ip: d.ip,
      status: d.status,
      blockedUntil: d.blockedUntil,
      lastSeen: d.lastSeen,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ devices: result });
  } catch (e: any) {
    console.error("[manager/devices GET]", e);
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
//  PATCH — Ban / Unban / Remove a manager's device
//  body: { managerId, deviceId, action: "ban" | "unban" | "remove" }
//
//  Uses per-device revokedAt (NOT global tokenVersion bump) so only
//  that specific device session is terminated, not all manager sessions.
// ─────────────────────────────────────────────
export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const { managerId, deviceId, action } = await req.json();

    if (!managerId || !deviceId || !action) {
      return NextResponse.json(
        { error: "managerId, deviceId and action are required" },
        { status: 400 }
      );
    }

    if (!["ban", "unban", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: ban | unban | remove" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(managerId)) {
      return NextResponse.json({ error: "Invalid managerId" }, { status: 400 });
    }

    await connectDB();

    // Confirm the manager belongs to this admin
    const manager = await User.findOne({
      _id: managerId,
      adminId: new mongoose.Types.ObjectId(auth.userId),
      role: "manager",
      isPending: { $ne: true },
    }).select("_id");

    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Find the device (owned by the manager's own _id)
    const device = await Device.findOne({ userId: managerId, deviceId });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (action === "ban") {
      // Ban device + stamp revokedAt so its JWT is rejected immediately
      await Device.findByIdAndUpdate(device._id, {
        status: "banned",
        blockedUntil: null,
        revokedAt: new Date(),
      });
      return NextResponse.json({
        success: true,
        message: "Device banned. That session has been terminated.",
      });
    }

    if (action === "unban") {
      await Device.findByIdAndUpdate(device._id, {
        status: "active",
        blockedUntil: null,
        revokedAt: null,
      });
      return NextResponse.json({
        success: true,
        message: "Device unbanned. Manager can log in from this device again.",
      });
    }

    if (action === "remove") {
      // Stamp revokedAt first to reject in-flight requests, then delete
      await Device.findByIdAndUpdate(device._id, { revokedAt: new Date() });
      await Device.findByIdAndDelete(device._id);
      return NextResponse.json({
        success: true,
        message: "Device session removed. Manager has been logged out from that device.",
      });
    }
  } catch (e: any) {
    console.error("[manager/devices PATCH]", e);
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 });
  }
}