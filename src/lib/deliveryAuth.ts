import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";

/* ----------------------------------------
   Local Types (for TypeScript safety)
---------------------------------------- */
interface LeanPartner {
  _id: string;
  status: "pending" | "approved" | "rejected";
}

/* ----------------------------------------
   Auth Result
---------------------------------------- */
export interface AuthResult {
  partnerId: string;
}

/* ----------------------------------------
   Central Delivery Auth
---------------------------------------- */
export async function verifyDeliveryAuth(
  req: Request
): Promise<AuthResult | NextResponse> {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Invalid authorization token" },
        { status: 401 }
      );
    }

    await connectDB();

    const partner = await DeliveryPartner.findOne({ sessionToken: token })
      .select("_id status")
      .lean<LeanPartner | null>();

    if (!partner) {
      return NextResponse.json(
        { error: "Session expired. Please login again." },
        { status: 401 }
      );
    }

    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Access revoked. Please login again." },
        { status: 403 }
      );
    }

    return { partnerId: String(partner._id) };
  } catch (err) {
    console.error("DELIVERY AUTH ERROR:", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
