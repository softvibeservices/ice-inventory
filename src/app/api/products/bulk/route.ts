// src/app/api/products/bulk/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import { verifyUserRequest } from "@/lib/userAuth";

// ── BUG FIX (Bug 1): Import checkProductLimit so bulk upload respects plan limits
import { checkProductLimit } from "@/lib/subscriptionGuard";

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Products array is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ─── BUG FIX (Bug 1): Bulk product limit guard ───────────────────────
    // The single-product POST at /api/products correctly calls
    // checkProductLimit, but bulk upload previously skipped this check
    // entirely, allowing unlimited products to be imported regardless of
    // the user's plan. This fix enforces the same limit for bulk uploads.
    //
    // We check BEFORE validating individual items so we fail fast if the
    // batch would exceed the plan limit even if every item were valid.
    const currentCount = await Product.countDocuments({
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    const productCheck = await checkProductLimit(auth.userId, currentCount);

    if (!productCheck.allowed) {
      return NextResponse.json(
        {
          error:
            productCheck.limit === 0
              ? "Your subscription has expired. Please renew your plan to add products."
              : `You have reached your product limit (${productCheck.used}/${productCheck.limit}). Upgrade your plan to add more products.`,
          upgradeRequired: true,
          used: productCheck.used,
          limit: productCheck.limit,
        },
        { status: 403 }
      );
    }

    // If the plan has a finite product limit, also check that this batch
    // won't overshoot it. A user with 45/50 products should not be able
    // to bulk-import 20 products at once.
    if (productCheck.limit !== null) {
      const remaining = productCheck.limit - currentCount;
      if (products.length > remaining) {
        return NextResponse.json(
          {
            error: `This batch would exceed your product limit. You can add ${remaining} more product(s) on your current plan (${currentCount}/${productCheck.limit} used).`,
            upgradeRequired: true,
            used: currentCount,
            limit: productCheck.limit,
            canAdd: remaining,
          },
          { status: 403 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const validatedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (!product.name || !product.name.trim()) {
        errors.push({ index: i, field: "name", message: "Product name required" });
        continue;
      }
      if (!product.unit) {
        errors.push({ index: i, field: "unit", message: "Unit required" });
        continue;
      }
      if (
        product.sellingPrice === undefined ||
        product.sellingPrice === null ||
        product.sellingPrice <= 0
      ) {
        errors.push({ index: i, field: "sellingPrice", message: "Valid selling price required" });
        continue;
      }
      if (
        product.quantity === undefined ||
        product.quantity === null ||
        product.quantity < 0
      ) {
        errors.push({ index: i, field: "quantity", message: "Valid quantity required" });
        continue;
      }

      validatedProducts.push({
        // Always use auth.userId — never trust userId from the payload
        userId: new mongoose.Types.ObjectId(auth.userId),
        name: product.name.trim(),
        category: product.category?.trim() || undefined,
        unit: product.unit,
        packQuantity: product.packQuantity || undefined,
        packUnit: product.packUnit || undefined,
        sellingPrice: Number(product.sellingPrice),
        mrp: product.mrp ? Number(product.mrp) : undefined,
        quantity: Number(product.quantity),
        minStock: product.minStock ? Number(product.minStock) : undefined,
        notes: product.notes?.trim() || undefined,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validatedProducts.length,
          errorCount: errors.length,
        },
        { status: 400 }
      );
    }

    const result = await Product.insertMany(validatedProducts, { ordered: false });

    return NextResponse.json(
      { success: true, inserted: result.length, products: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bulk product insert error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate products found", details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to insert products", details: error.message },
      { status: 500 }
    );
  }
}