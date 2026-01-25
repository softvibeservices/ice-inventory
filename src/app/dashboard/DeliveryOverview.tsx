// src/app/dashboard/DeliveryOverview.tsx
"use client";

import { useMemo, useState } from "react";
import { Truck, CheckCircle, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { Order } from "./types";

interface DeliveryOverviewProps {
  orders: Order[];
  loadingOrders: boolean;
}

export default function DeliveryOverview({
  orders,
  loadingOrders,
}: DeliveryOverviewProps) {
  // ========= STATE =========
  const [pendingSearch, setPendingSearch] = useState("");
  const [unsettledSearch, setUnsettledSearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [unsettledPage, setUnsettledPage] = useState(1);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllUnsettled, setShowAllUnsettled] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // ========= DERIVED DATA =========
  const pendingOrOnTheWay = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way"
    );
  }, [orders]);

  const deliveredButUnsettled = useMemo(() => {
    return orders.filter(
      (o) => o.deliveryStatus === "Delivered" && o.status === "Unsettled"
    );
  }, [orders]);

  // ========= SEARCH & FILTER =========
  const filterOrders = (orderList: Order[], searchTerm: string) => {
    if (!searchTerm.trim()) return orderList;
    
    const term = searchTerm.toLowerCase().trim();
    return orderList.filter((o) => {
      const customerMatch = o.customerName?.toLowerCase().includes(term);
      const shopMatch = o.shopName?.toLowerCase().includes(term);
      const serialMatch = o.serialNumber?.toString().includes(term);
      return customerMatch || shopMatch || serialMatch;
    });
  };

  const filteredPending = useMemo(
    () => filterOrders(pendingOrOnTheWay, pendingSearch),
    [pendingOrOnTheWay, pendingSearch]
  );

  const filteredUnsettled = useMemo(
    () => filterOrders(deliveredButUnsettled, unsettledSearch),
    [deliveredButUnsettled, unsettledSearch]
  );

  // ========= PAGINATION =========
  const paginateData = (data: Order[], page: number, showAll: boolean) => {
    if (showAll) return data;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const paginatedPending = paginateData(filteredPending, pendingPage, showAllPending);
  const paginatedUnsettled = paginateData(filteredUnsettled, unsettledPage, showAllUnsettled);

  const pendingTotalPages = Math.ceil(filteredPending.length / ITEMS_PER_PAGE);
  const unsettledTotalPages = Math.ceil(filteredUnsettled.length / ITEMS_PER_PAGE);

  // ========= HELPERS =========
  const formatBillDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handlePendingPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pendingTotalPages) {
      setPendingPage(newPage);
    }
  };

  const handleUnsettledPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= unsettledTotalPages) {
      setUnsettledPage(newPage);
    }
  };

  // Reset to page 1 when search changes
  const handlePendingSearch = (value: string) => {
    setPendingSearch(value);
    setPendingPage(1);
  };

  const handleUnsettledSearch = (value: string) => {
    setUnsettledSearch(value);
    setUnsettledPage(1);
  };

  // ========= RENDER PAGINATION =========
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void,
    showAll: boolean,
    setShowAll: (show: boolean) => void,
    totalItems: number
  ) => {
    if (totalItems === 0) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
          >
            <Eye className="w-3.5 h-3.5" />
            {showAll ? `Show Pages (${totalItems})` : `View All (${totalItems})`}
          </button>
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-xs font-medium text-gray-600 min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ========= RENDER =========
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6">
      {loadingOrders ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs sm:text-sm text-gray-500">Loading delivery data…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* ========= PENDING / ON THE WAY ========= */}
          <div className="border border-blue-200 rounded-lg p-3 sm:p-4 bg-blue-50 flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 flex-1">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-blue-800">
                  Pending / On the Way
                </h3>
                <span className="ml-auto sm:ml-0 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                  {pendingOrOnTheWay.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={pendingSearch}
                onChange={(e) => handlePendingSearch(e.target.value)}
                placeholder="Search by shop, customer, or serial..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
              />
            </div>

            {/* Content */}
            {filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-blue-300 mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  {pendingSearch ? "No matching orders" : "No active deliveries"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {pendingSearch ? "Try a different search" : "All orders have been delivered"}
                </p>
              </div>
            ) : (
              <>
                <div 
                  className={`overflow-y-auto pr-1 sm:pr-2 ${
                    showAllPending ? 'max-h-[600px]' : 'max-h-[400px] sm:max-h-[450px]'
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#93c5fd #dbeafe'
                  }}
                >
                  <style>{`
                    .overflow-y-auto::-webkit-scrollbar {
                      width: 6px;
                    }
                    .overflow-y-auto::-webkit-scrollbar-track {
                      background: #dbeafe;
                      border-radius: 4px;
                    }
                    .overflow-y-auto::-webkit-scrollbar-thumb {
                      background: #93c5fd;
                      border-radius: 4px;
                    }
                    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                      background: #60a5fa;
                    }
                  `}</style>
                  <ul className="space-y-2 sm:space-y-3">
                    {paginatedPending.map((o) => (
                      <li
                        key={o._id}
                        className="bg-white border border-blue-200 rounded-lg px-3 py-2 sm:px-4 sm:py-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              {o.customerName}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                              {o.shopName}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                            {o.deliveryStatus}
                          </span>
                        </div>

                        <div className="text-[10px] sm:text-xs text-gray-600 space-y-0.5">
                          <p>
                            <span className="font-medium">Bill Date:</span>{" "}
                            {formatBillDate(o.createdAt)}
                          </p>
                          <p>
                            <span className="font-medium">Serial:</span> #{o.serialNumber}
                          </p>
                          <p>
                            <span className="font-medium">Amount:</span>{" "}
                            <span className="font-semibold text-gray-800">₹{o.total ?? 0}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pagination */}
                {renderPagination(
                  pendingPage,
                  pendingTotalPages,
                  handlePendingPageChange,
                  showAllPending,
                  setShowAllPending,
                  filteredPending.length
                )}
              </>
            )}
          </div>

          {/* ========= DELIVERED BUT UNSETTLED ========= */}
          <div className="border border-green-200 rounded-lg p-3 sm:p-4 bg-green-50 flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 flex-1">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-green-800">
                  Delivered but Unsettled
                </h3>
                <span className="ml-auto sm:ml-0 bg-green-600 text-white text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                  {deliveredButUnsettled.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={unsettledSearch}
                onChange={(e) => handleUnsettledSearch(e.target.value)}
                placeholder="Search by shop, customer, or serial..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
              />
            </div>

            {/* Content */}
            {filteredUnsettled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-300 mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  {unsettledSearch ? "No matching orders" : "All cleared! 🎉"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {unsettledSearch ? "Try a different search" : "All delivered orders are settled"}
                </p>
              </div>
            ) : (
              <>
                <div 
                  className={`overflow-y-auto pr-1 sm:pr-2 ${
                    showAllUnsettled ? 'max-h-[600px]' : 'max-h-[400px] sm:max-h-[450px]'
                  }`}
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#86efac #dcfce7'
                  }}
                >
                  <style>{`
                    .bg-green-50 .overflow-y-auto::-webkit-scrollbar {
                      width: 6px;
                    }
                    .bg-green-50 .overflow-y-auto::-webkit-scrollbar-track {
                      background: #dcfce7;
                      border-radius: 4px;
                    }
                    .bg-green-50 .overflow-y-auto::-webkit-scrollbar-thumb {
                      background: #86efac;
                      border-radius: 4px;
                    }
                    .bg-green-50 .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                      background: #4ade80;
                    }
                  `}</style>
                  <ul className="space-y-2 sm:space-y-3">
                    {paginatedUnsettled.map((o) => (
                      <li
                        key={o._id}
                        className="bg-white border border-green-200 rounded-lg px-3 py-2 sm:px-4 sm:py-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              {o.customerName}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                              {o.shopName}
                            </p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                            Unsettled
                          </span>
                        </div>

                        <div className="text-[10px] sm:text-xs text-gray-600 space-y-0.5">
                          <p>
                            <span className="font-medium">Bill Date:</span>{" "}
                            {formatBillDate(o.createdAt)}
                          </p>
                          <p>
                            <span className="font-medium">Serial:</span> #{o.serialNumber}
                          </p>
                          <p>
                            <span className="font-medium">Amount:</span>{" "}
                            <span className="font-semibold text-gray-800">₹{o.total ?? 0}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pagination */}
                {renderPagination(
                  unsettledPage,
                  unsettledTotalPages,
                  handleUnsettledPageChange,
                  showAllUnsettled,
                  setShowAllUnsettled,
                  filteredUnsettled.length
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}