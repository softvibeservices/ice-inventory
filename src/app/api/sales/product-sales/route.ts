// src/app/api/sales/product-sales/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProductSalesLog from "@/models/ProductSalesLog";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");     // "YYYY-MM-DD"
    const to = searchParams.get("to");         // "YYYY-MM-DD"
    const groupBy = searchParams.get("groupBy") || "product"; // "product" | "date" | "month"
    const productId = searchParams.get("productId") || null;   // optional filter

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    await connectDB();

    const userObjId = new mongoose.Types.ObjectId(userId);
    const matchStage: any = { userId: userObjId };

    if (from || to) {
      matchStage.soldDate = {};
      if (from) matchStage.soldDate.$gte = new Date(from + "T00:00:00.000Z");
      if (to)   matchStage.soldDate.$lte = new Date(to   + "T23:59:59.999Z");
    }

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      matchStage["items.productId"] = new mongoose.Types.ObjectId(productId);
    }

    // Aggregation: unwind items, group by product + date/month
    const pipeline: any[] = [
      { $match: matchStage },
      { $unwind: "$items" },
      // re-match productId filter on unwound items
      ...(productId ? [{ $match: { "items.productId": new mongoose.Types.ObjectId(productId) } }] : []),
      {
        $group: {
          _id: {
            productId: "$items.productId",
            productName: "$items.productName",
            category: "$items.category",
            unit: "$items.unit",
            date: groupBy === "month"
              ? { $dateToString: { format: "%Y-%m", date: "$soldDate" } }
              : { $dateToString: { format: "%Y-%m-%d", date: "$soldDate" } },
          },
          totalQuantity: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: "$orderTotal" },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productName: "$_id.productName",
          category: "$_id.category",
          unit: "$_id.unit",
          date: "$_id.date",
          totalQuantity: 1,
          orderCount: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { date: -1, productName: 1 } },
    ];

    const rows = await ProductSalesLog.aggregate(pipeline);

    // Also return a product-level summary (total sold per product across the date range)
    const summaryPipeline: any[] = [
      { $match: matchStage },
      { $unwind: "$items" },
      ...(productId ? [{ $match: { "items.productId": new mongoose.Types.ObjectId(productId) } }] : []),
      {
        $group: {
          _id: {
            productId: "$items.productId",
            productName: "$items.productName",
            category: "$items.category",
            unit: "$items.unit",
          },
          totalQuantity: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productName: "$_id.productName",
          category: "$_id.category",
          unit: "$_id.unit",
          totalQuantity: 1,
          orderCount: 1,
        },
      },
      { $sort: { totalQuantity: -1 } },
    ];

    const summary = await ProductSalesLog.aggregate(summaryPipeline);

    return NextResponse.json({ rows, summary }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/sales/product-sales error:", err);
    return NextResponse.json({ error: "Failed to fetch product sales" }, { status: 500 });
  }
}