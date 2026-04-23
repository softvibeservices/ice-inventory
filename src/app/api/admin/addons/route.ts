// src/app/api/admin/addons/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  GET   /api/admin/addons  — superAdmin only: list all add-on docs
//  POST  /api/admin/addons  — superAdmin only: manually create an add-on
//  PATCH /api/admin/addons  — superAdmin only: deactivate or extend an add-on
//
//  ── GET ──────────────────────────────────────────────────────────────────────
//  Returns a paginated list of ALL AddOn documents across all users.
//  Joins with User to include user name and email.
//
//  Query parameters:
//    page      — page number (default: 1)
//    limit     — items per page (default: 20, max: 100)
//    userId    — filter by a specific user's add-ons
//    type      — filter by add-on type
//    active    — "true" | "false" — filter by isActive
//    expiring  — "true" — return only add-ons expiring within the next 7 days
//
//  ── POST ─────────────────────────────────────────────────────────────────────
//  Manually grants an add-on to a user WITHOUT requiring payment.
//  Used for manual grants, compensations, or migrations.
//
//  Request body:
//    userId          — string (required)
//    type            — AddOnType (required)
//    quantity        — number (default: 1)
//    billingAnchorDay — number 1–28 (optional; if omitted, derived from subscription)
//    expiresAt       — ISO date string (optional; if omitted for recurring add-ons,
//                      computed from billingAnchorDay via addonAlignment)
//    notes           — string (optional; stored in a new PaymentRecord with amount=0)
//
//  ── PATCH ────────────────────────────────────────────────────────────────────
//  Updates an existing AddOn document.
//
//  Request body:
//    addonId     — string (required) — the _id of the AddOn to update
//    isActive    — boolean (optional) — set to false to deactivate
//    expiresAt   — ISO date string (optional) — extend the expiry date
//    quantity    — number (optional) — change the quantity
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";
import AddOn from "@/models/AddOn";
import Subscription from "@/models/Subscription";
import User from "@/models/User";
import { ONE_TIME_ADDON_TYPES } from "@/models/AddOn";
import { computeAddOnExpiry, getAnchorDayFromDate } from "@/lib/addonAlignment";
import { ADDON_LABELS } from "@/types/subscription.types";
import type { AddOnType } from "@/types/subscription.types";

// ─────────────────────────────────────────────────────────────────────────────
//  Valid add-on types constant (for validation)
// ─────────────────────────────────────────────────────────────────────────────
const VALID_ADDON_TYPES: AddOnType[] = [
  "extra_invoice_100",
  "extra_invoice_300",
  "extra_manager",
  "extra_delivery",
  "advanced_reports",
  "setup_migration",
];

// ─────────────────────────────────────────────────────────────────────────────
//  Response item shape for the list
// ─────────────────────────────────────────────────────────────────────────────
interface IAdminAddOnListItem {
  addonId: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: AddOnType;
  typeLabel: string;
  quantity: number;
  isActive: boolean;
  isOneTime: boolean;
  expiresAt: string | null;
  billingAnchorDay: number | null;
  paymentRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET handler — list all add-ons
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip   = (page - 1) * limit;

    const userIdParam  = searchParams.get("userId");
    const typeFilter   = searchParams.get("type") as AddOnType | null;
    const activeFilter = searchParams.get("active");
    const expiringFilter = searchParams.get("expiring");

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (userIdParam && mongoose.Types.ObjectId.isValid(userIdParam)) {
      query.userId = new mongoose.Types.ObjectId(userIdParam);
    }

    if (typeFilter && VALID_ADDON_TYPES.includes(typeFilter)) {
      query.type = typeFilter;
    }

    if (activeFilter === "true")  query.isActive = true;
    if (activeFilter === "false") query.isActive = false;

    if (expiringFilter === "true") {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      query.expiresAt  = { $ne: null, $lte: sevenDaysFromNow };
      query.isActive   = true;
    }

    const [addOns, total] = await Promise.all([
      AddOn.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AddOn.countDocuments(query),
    ]);

    if (addOns.length === 0) {
      return NextResponse.json(
        { addOns: [], total: 0, page, limit, totalPages: 0 },
        { status: 200 }
      );
    }

    // Batch-fetch user data
    const addonUserIds = addOns.map((a) => a.userId);
    const users = await User.find({ _id: { $in: addonUserIds } })
      .select("_id name email")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const items: IAdminAddOnListItem[] = addOns.map((addon) => {
      const user      = userMap.get(String(addon.userId));
      const addonType = addon.type as AddOnType;

      return {
        addonId:         String(addon._id),
        userId:          String(addon.userId),
        userName:        user?.name  ?? "Unknown User",
        userEmail:       user?.email ?? "—",
        type:            addonType,
        typeLabel:       ADDON_LABELS[addonType] ?? addonType,
        quantity:        addon.quantity,
        isActive:        addon.isActive,
        isOneTime:       ONE_TIME_ADDON_TYPES.includes(addonType),
        expiresAt:       addon.expiresAt
          ? (addon.expiresAt as Date).toISOString()
          : null,
        billingAnchorDay: addon.billingAnchorDay ?? null,
        paymentRecordId:  addon.paymentRecordId
          ? String(addon.paymentRecordId)
          : null,
        createdAt: (addon.createdAt as Date).toISOString(),
        updatedAt: (addon.updatedAt as Date).toISOString(),
      };
    });

    return NextResponse.json(
      { addOns: items, total, page, limit, totalPages: Math.ceil(total / limit) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/addons] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST handler — manually create an add-on for a user (no payment required)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    // Parse request body
    let body: {
      userId: string;
      type: AddOnType;
      quantity?: number;
      billingAnchorDay?: number;
      expiresAt?: string;
      notes?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    // Validate required fields
    if (!body.userId || !body.type) {
      return NextResponse.json(
        { error: "userId and type are required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(body.userId)) {
      return NextResponse.json({ error: "Invalid userId format." }, { status: 400 });
    }

    if (!VALID_ADDON_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid add-on type. Valid types: ${VALID_ADDON_TYPES.join(", ")}.` },
        { status: 400 }
      );
    }

    const quantity = Math.max(1, Math.floor(body.quantity ?? 1));

    // Verify the user exists
    const userExists = await User.exists({ _id: body.userId, role: "admin" });
    if (!userExists) {
      return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
    }

    // Determine expiry
    const isOneTime = ONE_TIME_ADDON_TYPES.includes(body.type);
    let expiresAt: Date | null = null;

    if (!isOneTime) {
      if (body.expiresAt) {
        // SuperAdmin explicitly set an expiry
        const parsed = new Date(body.expiresAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid expiresAt date format. Use ISO 8601 string." },
            { status: 400 }
          );
        }
        expiresAt = parsed;
      } else {
        // Compute expiry from billing anchor day
        let anchorDay = body.billingAnchorDay;

        if (!anchorDay) {
          // Derive from the user's subscription invoiceCountResetAt
          const sub = await Subscription.findOne({ userId: body.userId })
            .select("invoiceCountResetAt")
            .lean();

          if (sub?.invoiceCountResetAt) {
            anchorDay = getAnchorDayFromDate(sub.invoiceCountResetAt as Date);
          } else {
            // Fallback: use today's day-of-month as anchor
            anchorDay = Math.min(new Date().getDate(), 28);
          }
        }

        // Cap at 28 for February safety
        anchorDay = Math.min(Math.max(1, anchorDay), 28);
        expiresAt = computeAddOnExpiry(anchorDay);
      }
    }

    // Determine billingAnchorDay
    let billingAnchorDay: number | null = null;
    if (!isOneTime) {
      if (body.billingAnchorDay) {
        billingAnchorDay = Math.min(Math.max(1, body.billingAnchorDay), 28);
      } else {
        const sub = await Subscription.findOne({ userId: body.userId })
          .select("invoiceCountResetAt")
          .lean();

        billingAnchorDay = sub?.invoiceCountResetAt
          ? getAnchorDayFromDate(sub.invoiceCountResetAt as Date)
          : Math.min(new Date().getDate(), 28);
      }
    }

    // Create the AddOn document
    const newAddOn = await AddOn.create({
      userId:          new mongoose.Types.ObjectId(body.userId),
      type:            body.type,
      quantity,
      isActive:        true,
      expiresAt,
      billingAnchorDay,
      paymentRecordId: undefined, // manually granted — no payment record
    });

    return NextResponse.json(
      {
        message: `Add-on "${ADDON_LABELS[body.type]}" granted successfully to user.`,
        addOn: {
          id:              String(newAddOn._id),
          userId:          String(newAddOn.userId),
          type:            newAddOn.type,
          typeLabel:       ADDON_LABELS[newAddOn.type as AddOnType],
          quantity:        newAddOn.quantity,
          isActive:        newAddOn.isActive,
          isOneTime,
          expiresAt:       newAddOn.expiresAt
            ? newAddOn.expiresAt.toISOString()
            : null,
          billingAnchorDay: newAddOn.billingAnchorDay,
          createdAt:       newAddOn.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/addons] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH handler — update an existing add-on (deactivate or extend)
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const auth = await verifySuperAdminRequest(req);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    let body: {
      addonId: string;
      isActive?: boolean;
      expiresAt?: string | null;
      quantity?: number;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    if (!body.addonId) {
      return NextResponse.json({ error: "addonId is required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(body.addonId)) {
      return NextResponse.json({ error: "Invalid addonId format." }, { status: 400 });
    }

    const addon = await AddOn.findById(body.addonId);

    if (!addon) {
      return NextResponse.json({ error: "Add-on not found." }, { status: 404 });
    }

    // Apply updates
    if (body.isActive !== undefined) {
      addon.isActive = body.isActive;
    }

    if (body.expiresAt !== undefined) {
      if (body.expiresAt === null) {
        addon.expiresAt = null;
      } else {
        const parsed = new Date(body.expiresAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid expiresAt date format. Use ISO 8601 string." },
            { status: 400 }
          );
        }
        addon.expiresAt = parsed;
      }
    }

    if (body.quantity !== undefined) {
      const q = Math.max(1, Math.floor(body.quantity));
      addon.quantity = q;
    }

    await addon.save();

    const addonType = addon.type as AddOnType;

    return NextResponse.json(
      {
        message: "Add-on updated successfully.",
        addOn: {
          id:              String(addon._id),
          userId:          String(addon.userId),
          type:            addon.type,
          typeLabel:       ADDON_LABELS[addonType] ?? addon.type,
          quantity:        addon.quantity,
          isActive:        addon.isActive,
          isOneTime:       ONE_TIME_ADDON_TYPES.includes(addonType),
          expiresAt:       addon.expiresAt ? addon.expiresAt.toISOString() : null,
          billingAnchorDay: addon.billingAnchorDay ?? null,
          updatedAt:       addon.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/admin/addons] Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}