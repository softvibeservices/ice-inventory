// src/app/api/payment/addon/create-order/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/addon/create-order
//
//  Step 1 of the add-on purchase payment flow.
//  Very similar to /api/payment/create-order but for add-ons instead of plans.
//
//  Flow:
//    1. Frontend POSTs { addonType, quantity }
//    2. This route validates the request, checks the user has an active paid
//       subscription (add-ons require a paid plan — not free_trial), computes
//       the amount SERVER-SIDE, creates a Razorpay order, creates a pending
//       PaymentRecord.
//    3. Returns Razorpay order details to the frontend.
//    4. Frontend opens Razorpay checkout modal.
//    5. On payment success, frontend calls /api/payment/addon/verify.
//
//  Auth: JWT required — admin role only. Managers are blocked (403).
//
//  SECURITY:
//    - Amount is ALWAYS computed server-side from ADDON_PRICES.
//    - User must have an ACTIVE NON-FREE_TRIAL subscription. Add-ons on a
//      free trial don't make sense — the user should upgrade first.
//    - One-time add-ons (setup_migration) have quantity locked to 1.
//    - Non-bulk add-ons also have quantity locked at 1 per purchase.
//    - Bulk add-ons (extra_invoice_100, extra_invoice_300) allow quantity > 1.
//
//  ADDON PRICES (in rupees, server-authoritative):
//    extra_invoice_100: ₹199/mo  (recurring)
//    extra_invoice_300: ₹499/mo  (recurring)
//    extra_manager:     ₹149/mo  (recurring)
//    extra_delivery:    ₹199/mo  (recurring)
//    advanced_reports:  ₹299/mo  (recurring, feature unlock)
//    setup_migration:   ₹499     (one-time)
//
//  FIX NOTES (TypeScript errors resolved):
//    - razorpay.orders.create() replaced with typed createOrder() wrapper
//      from @/lib/razorpay. This eliminates:
//        TS2322: Type 'RazorpayOrder' is not assignable to type 'void' (line 216)
//        TS2339: Property 'id' does not exist on type 'void'  (lines 246, 252)
//    - razorpayErr typed as `unknown` instead of `any`
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }                from "next/server";
import mongoose                        from "mongoose";
import { connectDB }                   from "@/lib/mongodb";
import { verifyUserRequest }           from "@/lib/userAuth";
import { createOrder, RazorpayOrder }  from "@/lib/razorpay";
import PaymentRecord                   from "@/models/PaymentRecord";
import Subscription                    from "@/models/Subscription";
import type { AddOnType }              from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }        from "@/models/AddOn";

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_PRICES
//
//  Server-side authoritative add-on pricing in RUPEES.
//  Matches PricingSection.tsx ADDONS array exactly.
//  Multiply by 100 to convert to Razorpay paise.
// ─────────────────────────────────────────────────────────────────────────────
const ADDON_PRICES: Record<AddOnType, number> = {
  extra_invoice_100: 199,
  extra_invoice_300: 499,
  extra_manager:     149,
  extra_delivery:    199,
  advanced_reports:  299,
  setup_migration:   499,
};

// ─────────────────────────────────────────────────────────────────────────────
//  BULK_ADDONS
//
//  Add-ons that can be purchased with quantity > 1.
//  e.g., buying 2x extra_invoice_100 adds 200 extra invoices/month.
//
//  All other add-ons are locked to quantity = 1 per purchase:
//    - advanced_reports: feature flag unlock — no meaning to buy 2
//    - setup_migration:  one-time service — no meaning to buy 2
//    - extra_manager:    each purchase = 1 seat; buy multiple times for more
//    - extra_delivery:   each purchase = 3 partners; buy multiple times for more
// ─────────────────────────────────────────────────────────────────────────────
const BULK_ADDONS: AddOnType[] = ["extra_invoice_100", "extra_invoice_300"];

// All valid AddOnType values
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
    // ── 1. Auth check — admin only, block managers ────────────────────────────
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

    // Validate addonType
    if (
      typeof addonType !== "string" ||
      !VALID_ADDON_TYPES.includes(addonType as AddOnType)
    ) {
      return NextResponse.json(
        {
          error: `Invalid addonType. Must be one of: ${VALID_ADDON_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const validatedAddonType = addonType as AddOnType;

    // Determine quantity:
    //  - One-time add-ons: always 1
    //  - Non-bulk add-ons: always 1
    //  - Bulk add-ons: default 1, validate positive integer
    const isOneTime  = ONE_TIME_ADDON_TYPES.includes(validatedAddonType);
    const isBulkable = BULK_ADDONS.includes(validatedAddonType);

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
    if (!isBulkable || isOneTime) {
      quantity = 1;
    }

    // ── 3. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 4. Check user has an ACTIVE NON-FREE_TRIAL subscription ───────────────
    //
    //  Add-ons don't make sense on a free trial — the user should upgrade
    //  their plan first. This validation runs server-side even if the frontend
    //  already checks it.
    //
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

    // ── 5. Compute amount in paise ─────────────────────────────────────────────
    const pricePerUnitRupees = ADDON_PRICES[validatedAddonType];
    const totalRupees        = pricePerUnitRupees * quantity;
    const amountInPaise      = totalRupees * 100;

    // ── 6. Create Razorpay order ──────────────────────────────────────────────
    //
    //  Uses the typed createOrder() wrapper from @/lib/razorpay instead of
    //  razorpay.orders.create() directly. This gives us the explicit
    //  RazorpayOrder return type and eliminates the TS2322 / TS2339 errors.
    //
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

    // ── 7. Create a pending PaymentRecord in MongoDB ──────────────────────────
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

    // ── 8. Return Razorpay order details to the frontend ──────────────────────
    return NextResponse.json(
      {
        razorpayOrderId: razorpayOrder.id,
        amount:          amountInPaise,
        currency:        "INR",
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        paymentRecordId: paymentRecord._id.toString(),
        // Human-readable summary for the checkout modal
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