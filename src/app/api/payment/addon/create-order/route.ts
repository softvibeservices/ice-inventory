// src/app/api/payment/addon/create-order/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/addon/create-order
//
//  CHANGES FROM PREVIOUS VERSION:
//    - Added `export const dynamic = "force-dynamic"` (line below imports).
//      This is required for any Next.js App Router API route that uses
//      request.headers, request.url, cookies, or reads env vars at runtime.
//      Without it, Next.js attempts to statically render the route during
//      `next build`, hits request.headers in verifyUserRequest(), and throws
//      DYNAMIC_SERVER_USAGE — which floods Vercel build logs with errors.
//    - createOrder() import updated: now imported from the updated razorpay.ts
//      which uses lazy initialisation (getRazorpay() singleton).
//      No call-site changes needed — createOrder() API is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }               from "next/server";
import mongoose                       from "mongoose";
import { connectDB }                  from "@/lib/mongodb";
import { verifyUserRequest }          from "@/lib/userAuth";
import { createOrder, RazorpayOrder } from "@/lib/razorpay";
import PaymentRecord                  from "@/models/PaymentRecord";
import Subscription                   from "@/models/Subscription";
import type { AddOnType }             from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }       from "@/models/AddOn";

// ─── CRITICAL: Required on every API route that reads request.headers ────────
//
//  Tells Next.js this route must ALWAYS be server-rendered on demand — never
//  statically pre-rendered at build time. Without this, `next build` tries to
//  render the route and fails with DYNAMIC_SERVER_USAGE when it encounters
//  request.headers inside verifyUserRequest().
//
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_PRICES — server-side authoritative pricing in RUPEES.
//  Multiply by 100 for Razorpay paise. Matches PricingSection.tsx exactly.
// ─────────────────────────────────────────────────────────────────────────────
const ADDON_PRICES: Record<AddOnType, number> = {
  extra_invoice_100: 199,
  extra_invoice_300: 499,
  extra_manager:     149,
  extra_delivery:    199,
  advanced_reports:  299,
  setup_migration:   499,
};

// Add-ons that support quantity > 1 per purchase
const BULK_ADDONS: AddOnType[] = ["extra_invoice_100", "extra_invoice_300"];

const VALID_ADDON_TYPES: AddOnType[] = [
  "extra_invoice_100",
  "extra_invoice_300",
  "extra_manager",
  "extra_delivery",
  "advanced_reports",
  "setup_migration",
];

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  try {
    // ── 1. Auth — admin only, block managers ──────────────────────────────────
    const auth = await verifyUserRequest(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.role === "manager") {
      return NextResponse.json(
        { error: "Managers cannot purchase add-ons. Please contact the account admin." },
        { status: 403 }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 2. Parse and validate request body ───────────────────────────────────
    let body: { addonType?: unknown; quantity?: unknown };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { addonType, quantity: rawQuantity } = body;

    if (
      typeof addonType !== "string" ||
      !VALID_ADDON_TYPES.includes(addonType as AddOnType)
    ) {
      return NextResponse.json(
        { error: `Invalid addonType. Must be one of: ${VALID_ADDON_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    const validatedAddonType = addonType as AddOnType;
    const isOneTime          = ONE_TIME_ADDON_TYPES.includes(validatedAddonType);
    const isBulkable         = BULK_ADDONS.includes(validatedAddonType);

    let quantity = 1;

    if (isBulkable && rawQuantity !== undefined) {
      const parsedQty = Number(rawQuantity);
      if (!Number.isInteger(parsedQty) || parsedQty < 1) {
        return NextResponse.json(
          { error: "quantity must be a positive integer." },
          { status: 400 }
        );
      }
      quantity = parsedQty;
    }

    // Force quantity to 1 for non-bulk and one-time add-ons
    if (!isBulkable || isOneTime) quantity = 1;

    // ── 3. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 4. Require active NON-free_trial subscription ─────────────────────────
    const subscription = await Subscription.findOne({ userId }).lean();

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found. Please complete account setup." },
        { status: 403 }
      );
    }

    if (subscription.status !== "active") {
      return NextResponse.json(
        {
          error:           "Your subscription is not active. Please renew or contact support.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    if (subscription.planId === "free_trial") {
      return NextResponse.json(
        {
          error:
            "Add-ons require an active paid plan. " +
            "Please upgrade to Launch, Scale, or Business first.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // ── 5. Compute amount in paise (server-side — never trust client) ─────────
    const pricePerUnitRupees = ADDON_PRICES[validatedAddonType];
    const totalRupees        = pricePerUnitRupees * quantity;
    const amountInPaise      = totalRupees * 100;

    // ── 6. Create Razorpay order ──────────────────────────────────────────────
    let razorpayOrder: RazorpayOrder;

    try {
      razorpayOrder = await createOrder({
        amount:   amountInPaise,
        currency: "INR",
        receipt:  `addon_${userId.toString()}_${Date.now()}`,
        notes: {
          userId:    userId.toString(),
          addonType: validatedAddonType,
          quantity:  String(quantity),
        },
      });
    } catch (razorpayErr: unknown) {
      const err = razorpayErr as { error?: { description?: string } };
      console.error("[addon/create-order] Razorpay order creation failed:", razorpayErr);
      return NextResponse.json(
        {
          error:   "Failed to create payment order. Please try again.",
          details: err?.error?.description ?? "Unknown Razorpay error",
        },
        { status: 502 }
      );
    }

    // ── 7. Create pending PaymentRecord ──────────────────────────────────────
    const paymentRecord = await PaymentRecord.create({
      userId,
      type:            "addon",
      addonType:       validatedAddonType,
      addonQuantity:   quantity,
      amount:          amountInPaise,
      currency:        "INR",
      status:          "pending",
      razorpayOrderId: razorpayOrder.id,
    });

    // ── 8. Return Razorpay order details to frontend ──────────────────────────
    return NextResponse.json(
      {
        razorpayOrderId: razorpayOrder.id,
        amount:          amountInPaise,
        currency:        "INR",
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        paymentRecordId: paymentRecord._id.toString(),
        addonType:       validatedAddonType,
        quantity,
        amountInRupees:  totalRupees,
        isOneTime,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[addon/create-order] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}