// src/app/api/delivery/sticky-notes/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StickyNote from "@/models/StickyNote";
import DeliveryPartner from "@/models/DeliveryPartner";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const notes = await StickyNote.find({ deliveryPartnerId: partnerId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes }, { status: 200 });
  } catch (err) {
    console.error("GET sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to fetch sticky notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      partnerId,
      userId,          // shop owner id
      productName,
      customerName,
      quantity,
      notes,
    } = body ?? {};

    if (!partnerId || !userId || !customerName) {
      return NextResponse.json(
        { error: "partnerId, userId and customerName required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner || partner.status !== "approved") {
      return NextResponse.json(
        { error: "Partner invalid or not approved" },
        { status: 403 }
      );
    }

    const sticky = await StickyNote.create({
      deliveryPartnerId: partnerId,
      userId,
      customerName,
      productName: productName || "",
      quantity: quantity || "",
      notes: notes || "",
    });

    return NextResponse.json(
      { message: "Sticky note created", sticky },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST sticky notes error:", err);
    return NextResponse.json(
      { error: "Failed to create sticky note" },
      { status: 500 }
    );
  }
}
