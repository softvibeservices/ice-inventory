// src/app/dashboard/customers/CustomerList.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { Phone, Eye, Edit, DollarSign, Trash2 } from "lucide-react";
import { Customer, SortMode } from "@/types/customer.type";

interface CustomerListProps {
  customers: Customer[];
  search: string;
  sortMode: SortMode;
  loading: boolean;
  handleView: (c: Customer) => void;
  handleEdit: (c: Customer) => void;
  openSettlementModal: (c: Customer) => void;
  openDeleteModal: (id: string) => void;
}

export default function CustomerList({
  customers,
  search,
  sortMode,
  loading,
  handleView,
  handleEdit,
  openSettlementModal,
  openDeleteModal,
}: CustomerListProps) {
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  const formatCurrency = (v?: number) => {
    if (typeof v !== "number" || Number.isNaN(v)) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shopName.toLowerCase().includes(q) ||
        (c.area || "").toLowerCase().includes(q) ||
        c.contacts.join(" ").toLowerCase().includes(q)
      );
    });

    if (sortMode === "default") return list;

    const num = (v: number | undefined) =>
      Number.isFinite(v as number) ? (v as number) : 0;

    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "credit-asc":
          return num(a.credit) - num(b.credit);
        case "credit-desc":
          return num(b.credit) - num(a.credit);
        case "debit-asc":
          return num(a.debit) - num(b.debit);
        case "debit-desc":
          return num(b.debit) - num(a.debit);
        case "sales-asc":
          return num(a.totalSales) - num(b.totalSales);
        case "sales-desc":
          return num(b.totalSales) - num(a.totalSales);
        default:
          return 0;
      }
    });

    return list;
  }, [customers, search, sortMode]);

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    if (viewAll) return filtered;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, currentPage, viewAll]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortMode]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewAllToggle = () => {
    setViewAll(!viewAll);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (viewAll || totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="flex items-center justify-center gap-2 py-4 flex-wrap border-t border-slate-200 bg-slate-50">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium transition shadow-sm"
        >
          Previous
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white text-slate-700 transition shadow-sm"
            >
              1
            </button>
            {startPage > 2 && <span className="text-slate-500 font-semibold">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1.5 text-sm border rounded-lg font-medium transition shadow-sm ${
              currentPage === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 text-slate-700 hover:bg-white'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-slate-500 font-semibold">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white text-slate-700 transition shadow-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium transition shadow-sm"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ===== Header with View All Button ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Customer List
          </h2>
          <div className="text-sm font-medium text-slate-600 mt-0.5">
            Showing <span className="font-semibold text-blue-600">
              {viewAll ? filtered.length : paginatedCustomers.length}
            </span> of <span className="font-semibold">{filtered.length}</span> customer
            {filtered.length !== 1 ? "s" : ""}
            {!viewAll && totalPages > 1 && (
              <span className="ml-2 text-slate-500">
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleViewAllToggle}
          className="
            bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
            text-white text-sm font-semibold
            px-5 py-2 rounded-lg
            transition-all shadow-md hover:shadow-lg
            flex items-center gap-2
          "
        >
          {viewAll ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Show Paginated
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              View All Customers
            </>
          )}
        </button>
      </div>

      {/* Pagination - Top */}
      {renderPagination()}

      {/* ================= DESKTOP / TABLET TABLE ================= */}
      <div className="hidden lg:block overflow-auto" style={{
        maxHeight: viewAll ? 'none' : '520px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #f1f5f9'
      }}>
        <style>{`
          .hidden.lg\\:block.overflow-auto::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .hidden.lg\\:block.overflow-auto::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .hidden.lg\\:block.overflow-auto::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .hidden.lg\\:block.overflow-auto::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-gradient-to-r from-slate-100 to-slate-200 z-10 shadow-sm">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              <th className="p-3 border-b-2 border-slate-300">S.No</th>
              <th className="p-3 border-b-2 border-slate-300">Name</th>
              <th className="p-3 border-b-2 border-slate-300">Contact</th>
              <th className="p-3 border-b-2 border-slate-300">Shop</th>
              <th className="p-3 border-b-2 border-slate-300">Area</th>
              <th className="p-3 border-b-2 border-slate-300 text-right">Credit</th>
              <th className="p-3 border-b-2 border-slate-300 text-right">Debit</th>
              <th className="p-3 border-b-2 border-slate-300 text-right">Sales</th>
              <th className="p-3 border-b-2 border-slate-300">Remarks</th>
              <th className="p-3 border-b-2 border-slate-300 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <p className="text-slate-700 font-medium mt-3">Loading customers...</p>
                </td>
              </tr>
            ) : paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-700 font-semibold">No customers found</p>
                  <p className="text-slate-600 text-sm mt-1">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((c, index) => {
                const globalIndex = viewAll ? filtered.indexOf(c) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                return (
                  <tr key={c._id} className="hover:bg-blue-50 transition-colors border-b border-slate-100">
                    <td className="p-3 text-sm">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
                        {globalIndex}
                      </span>
                    </td>

                    <td className="p-3 text-sm font-semibold text-slate-900">
                      {c.name}
                    </td>

                    <td className="p-3 text-sm text-slate-800">
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="text-blue-600" />
                        <div>
                          <div className="font-medium">
                            {c.contacts?.[0] || "-"}
                          </div>
                          {c.contacts?.length > 1 && (
                            <div className="text-xs text-slate-600 bg-slate-100 inline-block px-1.5 py-0.5 rounded">
                              +{c.contacts.length - 1} more
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-sm text-slate-800 max-w-[150px] truncate" title={c.shopName}>
                      {c.shopName}
                    </td>

                    <td className="p-3 text-sm text-slate-800">
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {c.area || "-"}
                      </span>
                    </td>

                    <td className="p-3 text-sm text-right font-semibold text-green-700">
                      {formatCurrency(c.credit)}
                    </td>

                    <td className="p-3 text-sm text-right font-semibold text-red-700">
                      {formatCurrency(c.debit)}
                    </td>

                    <td className="p-3 text-sm text-right text-slate-800 font-medium">
                      {formatCurrency(c.totalSales)}
                    </td>

                    <td className="p-3 text-sm text-slate-700 max-w-[120px] truncate" title={c.remarks || "-"}>
                      {c.remarks || "-"}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <button
                          onClick={() => handleView(c)}
                          className="p-1.5 rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 transition group"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-md bg-yellow-100 text-yellow-900 hover:bg-yellow-200 transition"
                          title="Edit Customer"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openSettlementModal(c)}
                          className="p-1.5 rounded-md bg-green-100 text-green-800 hover:bg-green-200 transition"
                          title="Settle Account"
                        >
                          <DollarSign size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(c._id)}
                          className="p-1.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 transition"
                          title="Delete Customer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE VIEW (CARD STYLE) ================= */}
      <div className="lg:hidden overflow-auto divide-y" style={{
        maxHeight: viewAll ? 'none' : '520px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 #f1f5f9'
      }}>
        <style>{`
          .lg\\:hidden.overflow-auto::-webkit-scrollbar {
            width: 8px;
          }
          .lg\\:hidden.overflow-auto::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .lg\\:hidden.overflow-auto::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .lg\\:hidden.overflow-auto::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-slate-700 font-medium mt-3">Loading...</p>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-slate-700 font-semibold">No customers found</p>
          </div>
        ) : (
          paginatedCustomers.map((c, index) => {
            const globalIndex = viewAll ? filtered.indexOf(c) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            return (
              <div key={c._id} className="p-4 space-y-3 hover:bg-blue-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {globalIndex}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {c.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-700 ml-8">
                      🏪 {c.shopName}
                    </p>
                    {c.area && (
                      <p className="text-xs text-slate-600 ml-8 mt-0.5">
                        📍 {c.area}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-800 bg-slate-50 p-2 rounded">
                  <Phone size={14} className="text-blue-600" />
                  <span className="font-medium">{c.contacts?.[0] || "-"}</span>
                  {c.contacts?.length > 1 && (
                    <span className="text-xs text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                      +{c.contacts.length - 1}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="text-green-700 font-semibold">Credit</div>
                    <div className="text-green-800 font-bold mt-0.5">{formatCurrency(c.credit)}</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded text-center">
                    <div className="text-red-700 font-semibold">Debit</div>
                    <div className="text-red-800 font-bold mt-0.5">{formatCurrency(c.debit)}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <div className="text-blue-700 font-semibold">Sales</div>
                    <div className="text-blue-800 font-bold mt-0.5">{formatCurrency(c.totalSales)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => handleView(c)}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-xs font-semibold hover:bg-blue-200 transition flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
                    className="flex-1 px-3 py-2 rounded-lg bg-yellow-100 text-yellow-900 text-xs font-semibold hover:bg-yellow-200 transition flex items-center justify-center gap-1"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => openSettlementModal(c)}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-100 text-green-800 text-xs font-semibold hover:bg-green-200 transition flex items-center justify-center gap-1"
                  >
                    <DollarSign size={14} /> Settle
                  </button>
                  <button
                    onClick={() => openDeleteModal(c._id)}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-800 text-xs font-semibold hover:bg-red-200 transition flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination - Bottom */}
      {renderPagination()}
    </div>
  );
}