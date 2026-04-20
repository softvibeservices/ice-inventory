// src/app/api/admin/users/[userId]/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET  /api/admin/users/[userId]  — superAdmin only
//  PATCH /api/admin/users/[userId] — superAdmin only
//
//  GET:
//    Returns full detail for a single admin user:
//      - User document (profile info)
//      - Subscription document (plan, usage, custom limits)
//      - All AddOn documents for this user
//      - Last 20 PaymentRecord documents for this user
//
//  PATCH:
//    Updates the user's subscription manually. Supported fields:
//      planId           — change to any plan tier
//      status           — override subscription status
//      billingPeriod    — change billing period
//      currentPeriodEnd — extend or set new period end date (ISO string)
//      customLimits     — set custom limits (only meaningful for planId="customize")
//      resetUsage       — boolean; if true, resets invoicesUsedThisMonth to 0
//
//    This is how superAdmin activates paid plans, creates custom plans, or
//    manually overrides subscription state after verifying a Razorpay payment.
//
//  Auth: superAdmin only (403 for any other role)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import AddOn from "@/models/AddOn";
import PaymentRecord from "@/models/PaymentRecord";
import { PLAN_NAMES } from "@/types/subscription.types";
import type { PlanId, BillingPeriod, SubscriptionStatus } from "@/types/subscription.types";
import type { ICustomLimits } from "@/models/Subscription";

// ─────────────────────────────────────────────────────────────────────────────
//  Route params type
// ─────────────────────────────────────────────────────────────────────────────
interface RouteParams {
  params: Promise<{ userId: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIX: Explicit shape for the lean User document
//  This resolves all TS2339 errors caused by Mongoose returning a union type
//  (Document | Document[] | null) when .lean() has no generic parameter.
//  By passing the type to .lean<ILeanUser>(), TypeScript narrows correctly.
// ─────────────────────────────────────────────────────────────────────────────
interface ILeanUser {
  _id: unknown;
  name: string;
  email: string;
  contact: string;
  shopName?: string;
  shopAddress?: string;
  gstin?: string;
  role: string;
  status: string;
  isVerified: boolean;
  isPending?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Validation helper: is the provided string a valid MongoDB ObjectId?
// ─────────────────────────────────────────────────────────────────────────────
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET handler — full user detail
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // ── 1. SuperAdmin auth ─────────────────────────────────────────────────
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { userId } = await params;

    // ── 2. Validate userId ─────────────────────────────────────────────────
    if (!isValidObjectId(userId)) {
      return NextResponse.json({ error: "Invalid user ID format." }, { status: 400 });
    }

    // ── 3. Fetch user — typed lean<ILeanUser>() fixes all TS2339 errors ───
    const user = await User.findById(userId)
      .select("-password -otp -otpExpires -otpRequestedAt -tokenVersion")
      .lean<ILeanUser>();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Now user.role, user._id, user.name, etc. are all fully typed — no TS errors
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "This endpoint is only for admin-role users." },
        { status: 400 }
      );
    }

    // ── 4. Fetch subscription ──────────────────────────────────────────────
    const subscription = await Subscription.findOne({ userId }).lean();

    // ── 5. Fetch all add-ons ───────────────────────────────────────────────
    const addOns = await AddOn.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // ── 6. Fetch last 20 payment records ──────────────────────────────────
    const payments = await PaymentRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // ── 7. Build response ──────────────────────────────────────────────────
    return NextResponse.json(
      {
        user: {
          id:           String(user._id),
          name:         user.name,
          email:        user.email,
          contact:      user.contact,
          shopName:     user.shopName ?? null,
          shopAddress:  user.shopAddress ?? null,
          gstin:        user.gstin ?? null,
          role:         user.role,
          status:       user.status,
          isVerified:   user.isVerified,
          isPending:    user.isPending ?? false,
          createdAt:    user.createdAt.toISOString(),
          updatedAt:    user.updatedAt.toISOString(),
        },
        subscription: subscription
          ? {
              id:                   String(subscription._id),
              planId:               subscription.planId,
              planName:             PLAN_NAMES[subscription.planId as PlanId],
              billingPeriod:        subscription.billingPeriod,
              status:               subscription.status,
              startDate:            (subscription.startDate as Date).toISOString(),
              currentPeriodEnd:     subscription.currentPeriodEnd
                ? (subscription.currentPeriodEnd as Date).toISOString()
                : null,
              trialEndsAt:          subscription.trialEndsAt
                ? (subscription.trialEndsAt as Date).toISOString()
                : null,
              invoicesUsedThisMonth: subscription.invoicesUsedThisMonth,
              invoicesUsedTotal:     subscription.invoicesUsedTotal,
              invoiceCountResetAt:  (subscription.invoiceCountResetAt as Date).toISOString(),
              customLimits:         subscription.customLimits ?? null,
              createdAt:            (subscription.createdAt as Date).toISOString(),
              updatedAt:            (subscription.updatedAt as Date).toISOString(),
            }
          : null,
        addOns: addOns.map((addon) => ({
          id:              String(addon._id),
          type:            addon.type,
          quantity:        addon.quantity,
          isActive:        addon.isActive,
          expiresAt:       addon.expiresAt
            ? (addon.expiresAt as Date).toISOString()
            : null,
          billingAnchorDay: addon.billingAnchorDay ?? null,
          paymentRecordId:  addon.paymentRecordId
            ? String(addon.paymentRecordId)
            : null,
          createdAt: (addon.createdAt as Date).toISOString(),
        })),
        payments: payments.map((p) => ({
          id:                    String(p._id),
          type:                  p.type,
          planId:                p.planId ?? null,
          billingPeriod:         p.billingPeriod ?? null,
          addonType:             p.addonType ?? null,
          addonQuantity:         p.addonQuantity ?? null,
          amount:                p.amount,
          currency:              p.currency,
          status:                p.status,
          razorpayOrderId:       p.razorpayOrderId ?? null,
          razorpayPaymentId:     p.razorpayPaymentId ?? null,
          activatedSubscriptionId: p.activatedSubscriptionId
            ? String(p.activatedSubscriptionId)
            : null,
          activatedAddOnId:      p.activatedAddOnId
            ? String(p.activatedAddOnId)
            : null,
          notes:                 p.notes ?? null,
          createdAt:             (p.createdAt as Date).toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/users/[userId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH handler — manual subscription update
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // ── 1. SuperAdmin auth ─────────────────────────────────────────────────
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { userId } = await params;

    // ── 2. Validate userId ─────────────────────────────────────────────────
    if (!isValidObjectId(userId)) {
      return NextResponse.json({ error: "Invalid user ID format." }, { status: 400 });
    }

    // ── 3. Parse and validate request body ────────────────────────────────
    let body: {
      planId?: PlanId;
      status?: SubscriptionStatus;
      billingPeriod?: BillingPeriod;
      currentPeriodEnd?: string | null;
      customLimits?: ICustomLimits;
      resetUsage?: boolean;
      notes?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    // Validate planId if provided
    const validPlans: PlanId[] = ["free_trial", "launch", "scale", "business", "customize"];
    if (body.planId && !validPlans.includes(body.planId)) {
      return NextResponse.json({ error: "Invalid planId value." }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses: SubscriptionStatus[] = ["active", "expired", "cancelled", "grace"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    // Validate billingPeriod if provided
    const validPeriods: BillingPeriod[] = ["monthly", "sixmonths", "yearly"];
    if (body.billingPeriod && !validPeriods.includes(body.billingPeriod)) {
      return NextResponse.json({ error: "Invalid billingPeriod value." }, { status: 400 });
    }

    // Validate currentPeriodEnd if provided (must be a valid date string or null)
    if (body.currentPeriodEnd !== undefined && body.currentPeriodEnd !== null) {
      const parsed = new Date(body.currentPeriodEnd);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid currentPeriodEnd date format. Use ISO 8601 string." },
          { status: 400 }
        );
      }
    }

    // ── 4. Verify user exists and is admin-role ────────────────────────────
    const userExists = await User.exists({ _id: userId, role: "admin" });
    if (!userExists) {
      return NextResponse.json(
        { error: "Admin user not found." },
        { status: 404 }
      );
    }

    // ── 5. Find the subscription (must exist) ─────────────────────────────
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No subscription found for this user. " +
            "The user may not have completed OTP verification yet.",
        },
        { status: 404 }
      );
    }

    // ── 6. Apply the updates ───────────────────────────────────────────────
    if (body.planId !== undefined) {
      subscription.planId = body.planId;

      // When changing away from free_trial, clear the trial date
      if (body.planId !== "free_trial") {
        subscription.trialEndsAt = null;
      }

      // When setting to free_trial, clear currentPeriodEnd
      if (body.planId === "free_trial") {
        subscription.currentPeriodEnd = null;
      }
    }

    if (body.status !== undefined) {
      subscription.status = body.status;
    }

    if (body.billingPeriod !== undefined) {
      subscription.billingPeriod = body.billingPeriod;
    }

    if (body.currentPeriodEnd !== undefined) {
      subscription.currentPeriodEnd = body.currentPeriodEnd
        ? new Date(body.currentPeriodEnd)
        : null;
    }

    // Custom limits — only meaningful for "customize" plan but stored regardless
    if (body.customLimits !== undefined) {
      subscription.customLimits = body.customLimits;
    }

    // Reset monthly usage counter (e.g., after upgrading a user manually)
    if (body.resetUsage === true) {
      subscription.invoicesUsedThisMonth = 0;
    }

    await subscription.save();

    // ── 7. Return the updated subscription ────────────────────────────────
    return NextResponse.json(
      {
        message: "Subscription updated successfully.",
        subscription: {
          id:                   String(subscription._id),
          planId:               subscription.planId,
          planName:             PLAN_NAMES[subscription.planId as PlanId],
          billingPeriod:        subscription.billingPeriod,
          status:               subscription.status,
          startDate:            subscription.startDate.toISOString(),
          currentPeriodEnd:     subscription.currentPeriodEnd
            ? subscription.currentPeriodEnd.toISOString()
            : null,
          trialEndsAt:          subscription.trialEndsAt
            ? subscription.trialEndsAt.toISOString()
            : null,
          invoicesUsedThisMonth: subscription.invoicesUsedThisMonth,
          invoicesUsedTotal:     subscription.invoicesUsedTotal,
          invoiceCountResetAt:  subscription.invoiceCountResetAt.toISOString(),
          customLimits:         subscription.customLimits ?? null,
          updatedAt:            subscription.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/admin/users/[userId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}