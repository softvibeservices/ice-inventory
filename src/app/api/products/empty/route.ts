// icecream-inventory/src/app/api/products/empty/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import RestockHistory from "@/models/RestockHistory";

/**
 * POST /api/products/empty
 * Body: { userId: string }
 *
 * - Saves an audit RestockHistory record (note: "Empty Stock") capturing previous quantities.
 * - Sets all products' quantity to 0 for the provided userId.
 *
 * Returns JSON in all cases (no HTML).
 */

// Allow OPTIONS for CORS/preflight in case it's needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body || {};

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    await connectDB();

    // fetch all products for the user
    const products = await Product.find({ userId }).lean();

    if (!products || products.length === 0) {
      // nothing to empty — return success but note that no products were found
      return NextResponse.json(
        { message: "No products found for user", emptied: false },
        { status: 200 }
      );
    }

    // prepare history items with the quantities that will be removed
    const historyItems = products.map((p: any) => ({
      productId: p._id?.toString?.() ?? String(p._id),
      name: p.name,
      category: p.category ?? "",
      unit: p.unit ?? "piece",
      quantity: p.quantity ?? 0, // quantity removed (previous quantity)
      note: "Empty Stock",
    }));

    // set all quantities to 0 in one efficient operation
    await Product.updateMany({ userId }, { $set: { quantity: 0 } });

    // save a restock history record (audit trail)
    try {
      await RestockHistory.create({
        userId,
        items: historyItems,
      });
    } catch (historyErr) {
      // non-fatal: product quantities are already zeroed; return warning
      return NextResponse.json(
        {
          message: "All product quantities set to 0, but failed to record history",
          emptied: true,
          historyError: (historyErr instanceof Error ? historyErr.message : String(historyErr)),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "All product quantities set to 0", emptied: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// helpful GET for quick diagnostics (returns 405, but JSON)
export async function GET() {
  return NextResponse.json({ error: "Use POST to empty products (POST body: { userId })" }, { status: 405 });
}
