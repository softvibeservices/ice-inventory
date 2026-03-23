// src/app/api/user-settings/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";
import { verifyUserRequest } from "@/lib/userAuth";

// GET USER SETTINGS
export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    let settings = await UserSettings.findOne({ userId: userObjectId });

    if (!settings) {
      settings = await UserSettings.create({
        userId: userObjectId,
        categories: ["Cups", "Family Pack", "Cone", "Candybar", "Tub"],
        units: ["ml", "L", "gm", "kg", "piece", "box"],
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/user-settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// UPDATE USER SETTINGS (PUT)
export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { categories, units } = body;

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    if (!units || !Array.isArray(units)) {
      return NextResponse.json(
        { error: "Units must be an array" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await UserSettings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(auth.userId) },
      { categories, units },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/user-settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// POST — SendBeacon support (called on page unload, can't use PUT)
export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { categories, units } = body;

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    if (!units || !Array.isArray(units)) {
      return NextResponse.json(
        { error: "Units must be an array" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await UserSettings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(auth.userId) },
      { categories, units },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/user-settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}