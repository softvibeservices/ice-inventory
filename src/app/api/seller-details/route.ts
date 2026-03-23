// src/app/api/seller-details/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import SellerDetails from "@/models/SellerDetails";
import { verifyUserRequest } from "@/lib/userAuth";

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const details = await SellerDetails.findOne({
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    return NextResponse.json(details || {});
  } catch (error) {
    console.error("Error fetching seller details:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller details" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const { contact } = body;

    if (!contact) {
      return NextResponse.json(
        { error: "Contact number is required" },
        { status: 400 }
      );
    }

    // Always use auth.userId — never trust userId from body
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const existing = await SellerDetails.findOne({ userId: userObjectId });

    if (existing) {
      const updated = await SellerDetails.findOneAndUpdate(
        { userId: userObjectId },
        { ...body, userId: userObjectId },
        { new: true, runValidators: true }
      );
      return NextResponse.json(updated);
    } else {
      const created = await SellerDetails.create({
        ...body,
        userId: userObjectId,
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error("Error saving seller details:", error);
    return NextResponse.json(
      { error: "Failed to save seller details" },
      { status: 500 }
    );
  }
}