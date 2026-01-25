// icecream-inventory/src/app/api/user-settings/route.ts

import { NextResponse } from "next/server";
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

    await connectDB();
    
    let settings = await UserSettings.findOne({ userId });
    
    // If settings don't exist, create default settings
    if (!settings) {
      settings = await UserSettings.create({
        userId,
        categories: ["Cups", "Family Pack", "Cone", "Candybar", "Tub"],
        units: ["ml", "L", "gm", "kg", "piece", "box"],
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// UPDATE USER SETTINGS
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, categories, units } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await connectDB();

    const updated = await UserSettings.findOneAndUpdate(
      { userId },
      { 
        categories: categories || [],
        units: units || [],
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}