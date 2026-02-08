// src/app/api/delivery/check-status/route.ts
// ✅ NEW ENDPOINT: Check status without token (for pending users)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

// ✅ Define interface for type safety
interface LeanPartner {
  _id: string;
  name: string;
  email: string;
  status: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId } = body ?? {};
    
    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const partner = await DeliveryPartner.findById(partnerId)
      .select("name email status")
      .lean<LeanPartner | null>(); // ✅ Specify return type
    
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      partner: {
        id: String(partner._id),
        name: partner.name,
        email: partner.email,
        status: partner.status,
      },
    }, { status: 200 });
    
  } catch (err) {
    console.error("CHECK STATUS ERROR:", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}