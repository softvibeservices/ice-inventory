// src/app/api/delivery/customer-details/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import DeliveryPartner from "@/models/DeliveryPartner";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const partnerId = searchParams.get("partnerId");
    const customerId = searchParams.get("customerId");

    if (!partnerId || !customerId) {
      return NextResponse.json(
        { error: "partnerId and customerId required" },
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

    const customer: any = await Customer.findById(customerId).lean();

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        customer: {
          id: String(customer._id),
          name: customer.name,
          shopName: customer.shopName,
          shopAddress: customer.shopAddress,
          contacts: customer.contacts,
          location: customer.location
            ? {
                latitude: customer.location.latitude,
                longitude: customer.location.longitude,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /delivery/customer-details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customer details" },
      { status: 500 }
    );
  }
}
