// src/app/dashboard/MostPopularProducts.tsx
"use client";

import { useState, useEffect } from "react";
import { Package, TrendingUp, Calendar, Clock } from "lucide-react";

interface ProductSale {
  _id: string;
  name: string;
  category?: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export default function MostPopularProducts() {
  const [timeframe, setTimeframe] = useState<"day" | "month">("day");
  const [products, setProducts] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularProducts();
  }, [timeframe]);

  const fetchPopularProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/sales/product-sales?period=${timeframe === "day" ? "today" : "month"}`
      );
      if (response.ok) {
        const data = await response.json();
        // Sort by quantity and take top 5
        const sorted = data.sales
          .sort((a: ProductSale, b: ProductSale) => b.totalQuantity - a.totalQuantity)
          .slice(0, 5);
        setProducts(sorted);
      }
    } catch (error) {
      console.error("Error fetching popular products:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Most Popular Products</h2>
            <p className="text-sm text-gray-500">Top selling items</p>
          </div>
        </div>

        {/* Timeframe Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTimeframe("day")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeframe === "day"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            Today
          </button>
          <button
            onClick={() => setTimeframe("month")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeframe === "month"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            This Month
          </button>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No sales data available for this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div
              key={product._id}
              className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              {/* Rank Badge */}
              <div
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm ${
                  index === 0
                    ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-md"
                    : index === 1
                    ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md"
                    : index === 2
                    ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                #{index + 1}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {product.category && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
                      {product.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{product.orderCount} orders</span>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="font-bold text-gray-900">{product.totalQuantity} units</div>
                <div className="text-sm text-gray-500">{formatCurrency(product.totalRevenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {!loading && products.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Units Sold</span>
            <span className="font-semibold text-gray-900">
              {products.reduce((sum, p) => sum + p.totalQuantity, 0)} units
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Total Revenue</span>
            <span className="font-semibold text-purple-600">
              {formatCurrency(products.reduce((sum, p) => sum + p.totalRevenue, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}