// src/app/api/customers/bulk/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { verifyUserRequest } from "@/lib/userAuth";
import { checkCustomerLimit } from "@/lib/subscriptionGuard";

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { customers } = body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: "Customers array is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Enforce plan customer limit before inserting
    const currentCount = await Customer.countDocuments({
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    const customerCheck = await checkCustomerLimit(auth.userId, currentCount);

    if (!customerCheck.allowed) {
      return NextResponse.json(
        {
          error:
            customerCheck.limit === 0
              ? "Your subscription has expired. Please renew your plan to add customers."
              : `You have reached your customer limit (${customerCheck.used}/${customerCheck.limit}). Upgrade your plan to add more customers.`,
          upgradeRequired: true,
          used: customerCheck.used,
          limit: customerCheck.limit,
        },
        { status: 403 }
      );
    }

    // Check if this batch would exceed the plan limit
    if (customerCheck.limit !== null) {
      const remaining = customerCheck.limit - currentCount;
      if (customers.length > remaining) {
        return NextResponse.json(
          {
            error: `This batch would exceed your customer limit. You can add ${remaining} more customer(s) on your current plan (${currentCount}/${customerCheck.limit} used).`,
            upgradeRequired: true,
            used: currentCount,
            limit: customerCheck.limit,
            canAdd: remaining,
          },
          { status: 403 }
        );
      }
    }

    const validatedCustomers = [];
    const errors = [];

    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];

      // ── Required: Customer Name ────────────────────────────────────────────
      if (!c.name?.trim()) {
        errors.push({ index: i, field: "name", message: "Customer name required" });
        continue;
      }

      // ── Required: Contact 1 (primary contact) ─────────────────────────────
      const contacts = Array.isArray(c.contacts)
        ? c.contacts.map((x: string) => x.trim()).filter(Boolean)
        : [];

      if (contacts.length === 0 || !/^\d{6,15}$/.test(contacts[0].replace(/\s+/g, ""))) {
        errors.push({ index: i, field: "contacts", message: "Valid primary contact required (6-15 digits)" });
        continue;
      }

      // ── Required: Shop Name ────────────────────────────────────────────────
      if (!c.shopName?.trim()) {
        errors.push({ index: i, field: "shopName", message: "Shop name required" });
        continue;
      }

      // ── Required: Latitude ─────────────────────────────────────────────────
      const lat = c.location?.latitude;
      if (lat === undefined || lat === null) {
        errors.push({ index: i, field: "latitude", message: "Latitude is required" });
        continue;
      }
      const latNum = Number(lat);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.push({ index: i, field: "latitude", message: "Latitude must be between -90 and 90" });
        continue;
      }

      // ── Required: Longitude ────────────────────────────────────────────────
      const lng = c.location?.longitude;
      if (lng === undefined || lng === null) {
        errors.push({ index: i, field: "longitude", message: "Longitude is required" });
        continue;
      }
      const lngNum = Number(lng);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.push({ index: i, field: "longitude", message: "Longitude must be between -180 and 180" });
        continue;
      }

      // ── All validations passed — build the document ────────────────────────
      validatedCustomers.push({
        userId: new mongoose.Types.ObjectId(auth.userId),
        name: c.name.trim(),
        contacts,
        shopName: c.shopName.trim(),
        // shopAddress and area are now optional
        shopAddress: c.shopAddress?.trim() || "",
        area: c.area?.trim() || "",
        location: {
          latitude: latNum,
          longitude: lngNum,
        },
        remarks: c.remarks?.trim() || "",
        credit: Number(c.credit) || 0,
        debit: Number(c.debit) || 0,
        totalSales: 0,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validatedCustomers.length,
          errorCount: errors.length,
        },
        { status: 400 }
      );
    }

    const result = await Customer.insertMany(validatedCustomers, { ordered: false });

    return NextResponse.json(
      { success: true, inserted: result.length, customers: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bulk customer insert error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate customers found", details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}