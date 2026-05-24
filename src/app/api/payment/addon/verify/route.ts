// src/app/api/payment/addon/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/payment/addon/verify
//
//  ALL SECURITY FIXES APPLIED (Phases 1, 2, 4, 5, 6):
//
//  Phase 1 — CRITICAL: razorpayOrderId cross-check in atomic claim
//    Added razorpayOrderId to the findOneAndUpdate filter so the
//    signature-verified orderId must match the record being claimed.
//    Prevents cheap-order signature replay against expensive pending records.
//
//  Phase 2 — CRITICAL: Wrong type guard
//    Changed guard from `!== "subscription"` to `!== "addon"`.
//    The old guard was always true for addon records, rolling every payment
//    back to "pending" and returning 400. The AddOn was never created.
//
//  Phase 4 — MEDIUM: Mixed local/UTC time in computeNextMonthReset
//    Changed now.getDate() → now.getUTCDate() so the anchor day is derived
//    purely from UTC, eliminating an off-by-one on IST (or any non-UTC)
//    servers for payments made near UTC midnight.
//
//  Phase 5 — MEDIUM: Missing force-dynamic export
//    Added export const dynamic = "force-dynamic" to prevent Next.js from
//    caching POST responses under certain build/edge configurations.
//
//  Phase 6 — LOW: Removed local verifyRazorpaySignature duplicate
//    Deleted the local copy of verifyRazorpaySignature (which used plain
//    === string comparison) and replaced it with the canonical import from
//    @/lib/razorpay, which uses crypto.timingSafeEqual() — timing-attack safe.
//    The crypto import is also removed since it is no longer needed here.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }                            from "next/server";
import mongoose                                    from "mongoose";
import { connectDB }                               from "@/lib/mongodb";
import { verifyUserRequest }                       from "@/lib/userAuth";
// ── Phase 6 fix: import canonical implementation instead of local duplicate ──
//  @/lib/razorpay uses crypto.timingSafeEqual() — timing-attack safe.
//  The local copy used plain === string comparison and is now deleted.
import { verifyRazorpaySignature }                 from "@/lib/razorpay";
import PaymentRecord                               from "@/models/PaymentRecord";
import Subscription                               from "@/models/Subscription";
import AddOn                                       from "@/models/AddOn";
import { ONE_TIME_ADDON_TYPES }                    from "@/models/AddOn";
import type { AddOnType }                          from "@/models/AddOn";
import { computeAddOnExpiry, getAnchorDayFromDate } from "@/lib/addonAlignment";
import { rateLimit }                               from "@/lib/rateLimit";

// ── Phase 5 fix: force-dynamic prevents Next.js caching POST responses ───────
//  Every sibling payment route already has this. Without it, a cached verify
//  response could be served to a different request under edge/CDN configs.
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  computeNextMonthReset — Phase 4 fix: pure UTC, no local-time mixing
//
//  BEFORE: Math.min(now.getDate(), 28)
//    getDate() returns the local calendar day in the server's timezone.
//    Mixed with Date.UTC(), this causes an off-by-one anchor day for payments
//    made between 00:00–05:30 IST (which is still yesterday in UTC).
//
//  AFTER: Math.min(now.getUTCDate(), 28)
//    All components come from UTC accessors — server timezone has no effect.
// ─────────────────────────────────────────────────────────────────────────────
function computeNextMonthReset(): Date {
  const now       = new Date();
  const anchorDay = Math.min(now.getUTCDate(), 28); // ✅ Phase 4 fix: was now.getDate()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, anchorDay)
  );
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
        { error: "Managers cannot verify addon payments." },
        { status: 403 }
      );
    }

    // ── 2. Rate limiting ──────────────────────────────────────────────────────
    const rl = rateLimit(`payment-addon-verify:${auth.userId}`, {
      limit:         10,
      windowSeconds: 60,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts. Please wait ${rl.retryAfterSeconds} seconds.`,
        },
        {
          status:  429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
        }
      );
    }

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // ── 3. Parse and validate request body ───────────────────────────────────
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentRecordId } = body;

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

    // ── 4. Verify Razorpay signature — SECURITY GATE ─────────────────────────
    //  Phase 6: now calls the canonical @/lib/razorpay implementation which
    //  uses crypto.timingSafeEqual() instead of plain === string comparison.
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

    // ── 5. Connect to MongoDB ─────────────────────────────────────────────────
    await connectDB();

    // ── 6. ATOMIC CLAIM ───────────────────────────────────────────────────────
    //
    //  Phase 1 fix: razorpayOrderId is included in the filter.
    //
    //  BEFORE (vulnerable):
    //    { _id: paymentRecordId, userId, status: "pending" }
    //    An attacker with a valid cheap-order signature could pair it with the
    //    paymentRecordId of an expensive pending record they never paid for.
    //    The signature check passes (covers only orderId+paymentId), the DB
    //    claim succeeds (correct _id + userId + pending), expensive addon free.
    //
    //  AFTER (fixed):
    //    razorpayOrderId added — the signature-verified orderId must be stored
    //    on the exact PaymentRecord being claimed. Mismatch → null → 404.
    //
    const claimedRecord = await PaymentRecord.findOneAndUpdate(
      {
        _id:             new mongoose.Types.ObjectId(paymentRecordId),
        userId,
        status:          "pending",
        razorpayOrderId, // ✅ Phase 1 fix: orderId cross-check
      },
      {
        $set: {
          status:             "captured",
          razorpayPaymentId,
          razorpaySignature,
        },
      },
      { new: false } // return OLD doc to read type, addonType, etc.
    );

    // ── 7. Handle non-pending / not-found cases ───────────────────────────────
    if (!claimedRecord) {
      const existing = await PaymentRecord.findOne({
        _id:    new mongoose.Types.ObjectId(paymentRecordId),
        userId,
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Payment record not found." },
          { status: 404 }
        );
      }

      if (existing.status === "captured") {
        const existingAddon = await AddOn.findOne({ paymentRecordId: existing._id });
        return NextResponse.json(
          {
            success:          true,
            alreadyActivated: true,
            addon: existingAddon
              ? {
                  type:      existingAddon.type,
                  quantity:  existingAddon.quantity,
                  expiresAt: existingAddon.expiresAt,
                  isActive:  existingAddon.isActive,
                }
              : null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          error:
            `Cannot verify payment: record is in "${existing.status}" state. ` +
            "Please contact support if you believe you were charged.",
        },
        { status: 409 }
      );
    }

    // ── 8. Validate record type ───────────────────────────────────────────────
    //
    //  Phase 2 fix: guard checks for "addon", not "subscription".
    //
    //  BEFORE (broken):
    //    if (claimedRecord.type !== "subscription")
    //    Every addon record has type:"addon", so this was ALWAYS true.
    //    The route claimed the record, hit this guard, rolled it back to
    //    "pending", and returned 400. The AddOn was never created.
    //    Every addon purchase silently failed after the user paid.
    //
    //  AFTER (fixed):
    //    Non-addon records are rolled back so the correct verify route can
    //    still claim them.
    //
    if (claimedRecord.type !== "addon") { // ✅ Phase 2 fix: was !== "subscription"
      await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
        $set: {
          status:            "pending",
          razorpayPaymentId: undefined,
          razorpaySignature: undefined,
        },
      });
      return NextResponse.json(
        { error: "This payment record is not an addon payment." },
        { status: 400 }
      );
    }

    // ── 9. Fetch Subscription for billing anchor day ──────────────────────────
    const subscription = await Subscription.findOne({ userId });

    // ── 10. Compute AddOn expiry ──────────────────────────────────────────────
    const addonType = claimedRecord.addonType as AddOnType;
    const isOneTime = ONE_TIME_ADDON_TYPES.includes(addonType);

    let expiresAt:        Date | null   = null;
    let billingAnchorDay: number | null = null;

    if (!isOneTime) {
      if (subscription?.invoiceCountResetAt) {
        billingAnchorDay = getAnchorDayFromDate(subscription.invoiceCountResetAt);
      } else {
        billingAnchorDay = Math.min(new Date().getUTCDate(), 28);
      }
      expiresAt = computeAddOnExpiry(billingAnchorDay);
    }

    // ── 11. Create the AddOn document ─────────────────────────────────────────
    const newAddOn = await AddOn.create({
      userId,
      type:             addonType,
      quantity:         claimedRecord.addonQuantity ?? 1,
      isActive:         true,
      expiresAt,
      billingAnchorDay: isOneTime ? null : billingAnchorDay,
      paymentRecordId:  claimedRecord._id,
    });

    // ── 12. Write reverse-reference onto the PaymentRecord ────────────────────
    await PaymentRecord.findByIdAndUpdate(claimedRecord._id, {
      $set: { activatedAddOnId: newAddOn._id as mongoose.Types.ObjectId },
    });

    console.log(
      `[addon/verify] ✅ userId=${auth.userId} ` +
      `type=${addonType} qty=${claimedRecord.addonQuantity ?? 1} ` +
      `expiresAt=${expiresAt?.toISOString() ?? "never (one-time)"}`
    );

    // ── 13. Return success ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        addon: {
          id:        String(newAddOn._id),
          type:      newAddOn.type,
          quantity:  newAddOn.quantity,
          expiresAt: newAddOn.expiresAt ? newAddOn.expiresAt.toISOString() : null,
          isActive:  newAddOn.isActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/payment/addon/verify] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}