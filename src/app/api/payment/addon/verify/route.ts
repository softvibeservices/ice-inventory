// src/app/api/payment/addon/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/addon/verify
//
//  CHANGES FROM PREVIOUS VERSION:
//    - Added `export const dynamic = "force-dynamic"`.
//      Same reason as addon/create-order — request.headers is read inside
//      verifyUserRequest() which triggers DYNAMIC_SERVER_USAGE at build time.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import mongoose                    from "mongoose";
import { connectDB }               from "@/lib/mongodb";
import { verifyUserRequest }       from "@/lib/userAuth";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import PaymentRecord               from "@/models/PaymentRecord";
import Subscription                from "@/models/Subscription";
import AddOn                       from "@/models/AddOn";
import type { AddOnType }          from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }    from "@/models/AddOn";
import {
  computeAddOnExpiry,
  getAnchorDayFromDate,
}                                  from "@/lib/addonAlignment";

// ─── CRITICAL: Required on every API route that reads request.headers ────────
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  ADDON_LABELS — defined locally to avoid AddOn model export shape issues.
// ─────────────────────────────────────────────────────────────────────────────
const ADDON_LABELS: Record<AddOnType, string> = {
  extra_invoice_100: "Extra 100 Invoices / Month",
  extra_invoice_300: "Extra 300 Invoices / Month",
  extra_manager:     "Extra Manager Seat",
  extra_delivery:    "Extra 3 Delivery Partners",
  advanced_reports:  "Advanced Reports",
  setup_migration:   "Setup & Data Migration",
};

// Explicit shape for AddOn.findById().lean<T>() result
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
    // ── 1. Auth — admin only, block managers ──────────────────────────────────
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

    if (!mongoose.Types.ObjectId.isValid(paymentRecordId)) {
      return NextResponse.json(
        { error: "Invalid paymentRecordId format." },
        { status: 400 }
      );
    }

    // ── 3. Verify Razorpay signature — SECURITY GATE ─────────────────────────
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

    // ── 5. Find the PaymentRecord (scoped to userId for security) ─────────────
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

    // ── 6. Idempotency — already captured ────────────────────────────────────
    if (paymentRecord.status === "captured") {
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

    if (paymentRecord.type !== "addon") {
      return NextResponse.json(
        { error: "This payment record is not an add-on payment." },
        { status: 400 }
      );
    }

    // ── 7. Fetch subscription for billing anchor alignment ────────────────────
    const subscription = await Subscription.findOne({ userId });

    const addonType = paymentRecord.addonType as AddOnType;
    const isOneTime = ONE_TIME_ADDON_TYPES.includes(addonType);

    // ── 8. Compute add-on expiry aligned to subscription billing anchor ───────
    let expiresAt:        Date | null   = null;
    let billingAnchorDay: number | null = null;

    if (!isOneTime) {
      if (subscription?.invoiceCountResetAt) {
        billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
      } else {
        billingAnchorDay = Math.min(new Date().getDate(), 28);
        console.warn(
          `[addon/verify] No subscription found for userId=${auth.userId} ` +
          `while computing add-on expiry. Using fallback anchor day=${billingAnchorDay}.`
        );
      }
      expiresAt = computeAddOnExpiry(billingAnchorDay);
    }

    // ── 9. Create AddOn document ──────────────────────────────────────────────
    const newAddOn = await AddOn.create({
      userId,
      type:             addonType,
      quantity:         paymentRecord.addonQuantity ?? 1,
      isActive:         true,
      expiresAt,
      billingAnchorDay: isOneTime ? null : billingAnchorDay,
      paymentRecordId:  paymentRecord._id,
    });

    // ── 10. Mark PaymentRecord as captured ────────────────────────────────────
    paymentRecord.status            = "captured";
    paymentRecord.razorpayPaymentId = razorpayPaymentId;
    paymentRecord.razorpaySignature = razorpaySignature;
    paymentRecord.activatedAddOnId  = newAddOn._id as mongoose.Types.ObjectId;

    await paymentRecord.save();

    // ── 11. Return success ────────────────────────────────────────────────────
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