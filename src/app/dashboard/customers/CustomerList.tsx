// src/app/dashboard/customers/CustomerList.tsx
"use client";

import { useMemo } from "react";
import { Phone } from "lucide-react";
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b border-slate-200">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          Customer List
        </h2>
        <div className="text-sm font-medium text-slate-700">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ================= DESKTOP / TABLET TABLE ================= */}
      <div className="hidden lg:block overflow-auto" style={{
        maxHeight: '520px',
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
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              <th className="p-3 border-b">S.No</th>
              <th className="p-3 border-b">Name</th>
              <th className="p-3 border-b">Contact</th>
              <th className="p-3 border-b">Shop</th>
              <th className="p-3 border-b">Area</th>
              <th className="p-3 border-b text-right">Credit</th>
              <th className="p-3 border-b text-right">Debit</th>
              <th className="p-3 border-b text-right">Sales</th>
              <th className="p-3 border-b">Remarks</th>
              <th className="p-3 border-b text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-700">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-700">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map((c, index) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm font-medium text-slate-700">
                    {index + 1}
                  </td>

                  <td className="p-3 text-sm font-semibold text-slate-900">
                    {c.name}
                  </td>

                  <td className="p-3 text-sm text-slate-800">
                    <div className="flex items-center gap-2">
                      <Phone size={15} />
                      <div>
                        <div className="font-medium">
                          {c.contacts?.[0] || "-"}
                        </div>
                        {c.contacts?.length > 1 && (
                          <div className="text-xs text-slate-600">
                            +{c.contacts.length - 1} more
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-sm text-slate-800">
                    {c.shopName}
                  </td>

                  <td className="p-3 text-sm text-slate-800">
                    {c.area || "-"}
                  </td>

                  <td className="p-3 text-sm text-right font-medium text-green-700">
                    {formatCurrency(c.credit)}
                  </td>

                  <td className="p-3 text-sm text-right font-medium text-red-700">
                    {formatCurrency(c.debit)}
                  </td>

                  <td className="p-3 text-sm text-right text-slate-800">
                    {formatCurrency(c.totalSales)}
                  </td>

                  <td className="p-3 text-sm text-slate-700">
                    {c.remarks || "-"}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        onClick={() => handleView(c)}
                        className="px-3 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium hover:bg-blue-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1 rounded-md bg-yellow-100 text-yellow-900 text-xs font-medium hover:bg-yellow-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openSettlementModal(c)}
                        className="px-3 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium hover:bg-green-200"
                      >
                        Settle
                      </button>
                      <button
                        onClick={() => openDeleteModal(c._id)}
                        className="px-3 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE VIEW (CARD STYLE) ================= */}
      <div className="lg:hidden overflow-auto divide-y" style={{
        maxHeight: '520px',
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
          <div className="p-6 text-center text-slate-700">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-700">
            No customers found.
          </div>
        ) : (
          filtered.map((c, index) => (
            <div key={c._id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-700">
                    {c.shopName}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                  #{index + 1}
                </span>
              </div>

              <div className="text-sm text-slate-800">
                📞 {c.contacts?.[0] || "-"}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-green-700 font-medium">
                  Credit: {formatCurrency(c.credit)}
                </div>
                <div className="text-red-700 font-medium">
                  Debit: {formatCurrency(c.debit)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => handleView(c)}
                  className="px-3 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold"
                >
                  View
                </button>
                <button
                  onClick={() => handleEdit(c)}
                  className="px-3 py-1 rounded bg-yellow-100 text-yellow-900 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => openSettlementModal(c)}
                  className="px-3 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold"
                >
                  Settle
                </button>
                <button
                  onClick={() => openDeleteModal(c._id)}
                  className="px-3 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}