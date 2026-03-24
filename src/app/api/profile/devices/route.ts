// src/app/api/profile/devices/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Device from "@/models/Device";
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

    // Devices are stored under the actual user._id (auth.userId for admin = their own _id)
    const devices = await Device.find({ userId: auth.userId }).sort({
      lastSeen: -1,
    });

    // Mark the current device in the response so the client can highlight it
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
//  PATCH — Ban (can unban) or Remove Session
//
//  Supported actions:
//    "ban"    — Marks device banned (reversible via "unban"). Auto-logs out that device.
//    "unban"  — Removes ban from device. Device becomes active again.
//    "remove" — Removes device record from DB entirely. Auto-logs out that device.
//
//  HOW LOGOUT WORKS (per-device, not global):
//    Instead of bumping the User.tokenVersion (which kills ALL sessions),
//    we store a `revokedAt` timestamp on the Device doc.
//    The verifyUserRequest middleware checks this field and rejects tokens
//    issued BEFORE that timestamp — only affecting that specific device.
//
//  NOTE: The current active device cannot be banned/removed (it would
//        immediately lock the admin out). A clear error is returned instead.
// ─────────────────────────────────────────────
export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const { deviceId, action } = await req.json();

    if (!deviceId || !action) {
      return NextResponse.json(
        { error: "deviceId and action are required" },
        { status: 400 }
      );
    }

    if (!["ban", "unban", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use: ban | unban | remove" },
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

    // ✅ Prevent the admin from banning/removing their own current device
    if (device.deviceId === auth.deviceId) {
      return NextResponse.json(
        {
          error:
            "You cannot ban or remove your current active device. Switch to another device first.",
        },
        { status: 400 }
      );
    }

    if (action === "ban") {
      // Ban the device — mark it banned AND stamp revokedAt so its JWT is rejected.
      // This does NOT touch User.tokenVersion, so other devices stay logged in.
      await Device.findByIdAndUpdate(device._id, {
        status: "banned",
        blockedUntil: null,
        revokedAt: new Date(), // ✅ per-device logout timestamp
      });
      return NextResponse.json({
        success: true,
        message: "Device banned. That device has been logged out automatically.",
      });
    }

    if (action === "unban") {
      // Restore the device — clear banned status and revocation.
      await Device.findByIdAndUpdate(device._id, {
        status: "active",
        blockedUntil: null,
        revokedAt: null, // ✅ clear revocation so they can log in again
      });
      return NextResponse.json({
        success: true,
        message: "Device unbanned. It can now be used to log in.",
      });
    }

    if (action === "remove") {
      // Remove device entirely — the device is logged out because
      // userAuth will find no device doc and the revokedAt check triggers.
      // We stamp revokedAt first so any in-flight request from that device
      // gets rejected, then delete the doc.
      await Device.findByIdAndUpdate(device._id, {
        revokedAt: new Date(),
      });
      // Small delay to let in-flight requests get rejected, then delete
      await Device.findByIdAndDelete(device._id);

      return NextResponse.json({
        success: true,
        message: "Device session removed. That device has been logged out.",
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