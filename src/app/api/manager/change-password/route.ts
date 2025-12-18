// src/app/api/manager/change-password/route.ts



import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Manager from "@/models/Manager";
import bcrypt from "bcryptjs";


export async function PUT(req: Request) {
    try {
      await connectDB();
  
      const { managerId, otp, password, adminId } = await req.json();
  
      if (!managerId || !otp || !password || !adminId) {
        return NextResponse.json(
          { error: "managerId, otp, password & adminId are required" },
          { status: 400 }
        );
      }
  
      const manager = await Manager.findById(managerId);
      if (!manager) {
        return NextResponse.json({ error: "Manager not found" }, { status: 404 });
      }
  
      if (!manager.otp || !manager.otpExpires) {
        return NextResponse.json(
          { error: "No OTP found, request OTP again" },
          { status: 400 }
        );
      }
  
      if (manager.otpExpires < new Date()) {
        return NextResponse.json({ error: "OTP expired" }, { status: 400 });
      }
  
      if (manager.otp !== String(otp).trim()) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
      }
  
      const hashed = await bcrypt.hash(password, 10);
  
      manager.password = hashed;
      manager.otp = null;
      manager.otpExpires = null;
  
      await manager.save();
  
      return NextResponse.json({ success: true, message: "Password updated" });
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message || "Failed to change password" },
        { status: 500 }
      );
    }
  }
  