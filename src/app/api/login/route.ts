// icecream-inventory\src\app\api\login\route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Manager from "@/models/Manager";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    await connectDB();

    // ⬇ 1️⃣ CHECK USER SCHEMA (ADMIN)
    const user = await User.findOne({ email });

    if (user) {
      if (!user.isVerified)
        return NextResponse.json({ error: "User not verified" }, { status: 401 });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

      const userObj = {
        _id: user._id.toString(), // admin uses own id
        email: user.email,
        name: user.name,
        role: user.role,
      };

      return NextResponse.json({
        message: "Login successful",
        user: userObj,
      });
    }

    // ⬇ 2️⃣ CHECK MANAGER SCHEMA
    const manager = await Manager.findOne({ email });

    if (!manager)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Return manager as admin id + store managerId separately
    const managerObj = {
      _id: manager.adminId.toString(),    // 👈 IMPORTANT: replace id with admin id
      managerId: manager._id.toString(),  // 👈 store manager id separately
      email: manager.email,
      name: manager.name,
      role: "manager",
    };

    return NextResponse.json({
      message: "Login successful",
      user: managerObj,
    });

  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
