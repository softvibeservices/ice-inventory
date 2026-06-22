// src/app/dashboard/DeliveryOverview.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  CheckCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { Order } from "./types";

interface DeliveryOverviewProps {
  orders: Order[];
  loadingOrders: boolean;
}

export default function DeliveryOverview({
  orders,
  loadingOrders,
}: DeliveryOverviewProps) {
  const router = useRouter();

  // ========= STATE =========
  const [unsettledPendingSearch, setUnsettledPendingSearch] = useState("");
  const [debtPendingSearch, setDebtPendingSearch] = useState("");
  const [deliveredUnsettledSearch, setDeliveredUnsettledSearch] = useState("");

  const [unsettledPendingPage, setUnsettledPendingPage] = useState(1);
  const [debtPendingPage, setDebtPendingPage] = useState(1);
  const [deliveredUnsettledPage, setDeliveredUnsettledPage] = useState(1);

  const [showAllUnsettledPending, setShowAllUnsettledPending] = useState(false);
  const [showAllDebtPending, setShowAllDebtPending] = useState(false);
  const [showAllDeliveredUnsettled, setShowAllDeliveredUnsettled] =
    useState(false);

  const ITEMS_PER_PAGE = 8;

  // ========= DERIVED DATA =========
  const activeOrders = useMemo(() => {
    return orders.filter((o) => !o.discardedAt);
  }, [orders]);

  const unsettledPendingOrOnTheWay = useMemo(() => {
    return activeOrders.filter(
      (o) =>
        o.status === "Unsettled" &&
        (o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way")
    );
  }, [activeOrders]);

  const debtPendingOrOnTheWay = useMemo(() => {
    return activeOrders.filter(
      (o) =>
        o.status === "settled" &&
        o.settlementMethod === "Debt" &&
        (o.deliveryStatus === "Pending" || o.deliveryStatus === "On the Way")
    );
  }, [activeOrders]);

  const deliveredButUnsettled = useMemo(() => {
    return activeOrders.filter(
      (o) =>
        o.deliveryStatus === "Delivered" &&
        (o.status === "Unsettled" ||
          (o.status === "settled" && o.settlementMethod === "Debt"))
    );
  }, [activeOrders]);

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

  const filteredUnsettledPending = useMemo(
    () => filterOrders(unsettledPendingOrOnTheWay, unsettledPendingSearch),
    [unsettledPendingOrOnTheWay, unsettledPendingSearch]
  );

  const filteredDebtPending = useMemo(
    () => filterOrders(debtPendingOrOnTheWay, debtPendingSearch),
    [debtPendingOrOnTheWay, debtPendingSearch]
  );

  const filteredDeliveredUnsettled = useMemo(
    () => filterOrders(deliveredButUnsettled, deliveredUnsettledSearch),
    [deliveredButUnsettled, deliveredUnsettledSearch]
  );

  // ========= PAGINATION =========
  const paginateData = (data: Order[], page: number, showAll: boolean) => {
    if (showAll) return data;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const paginatedUnsettledPending = paginateData(
    filteredUnsettledPending,
    unsettledPendingPage,
    showAllUnsettledPending
  );
  const paginatedDebtPending = paginateData(
    filteredDebtPending,
    debtPendingPage,
    showAllDebtPending
  );
  const paginatedDeliveredUnsettled = paginateData(
    filteredDeliveredUnsettled,
    deliveredUnsettledPage,
    showAllDeliveredUnsettled
  );

  const unsettledPendingTotalPages = Math.ceil(
    filteredUnsettledPending.length / ITEMS_PER_PAGE
  );
  const debtPendingTotalPages = Math.ceil(
    filteredDebtPending.length / ITEMS_PER_PAGE
  );
  const deliveredUnsettledTotalPages = Math.ceil(
    filteredDeliveredUnsettled.length / ITEMS_PER_PAGE
  );

  // ========= HELPERS =========
  const formatBillDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePageChange = (
    setter: (page: number) => void,
    currentPage: number,
    totalPages: number,
    newPage: number
  ) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setter(newPage);
    }
  };

  const handleSearch = (
    setter: (value: string) => void,
    pageSetter: (page: number) => void,
    value: string
  ) => {
    setter(value);
    pageSetter(1);
  };

  // ========= NAVIGATE TO ORDER =========
  const handleViewOrder = (order: Order) => {
    router.push(`/dashboard/orders?orderId=${order._id}`);
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
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showAll ? `Pages (${totalItems})` : `All (${totalItems})`}
          </button>
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-medium text-gray-600 min-w-[60px] text-center">
              {currentPage}/{totalPages}
            </span>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ========= RENDER CARD =========
  const renderOrderCard = (o: Order, showPaymentStatus: boolean = false) => {
    const paid =
      typeof o.settlementAmount === "number" ? o.settlementAmount : 0;
    const remaining = Math.max(0, (o.total || 0) - paid);

    const deliveryStatusBadge = o.deliveryStatus === "Delivered"
      ? "badge badge-green"
      : o.deliveryStatus === "On the Way"
      ? "badge badge-blue"
      : "badge badge-amber";

    return (
      <li
        key={o._id}
        className="bg-white border border-white/80 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
      >
        {/* Top row: customer info + delivery status badge + view button */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
              {o.customerName}
            </p>
            <p className="text-[10px] font-medium text-gray-500 truncate mt-0.5">
              {o.shopName}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={deliveryStatusBadge} style={{ fontSize: '10px', padding: '2px 7px' }}>
              {o.deliveryStatus}
            </span>
            <button
              onClick={() => handleViewOrder(o)}
              title="View order details"
              className="tap-target w-6 h-6 rounded-lg bg-slate-800 hover:bg-blue-600 text-white transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-500">
          <span>#{o.serialNumber}</span>
          <span>{formatBillDate(o.createdAt)}</span>
          <span className="font-semibold text-gray-800">{formatCurrency(o.total)}</span>
          {showPaymentStatus && (
            <>
              <span className="text-green-600 font-medium">Pd: {formatCurrency(paid)}</span>
              <span className="text-amber-600 font-medium">Rem: {formatCurrency(remaining)}</span>
            </>
          )}
        </div>
      </li>
    );
  };

  // ========= RENDER BOX =========
  const renderBox = (
    title: string,
    icon: React.ReactNode,
    count: number,
    searchValue: string,
    onSearchChange: (value: string) => void,
    filteredData: Order[],
    paginatedData: Order[],
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void,
    showAll: boolean,
    setShowAll: (show: boolean) => void,
    showPaymentStatus: boolean,
    bgColor: string,
    borderColor: string,
    badgeColor: string,
    emptyIcon: React.ReactNode,
    emptyText: string,
    searchPlaceholder: string
  ) => {
    return (
      <div
        className={`border ${borderColor} rounded-xl p-3 sm:p-4 ${bgColor} flex flex-col h-full`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {title}
            </h3>
          </div>
          <span
            className={`flex-shrink-0 ${badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}
          >
            {count}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-7 sm:pl-8 pr-2 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
          />
        </div>

        {/* Content */}
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 flex-1">
            {emptyIcon}
            <p className="text-[10px] sm:text-xs text-gray-600 font-medium text-center">
              {searchValue ? "No matches" : emptyText}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`overflow-y-auto pr-1 flex-1 ${
                showAll ? "max-h-[500px]" : "max-h-[320px] sm:max-h-[350px]"
              }`}
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
              }}
            >
              <style>{`
                .overflow-y-auto::-webkit-scrollbar {
                  width: 4px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                  background: #f1f5f9;
                  border-radius: 4px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 4px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
              <ul className="space-y-1.5 sm:space-y-2">
                {paginatedData.map((o) =>
                  renderOrderCard(o, showPaymentStatus)
                )}
              </ul>
            </div>

            {/* Pagination */}
            {renderPagination(
              currentPage,
              totalPages,
              onPageChange,
              showAll,
              setShowAll,
              filteredData.length
            )}
          </>
        )}
      </div>
    );
  };

  // ========= RENDER =========
  return (
    <div className="saas-card saas-card-flush">
      {loadingOrders ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 p-4">
          {/* ========= BOX 1: UNSETTLED PENDING / ON THE WAY ========= */}
          {renderBox(
            "Unsettled Pending",
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4 lg:h-4 text-blue-600 flex-shrink-0" />,
            unsettledPendingOrOnTheWay.length,
            unsettledPendingSearch,
            (value) =>
              handleSearch(
                setUnsettledPendingSearch,
                setUnsettledPendingPage,
                value
              ),
            filteredUnsettledPending,
            paginatedUnsettledPending,
            unsettledPendingPage,
            unsettledPendingTotalPages,
            (page) =>
              handlePageChange(
                setUnsettledPendingPage,
                unsettledPendingPage,
                unsettledPendingTotalPages,
                page
              ),
            showAllUnsettledPending,
            setShowAllUnsettledPending,
            false,
            "bg-blue-50",
            "border-blue-200",
            "bg-blue-600",
            <Truck className="w-10 h-10 sm:w-12 sm:h-12 text-blue-300 mb-2" />,
            "No unsettled pending",
            "Search..."
          )}

          {/* ========= BOX 2: DEBT PENDING / ON THE WAY ========= */}
          {renderBox(
            "Debt Pending",
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4 lg:h-4 text-amber-600 flex-shrink-0" />,
            debtPendingOrOnTheWay.length,
            debtPendingSearch,
            (value) =>
              handleSearch(setDebtPendingSearch, setDebtPendingPage, value),
            filteredDebtPending,
            paginatedDebtPending,
            debtPendingPage,
            debtPendingTotalPages,
            (page) =>
              handlePageChange(
                setDebtPendingPage,
                debtPendingPage,
                debtPendingTotalPages,
                page
              ),
            showAllDebtPending,
            setShowAllDebtPending,
            true,
            "bg-amber-50",
            "border-amber-200",
            "bg-amber-600",
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 mb-2" />,
            "No debt pending",
            "Search..."
          )}

          {/* ========= BOX 3: DELIVERED BUT UNSETTLED ========= */}
          <div className="border border-green-200 rounded-lg p-2.5 sm:p-3 lg:p-4 bg-green-50 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4 lg:h-4 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 truncate">
                  Delivered Unsettled
                </h3>
                <span className="ml-auto flex-shrink-0 bg-green-600 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full">
                  {deliveredButUnsettled.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
              <input
                type="text"
                value={deliveredUnsettledSearch}
                onChange={(e) =>
                  handleSearch(
                    setDeliveredUnsettledSearch,
                    setDeliveredUnsettledPage,
                    e.target.value
                  )
                }
                placeholder="Search..."
                className="w-full pl-7 sm:pl-8 pr-2 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none bg-white placeholder-gray-400"
              />
            </div>

            {/* Content */}
            {filteredDeliveredUnsettled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8 flex-1">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-300 mb-2" />
                <p className="text-[10px] sm:text-xs text-gray-600 font-medium text-center">
                  {deliveredUnsettledSearch ? "No matches" : "All cleared! 🎉"}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`overflow-y-auto pr-1 flex-1 ${
                    showAllDeliveredUnsettled
                      ? "max-h-[500px]"
                      : "max-h-[320px] sm:max-h-[350px]"
                  }`}
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 #f1f5f9",
                  }}
                >
                  <ul className="space-y-1.5 sm:space-y-2">
                    {paginatedDeliveredUnsettled.map((o) =>
                      renderOrderCard(o, true)
                    )}
                  </ul>
                </div>

                {renderPagination(
                  deliveredUnsettledPage,
                  deliveredUnsettledTotalPages,
                  (page) =>
                    handlePageChange(
                      setDeliveredUnsettledPage,
                      deliveredUnsettledPage,
                      deliveredUnsettledTotalPages,
                      page
                    ),
                  showAllDeliveredUnsettled,
                  setShowAllDeliveredUnsettled,
                  filteredDeliveredUnsettled.length
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}