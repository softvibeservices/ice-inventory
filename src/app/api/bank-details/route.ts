// src/app/api/bank-details/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BankDetails from "@/models/BankDetails";
import SellerDetails from "@/models/SellerDetails";
import { verifyUserRequest } from "@/lib/userAuth";

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return NextResponse.json(
        { error: "sellerId required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return NextResponse.json({ error: "Invalid sellerId" }, { status: 400 });
    }

    // Security: verify this sellerId actually belongs to the authenticated user
    const sellerDoc = await SellerDetails.findOne({
      _id: new mongoose.Types.ObjectId(sellerId),
      userId: new mongoose.Types.ObjectId(auth.userId),
    }).select("_id");

    if (!sellerDoc) {
      return NextResponse.json(
        { error: "Not authorized to access these bank details" },
        { status: 403 }
      );
    }

    const bank = await BankDetails.findOne({
      sellerId: new mongoose.Types.ObjectId(sellerId),
    });

    return NextResponse.json(bank || {});
  } catch (err: any) {
    console.error("GET /api/bank-details error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
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
    const { sellerId, bankName, ifscCode, branchName, bankingName, accountNumber } =
      body;

    if (
      !sellerId ||
      !bankName ||
      !ifscCode ||
      !branchName ||
      !bankingName ||
      !accountNumber
    ) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return NextResponse.json({ error: "Invalid sellerId" }, { status: 400 });
    }

    // Security: verify this sellerId actually belongs to the authenticated user
    const sellerDoc = await SellerDetails.findOne({
      _id: new mongoose.Types.ObjectId(sellerId),
      userId: new mongoose.Types.ObjectId(auth.userId),
    }).select("_id");

    if (!sellerDoc) {
      return NextResponse.json(
        { error: "Not authorized to modify these bank details" },
        { status: 403 }
      );
    }

    const sellerObjId = new mongoose.Types.ObjectId(sellerId);

    let bank = await BankDetails.findOne({ sellerId: sellerObjId });
    if (bank) {
      bank.bankName = bankName;
      bank.ifscCode = ifscCode;
      bank.branchName = branchName;
      bank.bankingName = bankingName;
      bank.accountNumber = accountNumber;
      await bank.save();
    } else {
      bank = await BankDetails.create({
        sellerId: sellerObjId,
        bankName,
        ifscCode,
        branchName,
        bankingName,
        accountNumber,
      });
    }

    return NextResponse.json(bank);
  } catch (err: any) {
    console.error("POST /api/bank-details error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}