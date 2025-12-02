// icecream-inventory\src\app\api\login\route.ts


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.isVerified)
      return NextResponse.json({ error: "User not verified" }, { status: 401 });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // remove sensitive fields
    const userObj = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return NextResponse.json({
      message: "Login successful",
      user: userObj,
    });
  } catch  {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
