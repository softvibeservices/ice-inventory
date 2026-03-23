// src/app/api/profile/devices/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Device from "@/models/Device";
import User from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

// ─────────────────────────────────────────────
//  GET — List all devices for the logged-in admin
// ─────────────────────────────────────────────
export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  // Only admins can manage their own sessions from profile page
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "Access denied." },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    // For admin: auth.userId = admin's own _id
    // Devices are stored under the actual user _id
    const devices = await Device.find({ userId: auth.userId }).sort({
      lastSeen: -1,
    });

    // Mark the current device in the response so client can highlight it
    const currentDeviceId = auth.deviceId;

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
      isCurrent: d.deviceId === currentDeviceId,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[profile/devices GET]", e);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
//  PATCH — Ban / Block-Until / Unblock own device
//  body: {
//    deviceId: string,
//    action: "ban" | "block" | "unblock" | "delete",
//    blockedUntil?: string  // ISO date string, required when action = "block"
//  }
//  NOTE: banning/blocking a device also increments tokenVersion
//        so the existing session on that device is force-logged-out.
// ─────────────────────────────────────────────
export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const { deviceId, action, blockedUntil } = await req.json();

    if (!deviceId || !action) {
      return NextResponse.json(
        { error: "deviceId and action are required" },
        { status: 400 }
      );
    }

    if (!["ban", "block", "unblock", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: ban | block | unblock | delete" },
        { status: 400 }
      );
    }

    await connectDB();

    const device = await Device.findOne({
      userId: auth.userId,
      deviceId,
    });

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // Prevent the admin from banning/blocking their own current device
    // (would immediately lock them out — they can delete it instead)
    if (
      device.deviceId === auth.deviceId &&
      (action === "ban" || action === "block")
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot ban or block your current active device. Use 'delete' to remove it.",
        },
        { status: 400 }
      );
    }

    if (action === "delete") {
      await Device.findByIdAndDelete(device._id);
      // ✅ Bump tokenVersion so any active session on this device is invalidated
      await User.findByIdAndUpdate(auth.userId, { $inc: { tokenVersion: 1 } });
      return NextResponse.json({
        success: true,
        message: "Device removed and session invalidated.",
      });
    }

    if (action === "ban") {
      await Device.findByIdAndUpdate(device._id, {
        status: "banned",
        blockedUntil: null,
      });
      // ✅ Bump tokenVersion so the session on that device is force-logged-out
      await User.findByIdAndUpdate(auth.userId, { $inc: { tokenVersion: 1 } });
      return NextResponse.json({
        success: true,
        message: "Device banned. All sessions on this device have been invalidated.",
      });
    }

    if (action === "block") {
      if (!blockedUntil) {
        return NextResponse.json(
          { error: "blockedUntil date is required for block action" },
          { status: 400 }
        );
      }
      const blockDate = new Date(blockedUntil);
      if (isNaN(blockDate.getTime()) || blockDate <= new Date()) {
        return NextResponse.json(
          { error: "blockedUntil must be a valid future date" },
          { status: 400 }
        );
      }
      await Device.findByIdAndUpdate(device._id, {
        status: "blocked",
        blockedUntil: blockDate,
      });
      // ✅ Bump tokenVersion so the session on that device is force-logged-out immediately
      await User.findByIdAndUpdate(auth.userId, { $inc: { tokenVersion: 1 } });
      return NextResponse.json({
        success: true,
        message: `Device blocked until ${blockDate.toLocaleDateString()}.`,
      });
    }

    if (action === "unblock") {
      await Device.findByIdAndUpdate(device._id, {
        status: "active",
        blockedUntil: null,
      });
      return NextResponse.json({
        success: true,
        message: "Device unblocked. It can be used to login again.",
      });
    }
  } catch (e: any) {
    console.error("[profile/devices PATCH]", e);
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    );
  }
}