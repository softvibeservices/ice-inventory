// ice-inventory/src/app/dashboard/profile/delivery-partners/DeliveryPartnersPage.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Partner = {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: string | null;
  createdByUser?: string | null;
  adminEmail?: string | null;
};

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [qText, setQText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const getSession = () => {
    try {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const API_BASE = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE_URL ?? "" : "";
  const LIST_URL = `${API_BASE}/api/delivery/list`.replace(/([^:]\/)\/+/g, "$1");
  const UPDATE_URL = `${API_BASE}/api/delivery/update`.replace(/([^:]\/)\/+/g, "$1");
  const DELETE_URL = `${API_BASE}/api/delivery/delete`.replace(/([^:]\/)\/+/g, "$1");

  const pushToast = (type: "success" | "error" | "info", message: string) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    setToasts((s) => [...s, { id, type, message }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 4500);
  };

  const removeToast = (id: string) => setToasts((s) => s.filter((t) => t.id !== id));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(qText.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [qText]);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = getSession();
      const userId = session?.id ?? session?._id ?? null;

      // ✅ FIXED: Always send userId (required by the backend)
      const q = new URLSearchParams();
      if (userId) {
        q.set("userId", userId);
      }

      const url = `${LIST_URL}${q.toString() ? `?${q.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Failed to fetch partners");
        setPartners([]);
        pushToast("error", data?.error ?? "Failed to fetch partners");
        return;
      }

      const list: any[] = Array.isArray(data) ? data : data.partners ?? (data.partner ? [data.partner] : []);
      const normalized: Partner[] = list.map((p) => ({
        _id: String(p._id ?? p.id ?? ""),
        name: p.name ?? "Unknown",
        email: p.email ?? null,
        phone: p.phone ?? null,
        avatar: p.avatar ?? null,
        status: (p.status ?? "pending").toLowerCase() as Partner["status"],
        createdAt: p.createdAt ?? null,
        createdByUser: p.createdByUser ?? null,
        adminEmail: p.adminEmail ?? null,
      }));

      setPartners(normalized);
    } catch (err) {
      console.error(err);
      setError("Network error");
      setPartners([]);
      pushToast("error", "Network error while fetching partners");
    } finally {
      setLoading(false);
    }
  }, [LIST_URL]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filtered = useMemo(() => {
    const s = debouncedQ;
    return partners.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!s) return true;
      return (
        (p.name ?? "").toLowerCase().includes(s) ||
        (p.email ?? "").toLowerCase().includes(s) ||
        (p.phone ?? "").toLowerCase().includes(s)
      );
    });
  }, [partners, debouncedQ, statusFilter]);

  const validateEdit = (p: Partner) => {
    if (!p.name || p.name.trim().length < 1) {
      pushToast("error", "Name is required");
      return false;
    }
    if (!p.email || !String(p.email).includes("@")) {
      pushToast("error", "Valid email is required");
      return false;
    }
    return true;
  };

  async function saveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    if (!validateEdit(editing)) return;

    setSaving(true);

    try {
      const session = getSession();
      const body: any = {
        partnerId: editing._id,
        name: editing.name,
        email: (editing.email || "").toLowerCase(),
        phone: editing.phone ?? null,
        status: editing.status,
      };

      if (session?.id) body.userId = session.id;
      else if (session?._id) body.userId = session._id;

      const res = await fetch(UPDATE_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        pushToast("error", data?.error ?? "Update failed");
        return;
      }

      setPartners((prev) =>
        prev.map((x) =>
          x._id === editing._id
            ? { ...x, ...editing, email: (editing.email || "").toLowerCase() }
            : x
        )
      );

      pushToast("success", data?.message ?? "Partner updated");
      setEditing(null);
    } catch (err) {
      console.error(err);
      pushToast("error", "Network error while updating");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const target = confirmDeleteFor;
    if (!target) return;

    setDeletingLoading(true);

    try {
      const session = getSession();
      const body: any = { partnerId: target._id };

      if (session?.id) body.userId = session.id;
      else if (session?._id) body.userId = session._id;

      const res = await fetch(DELETE_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        pushToast("error", data?.error ?? "Delete failed");
        setConfirmDeleteFor(null);
        return;
      }

      setPartners((p) => p.filter((x) => x._id !== target._id));
      pushToast("success", data?.message ?? "Partner deleted");
      setConfirmDeleteFor(null);
    } catch (err) {
      console.error(err);
      pushToast("error", "Network error while deleting");
    } finally {
      setDeletingLoading(false);
    }
  }

  const statusBadge = (s: Partner["status"]) => {
    const configs = {
      approved: "px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700",
      rejected: "px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700",
      pending: "px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700",
    };
    const labels = { approved: "Approved", rejected: "Rejected", pending: "Pending" };
    return <span className={configs[s]}>{labels[s]}</span>;
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg">
                🚚
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Delivery Partners</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Manage and monitor your delivery partner network
                </p>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  aria-label="Search delivery partners"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={fetchPartners}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="py-16 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-gray-500">Loading partners...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <div className="text-red-600 mb-3">⚠️ {error}</div>
                <button
                  onClick={fetchPartners}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-6xl mb-4">📦</div>
                <div className="text-gray-600 mb-4 font-medium">No delivery partners found</div>
                <button
                  onClick={() => {
                    setQText("");
                    setStatusFilter("all");
                    fetchPartners();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Partner
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden text-sm font-semibold text-blue-700">
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  p.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-500">ID: {p._id.slice(-8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-700">{p.email ?? "-"}</div>
                            <div className="text-xs text-gray-500">{p.phone ?? "-"}</div>
                          </td>
                          <td className="py-4 px-4">{statusBadge(p.status)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(p.createdAt)}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditing(p)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteFor(p)}
                                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards */}
                <div className="lg:hidden grid gap-4">
                  {filtered.map((p) => (
                    <div key={p._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden text-sm font-semibold text-blue-700 flex-shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                              <p className="text-xs text-gray-500 truncate">{p.email ?? "-"}</p>
                            </div>
                            {statusBadge(p.status)}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>{p.phone ?? "No phone"}</span>
                            <span>{formatDate(p.createdAt)}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditing(p)}
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteFor(p)}
                              className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Results Count */}
                <div className="mt-6 text-sm text-gray-600 text-center">
                  Showing {filtered.length} {filtered.length === 1 ? "partner" : "partners"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Edit Partner</h2>
              <p className="text-sm text-gray-600 mt-1">Update partner information</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editing.email ?? ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as Partner["status"] })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Confirm Deletion</h2>
              <p className="text-sm text-gray-600 text-center">
                Are you sure you want to delete <strong>{confirmDeleteFor.name}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteFor(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${
              t.type === "success"
                ? "bg-green-50 border border-green-200"
                : t.type === "error"
                ? "bg-red-50 border border-red-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <span className="text-xl">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}