// src/app/api/delivery/customer-details/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { verifyDeliveryAuth } from "@/lib/deliveryAuth";

/* ----------------------------------------
   Local type for TS safety
---------------------------------------- */
interface LeanCustomer {
  _id: string;
  name: string;
  shopName: string;
  shopAddress: string;
  contacts: string[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export async function GET(req: Request) {
  // 🔐 DELIVERY AUTH
  const auth = await verifyDeliveryAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const customer = await Customer.findById(customerId)
      .select("name shopName shopAddress contacts location")
      .lean<LeanCustomer | null>();

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
                latitude: customer.location.latitude ?? null,
                longitude: customer.location.longitude ?? null,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /delivery/customer-details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customer details" },
      { status: 500 }
    );
  }
}
