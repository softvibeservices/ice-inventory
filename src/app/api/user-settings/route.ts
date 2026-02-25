// src/app/api/user-settings/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";

// GET USER SETTINGS
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(userId);

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
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// UPDATE USER SETTINGS (PUT)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, categories, units } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Categories must be an array" }, { status: 400 });
    }

    if (!units || !Array.isArray(units)) {
      return NextResponse.json({ error: "Units must be an array" }, { status: 400 });
    }

    await connectDB();

    const updated = await UserSettings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { categories, units },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/user-settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

// POST handler for SendBeacon support
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, categories, units } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: "Categories must be an array" }, { status: 400 });
    }

    if (!units || !Array.isArray(units)) {
      return NextResponse.json({ error: "Units must be an array" }, { status: 400 });
    }

    await connectDB();

    const updated = await UserSettings.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { categories, units },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/user-settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
