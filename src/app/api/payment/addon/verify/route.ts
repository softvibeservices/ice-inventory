// src/app/api/payment/addon/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/addon/verify
//
//  Step 2 of the add-on purchase payment flow.
//  Called by the frontend immediately after the Razorpay checkout modal
//  returns a successful payment for an add-on purchase.
//
//  Flow:
//    1. Frontend receives razorpay_order_id, razorpay_payment_id,
//       razorpay_signature from the Razorpay modal handler callback.
//    2. Frontend POSTs these values here along with paymentRecordId.
//    3. This route verifies the HMAC-SHA256 signature.
//    4. On valid signature:
//         - Fetches the user's Subscription to get the billing anchor day
//         - Creates an AddOn document with expiry aligned to the subscription
//           reset date (via addonAlignment.ts)
//         - Marks PaymentRecord as captured
//    5. Returns the created AddOn to the frontend.
//
//  Auth: JWT required — admin role only. Managers are blocked (403).
//
//  IDEMPOTENCY:
//    If this route is called twice (frontend retry or webhook already
//    processed), checks if PaymentRecord is already "captured" and returns
//    200 immediately without creating a duplicate AddOn.
//
//  ADD-ON EXPIRY ALIGNMENT:
//    Recurring add-on expiry is aligned to the user's Subscription
//    invoiceCountResetAt anchor day (not a naive "now + 30 days").
//    This ensures add-on bonuses expire in sync with the monthly invoice reset.
//    See addonAlignment.ts for the full explanation.
//
//  ONE-TIME ADD-ONS:
//    setup_migration has expiresAt = null (no expiry).
//    advanced_reports is recurring (monthly fee) — NOT one-time.
//    See AddOn.ts ONE_TIME_ADDON_TYPES for the definitive list.
//
//  FIX NOTES (TypeScript errors resolved):
//    1. TS2614 — ADDON_LABELS import:
//         The AddOn model exports ADDON_LABELS as a named export, but some
//         versions of the file may export it differently. We define
//         ADDON_LABELS locally as a fallback constant so this route does
//         not depend on the export shape of the AddOn model. If your
//         AddOn model does export ADDON_LABELS as a named export, you can
//         switch back to the import.
//
//    2. TS2339 — Property '_id' / 'type' / etc. does not exist on lean() result:
//         AddOn.findById().lean() without a generic returns a complex union
//         type. We pass the explicit ExistingAddOnDoc interface as the
//         generic parameter: .lean<ExistingAddOnDoc>() which correctly
//         narrows the return type to a single document object.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }               from "next/server";
import mongoose                       from "mongoose";
import { connectDB }                  from "@/lib/mongodb";
import { verifyUserRequest }          from "@/lib/userAuth";
import { verifyRazorpaySignature }    from "@/lib/razorpay";
import PaymentRecord                  from "@/models/PaymentRecord";
import Subscription                   from "@/models/Subscription";
import AddOn                          from "@/models/AddOn";
import type { AddOnType }             from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }       from "@/models/AddOn";
import {
  computeAddOnExpiry,
  getAnchorDayFromDate,
}                                     from "@/lib/addonAlignment";

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_LABELS
//
//  Human-readable labels for each add-on type.
//  Defined locally to avoid import issues with the AddOn model's export shape.
//  These labels are returned in the API response and shown in the frontend
//  add-on activation success message.
//
//  FIX: Replaces `import { ADDON_LABELS } from "@/models/AddOn"` which caused
//  TS2614 when the AddOn model did not export ADDON_LABELS as a named export.
// ─────────────────────────────────────────────────────────────────────────────
const ADDON_LABELS: Record<AddOnType, string> = {
  extra_invoice_100: "Extra 100 Invoices / Month",
  extra_invoice_300: "Extra 300 Invoices / Month",
  extra_manager:     "Extra Manager Seat",
  extra_delivery:    "Extra 3 Delivery Partners",
  advanced_reports:  "Advanced Reports",
  setup_migration:   "Setup & Data Migration",
};

// ─────────────────────────────────────────────────────────────────────────────
//  ExistingAddOnDoc
//
//  Explicit shape for the document returned by AddOn.findById().lean<T>().
//  Passing this as a generic to .lean<ExistingAddOnDoc>() ensures TypeScript
//  knows the exact properties of the returned object, eliminating the TS2339
//  "Property '_id' does not exist" errors that occur when lean() is called
//  without a type parameter (returning a complex Mongoose union type).
// ─────────────────────────────────────────────────────────────────────────────
interface ExistingAddOnDoc {
  _id:              mongoose.Types.ObjectId;
  type:             AddOnType;
  quantity:         number;
  isActive:         boolean;
  expiresAt:        Date | null;
  billingAnchorDay: number | null;
}

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
        { error: "Managers cannot verify add-on payments." },
        { status: 403 }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 2. Parse and validate request body ───────────────────────────────────
    let body: {
      razorpayOrderId?:   unknown;
      razorpayPaymentId?: unknown;
      razorpaySignature?: unknown;
      paymentRecordId?:   unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentRecordId,
    } = body;

    // All 4 fields are required
    if (
      typeof razorpayOrderId   !== "string" || !razorpayOrderId   ||
      typeof razorpayPaymentId !== "string" || !razorpayPaymentId ||
      typeof razorpaySignature !== "string" || !razorpaySignature ||
      typeof paymentRecordId   !== "string" || !paymentRecordId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: razorpayOrderId, razorpayPaymentId, " +
            "razorpaySignature, paymentRecordId.",
        },
        { status: 400 }
      );
    }

    // Validate paymentRecordId format
    if (!mongoose.Types.ObjectId.isValid(paymentRecordId)) {
      return NextResponse.json(
        { error: "Invalid paymentRecordId format." },
        { status: 400 }
      );
    }

    // ── 3. Verify Razorpay signature ──────────────────────────────────────────
    //
    //  CRITICAL: Do NOT create the AddOn if signature is invalid.
    //  This is the primary security gate for add-on activation.
    //
    const isSignatureValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      console.warn(
        `[addon/verify] Invalid signature for orderId=${razorpayOrderId} userId=${auth.userId}`
      );
      return NextResponse.json(
        {
          error:
            "Payment verification failed. Invalid signature. " +
            "Please contact support if you were charged.",
        },
        { status: 400 }
      );
    }

    // ── 4. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 5. Find the PaymentRecord ─────────────────────────────────────────────
    //
    //  Scoped to both _id AND userId for security — users can only verify
    //  their own payments.
    //
    const paymentRecord = await PaymentRecord.findOne({
      _id:    new mongoose.Types.ObjectId(paymentRecordId),
      userId,
    });

    if (!paymentRecord) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    // ── 6. Idempotency check — already captured ───────────────────────────────
    //
    //  If this route is called twice or the webhook already activated the
    //  add-on, return the existing AddOn without creating a duplicate.
    //
    if (paymentRecord.status === "captured") {
      // FIX: Use .lean<ExistingAddOnDoc>() generic to get correct property types.
      // Without the generic, Mongoose returns a union type where individual
      // properties like _id, type, quantity are not accessible, causing TS2339.
      const existingAddOn = paymentRecord.activatedAddOnId
        ? await AddOn.findById(paymentRecord.activatedAddOnId).lean<ExistingAddOnDoc>()
        : null;

      return NextResponse.json(
        {
          success:          true,
          alreadyActivated: true,
          addOn: existingAddOn
            ? {
                id:               existingAddOn._id.toString(),
                type:             existingAddOn.type,
                typeLabel:        ADDON_LABELS[existingAddOn.type],
                quantity:         existingAddOn.quantity,
                isActive:         existingAddOn.isActive,
                isOneTime:        ONE_TIME_ADDON_TYPES.includes(existingAddOn.type),
                expiresAt:        existingAddOn.expiresAt,
                billingAnchorDay: existingAddOn.billingAnchorDay,
              }
            : null,
        },
        { status: 200 }
      );
    }

    // Ensure this PaymentRecord is for an add-on
    if (paymentRecord.type !== "addon") {
      return NextResponse.json(
        { error: "This payment record is not an add-on payment." },
        { status: 400 }
      );
    }

    // ── 7. Fetch user's Subscription for billing anchor alignment ─────────────
    //
    //  The add-on's expiry must be aligned to the user's subscription
    //  invoiceCountResetAt anchor day, not a naive "now + 30 days".
    //  See addonAlignment.ts for full explanation.
    //
    const subscription = await Subscription.findOne({ userId });

    const addonType = paymentRecord.addonType as AddOnType;
    const isOneTime = ONE_TIME_ADDON_TYPES.includes(addonType);

    // ── 8. Compute add-on expiry ───────────────────────────────────────────────
    let expiresAt:        Date | null   = null;
    let billingAnchorDay: number | null = null;

    if (!isOneTime) {
      // Extract anchor day from the subscription's reset date
      if (subscription?.invoiceCountResetAt) {
        billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
      } else {
        // Fallback: use today's day capped at 28 (user has no subscription somehow)
        billingAnchorDay = Math.min(new Date().getDate(), 28);

        console.warn(
          `[addon/verify] No subscription found for userId=${auth.userId} ` +
          `while computing add-on expiry. Using fallback anchor day=${billingAnchorDay}.`
        );
      }

      // Compute the next occurrence of the anchor day
      expiresAt = computeAddOnExpiry(billingAnchorDay);
    }

    // ── 9. Create AddOn document ───────────────────────────────────────────────
    //
    //  Each purchase creates a new AddOn document.
    //  Multiple AddOn docs of the same type can exist — they are summed
    //  by getEffectiveCapabilities() in subscriptionGuard.ts.
    //
    const newAddOn = await AddOn.create({
      userId,
      type:             addonType,
      quantity:         paymentRecord.addonQuantity ?? 1,
      isActive:         true,
      expiresAt,
      billingAnchorDay: isOneTime ? null : billingAnchorDay,
      paymentRecordId:  paymentRecord._id,
    });

    // ── 10. Update PaymentRecord to captured ───────────────────────────────────
    paymentRecord.status             = "captured";
    paymentRecord.razorpayPaymentId  = razorpayPaymentId;
    paymentRecord.razorpaySignature  = razorpaySignature;
    paymentRecord.activatedAddOnId   = newAddOn._id as mongoose.Types.ObjectId;

    await paymentRecord.save();

    // ── 11. Return success with the created AddOn ──────────────────────────────
    return NextResponse.json(
      {
        success: true,
        addOn: {
          id:               newAddOn._id.toString(),
          type:             newAddOn.type,
          typeLabel:        ADDON_LABELS[newAddOn.type as AddOnType],
          quantity:         newAddOn.quantity,
          isActive:         newAddOn.isActive,
          isOneTime,
          expiresAt:        newAddOn.expiresAt,
          billingAnchorDay: newAddOn.billingAnchorDay,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[addon/verify] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again or contact support." },
      { status: 500 }
    );
  }
}