// src/app/api/bank-details/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // lazy import the DB connector and models inside the handler
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();

    const { default: BankDetails } = await import("@/models/BankDetails");

    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get("sellerId");

    if (!sellerId) {
      return NextResponse.json({ error: "sellerId required" }, { status: 400 });
    }

    const bank = await BankDetails.findOne({ sellerId });
    return NextResponse.json(bank || {});
  } catch (err: any) {
    console.error("GET /api/bank-details error:", err);
    const message = err?.message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { connectDB } = await import("@/lib/mongodb");
    await connectDB();

    const { default: BankDetails } = await import("@/models/BankDetails");

    const body = await req.json();
    const { sellerId, bankName, ifscCode, branchName, bankingName, accountNumber } = body;

    if (!sellerId || !bankName || !ifscCode || !branchName || !bankingName || !accountNumber) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    let bank = await BankDetails.findOne({ sellerId });
    if (bank) {
      bank.bankName = bankName;
      bank.ifscCode = ifscCode;
      bank.branchName = branchName;
      bank.bankingName = bankingName;
      bank.accountNumber = accountNumber;
      await bank.save();
    } else {
      bank = await BankDetails.create({ sellerId, bankName, ifscCode, branchName, bankingName, accountNumber });
    }

    return NextResponse.json(bank);
  } catch (err: any) {
    console.error("POST /api/bank-details error:", err);
    const message = err?.message ?? "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}