// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    await connectDB();

    // Find user (admin or manager)
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if verified
    if (!user.isVerified) {
      return NextResponse.json({ error: "User not verified" }, { status: 401 });
    }

    // Check if pending
    if (user.isPending) {
      return NextResponse.json({ error: "Account setup incomplete" }, { status: 401 });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Prepare response based on role
    let userObj: any = {
      _id: user.role === "manager" && user.adminId ? user.adminId.toString() : user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Add managerId if manager
    if (user.role === "manager") {
      userObj.managerId = user._id.toString();
    }

    return NextResponse.json({
      message: "Login successful",
      user: userObj,
    });

  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}