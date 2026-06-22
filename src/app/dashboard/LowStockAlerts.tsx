// src/app/dashboard/LowStockAlerts.tsx
"use client";

import { useMemo, useState } from "react";
import { 
  AlertTriangle, 
  Package, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import type { Product } from "./types";

interface LowStockAlertsProps {
  products: Product[];
  loading: boolean;
}

export default function LowStockAlerts({
  products,
  loading,
}: LowStockAlertsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "low">("all");

  const ITEMS_PER_PAGE = 12;

  // Calculate severity
  const getSeverity = (product: Product): "critical" | "low" | "ok" => {
    if (product.minStock === undefined || product.minStock === 0) return "ok";
    
    const percentage = (product.quantity / product.minStock) * 100;
    
    if (product.quantity === 0) return "critical";
    if (percentage <= 50) return "critical";
    if (percentage < 100) return "low";
    return "ok";
  };

  // Filter low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const hasMinStock = p.minStock !== undefined && p.minStock > 0;
      const isLowStock = hasMinStock && p.quantity < (p.minStock ?? 0); // ✅ Added null coalescing
      return isLowStock;
    });
  }, [products]);

  // Apply search and severity filter
  const filteredProducts = useMemo(() => {
    return lowStockProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      
      if (severityFilter === "all") return true;
      
      const severity = getSeverity(p);
      return severity === severityFilter;
    });
  }, [lowStockProducts, searchTerm, severityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = showAll
    ? filteredProducts
    : filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );

  // Reset page on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, severityFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Statistics
  const criticalCount = lowStockProducts.filter(
    (p) => getSeverity(p) === "critical"
  ).length;
  const lowCount = lowStockProducts.filter(
    (p) => getSeverity(p) === "low"
  ).length;

  // Helper functions
  const getStockPercentage = (product: Product): number => {
    if (!product.minStock || product.minStock === 0) return 100;
    return Math.min(100, (product.quantity / product.minStock) * 100);
  };

  const getSeverityColor = (severity: "critical" | "low" | "ok") => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-red-50",
          border: "border-red-300",
          text: "text-red-900",
          badge: "bg-red-600",
          progressBg: "bg-red-100",
          progressFill: "bg-red-500",
        };
      case "low":
        return {
          bg: "bg-amber-50",
          border: "border-amber-300",
          text: "text-amber-900",
          badge: "bg-amber-600",
          progressBg: "bg-amber-100",
          progressFill: "bg-amber-500",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-300",
          text: "text-gray-900",
          badge: "bg-gray-600",
          progressBg: "bg-gray-100",
          progressFill: "bg-gray-500",
        };
    }
  };

  return (
    <div className="saas-card">
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-10 rounded-xl w-2/3" />
          <div className="flex gap-3">
            <div className="skeleton h-20 rounded-xl flex-1" />
            <div className="skeleton h-20 rounded-xl flex-1" />
            <div className="skeleton h-20 rounded-xl flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            {/* Title and Stats */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700">
                    Low Stock Alerts
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Products running low on inventory
                  </p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="flex gap-2 sm:gap-3">
                <div className="stat-card flex-1 sm:flex-none" style={{ padding: '10px 14px' }}>
                  <div className="stat-icon-wrap stat-icon-red" style={{ width: 30, height: 30 }}>
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <p className="stat-label" style={{ fontSize: '10px' }}>Critical</p>
                    <p className="stat-value" style={{ fontSize: '16px', color: '#b91c1c' }}>{criticalCount}</p>
                  </div>
                </div>
                <div className="stat-card flex-1 sm:flex-none" style={{ padding: '10px 14px' }}>
                  <div className="stat-icon-wrap stat-icon-amber" style={{ width: 30, height: 30 }}>
                    <TrendingDown size={14} />
                  </div>
                  <div>
                    <p className="stat-label" style={{ fontSize: '10px' }}>Low</p>
                    <p className="stat-value" style={{ fontSize: '16px', color: '#b45309' }}>{lowCount}</p>
                  </div>
                </div>
                <div className="stat-card flex-1 sm:flex-none" style={{ padding: '10px 14px' }}>
                  <div className="stat-icon-wrap stat-icon-slate" style={{ width: 30, height: 30 }}>
                    <Package size={14} />
                  </div>
                  <div>
                    <p className="stat-label" style={{ fontSize: '10px' }}>Total</p>
                    <p className="stat-value" style={{ fontSize: '16px' }}>{lowStockProducts.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by product or category..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
                />
              </div>

              {/* Severity Filter */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSeverityFilter("all")}
                  className={`btn btn-sm ${
                    severityFilter === "all" ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSeverityFilter("critical")}
                  className={`btn btn-sm ${
                    severityFilter === "critical" ? "btn-danger" : "btn-secondary"
                  }`}
                >
                  Critical
                </button>
                <button
                  onClick={() => setSeverityFilter("low")}
                  className={`btn btn-sm ${
                    severityFilter === "low" ? "btn-warning" : "btn-secondary"
                  }`}
                >
                  Low
                </button>
              </div>

              {filteredProducts.length > 0 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="btn btn-sm btn-secondary"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showAll ? "Show Pages" : "View All"}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center bg-green-50 rounded-xl border-2 border-dashed border-green-200">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-green-700 mb-2">
                {searchTerm || severityFilter !== "all"
                  ? "No matching products"
                  : "All stock levels are healthy! 🎉"}
              </p>
              <p className="text-xs sm:text-sm text-green-600 max-w-md">
                {searchTerm || severityFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No products are currently running low on stock"}
              </p>
            </div>
          ) : (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {paginatedProducts.map((product) => {
                  const severity = getSeverity(product);
                  const colors = getSeverityColor(severity);
                  const percentage = getStockPercentage(product);

                  return (
                    <div
                      key={product._id}
                      className={`${colors.bg} ${colors.border} border-2 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all duration-200`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-sm sm:text-base font-bold ${colors.text} truncate`}
                            title={product.name}
                          >
                            {product.name}
                          </h3>
                          {product.category && (
                            <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                              {product.category}
                            </p>
                          )}
                        </div>
                        <span
                          className={`${colors.badge} text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1`}
                        >
                          {severity === "critical" ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {severity === "critical" ? "CRITICAL" : "LOW"}
                        </span>
                      </div>

                      {/* Stock Info */}
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Current Stock:</span>
                          <span className={`text-sm sm:text-base font-bold ${colors.text}`}>
                            {product.quantity} {product.unit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Min Required:</span>
                          <span className="text-sm sm:text-base font-semibold text-gray-700">
                            {product.minStock ?? 0} {product.unit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Shortage:</span>
                          <span className="text-sm sm:text-base font-semibold text-red-600">
                            {Math.max(0, (product.minStock ?? 0) - product.quantity)} {product.unit}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] sm:text-xs font-medium text-gray-600">
                            Stock Level
                          </span>
                          <span className={`text-xs sm:text-sm font-bold ${colors.text}`}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`w-full ${colors.progressBg} rounded-full h-2 overflow-hidden`}>
                          <div
                            className={`${colors.progressFill} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      {product.packUnit && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                          <p className="text-[10px] sm:text-xs text-gray-600">
                            Pack Unit: <span className="font-medium">{product.packUnit}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {!showAll && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white shadow-md"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Info Footer */}
          {lowStockProducts.length > 0 && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[10px] sm:text-xs text-blue-800 leading-relaxed">
                <strong>💡 Tip:</strong> Stock levels below minimum threshold are shown here. 
                Critical items (≤50% or out of stock) need immediate attention. 
                Update your stock regularly to avoid running out of popular products.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}