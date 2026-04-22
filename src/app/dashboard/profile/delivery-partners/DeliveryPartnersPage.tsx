// src/app/dashboard/profile/delivery-partners/DeliveryPartnersPage.tsx
//
// PHASE 8 changes:
//  1. Import useSubscription hook
//  2. If hasDeliveryModule === false → show upgrade prompt instead of the table
//  3. Show deliveryPartner count vs limit at the top of the table
//  4. Disable "approve" actions (via status change) when at partner limit
//
// All original fetch/edit/delete/toast logic is IDENTICAL — only the render
// section adds the gate and the usage indicator.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";
import { Lock, ArrowRight, Truck } from "lucide-react";

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

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") ?? "";
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

function jsonAuthHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Feature gate screen — shown when delivery module is not on this plan
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryModuleGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center mx-auto mb-5">
        <Lock size={26} className="text-yellow-500" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Delivery Module Not Available
      </h2>

      <p className="text-slate-600 text-sm leading-6 max-w-sm mb-5">
        Managing delivery partners requires the <strong>Scale</strong> or{" "}
        <strong>Business</strong> plan. Upgrade to onboard your delivery team,
        assign orders, and track partners in real time.
      </p>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6 text-left max-w-sm w-full">
        <p className="text-sm font-semibold text-yellow-900 mb-2">
          Delivery module includes:
        </p>
        <ul className="space-y-1.5 text-sm text-yellow-800">
          <li className="flex items-center gap-2">
            <Truck size={13} className="text-yellow-600 shrink-0" />
            Delivery partner onboarding &amp; management
          </li>
          <li className="flex items-center gap-2">
            <Truck size={13} className="text-yellow-600 shrink-0" />
            Order assignment to delivery partners
          </li>
          <li className="flex items-center gap-2">
            <Truck size={13} className="text-yellow-600 shrink-0" />
            Live GPS map tracking
          </li>
          <li className="flex items-center gap-2">
            <Truck size={13} className="text-yellow-600 shrink-0" />
            Delivery status workflow (Pending → On the Way → Delivered)
          </li>
        </ul>
      </div>

      <Link
        href="/dashboard/subscription"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        View Plans
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: Partner["status"]) {
  const map: Record<Partner["status"], { label: string; cls: string }> = {
    approved: { label: "Approved", cls: "bg-green-100 text-green-800 border-green-200" },
    pending:  { label: "Pending",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
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

  // ── PHASE 8: Subscription guard ───────────────────────────────────────────
  const { subscription, loading: subLoading } = useSubscription();

  const hasDeliveryModule  = subscription?.effectiveLimits.hasDeliveryModule ?? true;
  const deliveryLimit      = subscription?.effectiveLimits.deliveryPartners ?? null;
  const approvedCount      = partners.filter((p) => p.status === "approved").length;
  const isAtPartnerLimit   = deliveryLimit !== null && approvedCount >= deliveryLimit;
  // ─────────────────────────────────────────────────────────────────────────

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
      const res = await fetch(`/api/delivery/list`, {
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Failed to fetch partners");
        setPartners([]);
        pushToast("error", data?.error ?? "Failed to fetch partners");
        return;
      }

      const list: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data.partners ?? (data.partner ? [data.partner] : []));

      const normalized: Partner[] = list.map((p) => ({
        _id: String(p._id ?? p.id ?? ""),
        name: String(p.name ?? "Unknown"),
        email: (p.email as string) ?? null,
        phone: (p.phone as string) ?? null,
        avatar: (p.avatar as string) ?? null,
        status: ((p.status as string) ?? "pending").toLowerCase() as Partner["status"],
        createdAt: (p.createdAt as string) ?? null,
        createdByUser: (p.createdByUser as string) ?? null,
        adminEmail: (p.adminEmail as string) ?? null,
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
  }, []);

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

    // ── PHASE 8: Block approving when at partner limit ────────────────────
    if (
      editing.status === "approved" &&
      isAtPartnerLimit
    ) {
      const originalPartner = partners.find((p) => p._id === editing._id);
      if (originalPartner?.status !== "approved") {
        pushToast(
          "error",
          `Delivery partner limit reached (${approvedCount}/${deliveryLimit}). Upgrade to add more.`
        );
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    setSaving(true);

    try {
      const body = {
        partnerId: editing._id,
        name: editing.name,
        email: (editing.email || "").toLowerCase(),
        phone: editing.phone ?? null,
        status: editing.status,
      };

      const res = await fetch(`/api/delivery/update`, {
        method: "PATCH",
        headers: jsonAuthHeaders(),
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
      const res = await fetch(`/api/delivery/delete`, {
        method: "DELETE",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ partnerId: target._id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        pushToast("error", data?.error ?? "Delete failed");
        return;
      }

      setPartners((prev) => prev.filter((p) => p._id !== target._id));
      pushToast("success", `${target.name} removed`);
      setConfirmDeleteFor(null);
    } catch (err) {
      console.error(err);
      pushToast("error", "Network error while deleting");
    } finally {
      setDeletingLoading(false);
    }
  }

  // ── PHASE 8: Show feature gate if delivery module is not available ─────────
  if (!subLoading && !hasDeliveryModule) {
    return <DeliveryModuleGate />;
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── PHASE 8: Partner limit indicator ─────────────────────────────── */}
      {deliveryLimit !== null && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
          isAtPartnerLimit
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}>
          <span>
            <strong>{approvedCount}</strong> / <strong>{deliveryLimit}</strong>{" "}
            delivery partner seats used
          </span>
          {isAtPartnerLimit && (
            <Link
              href="/dashboard/subscription"
              className="text-xs font-semibold underline underline-offset-2 text-red-700 hover:text-red-900"
            >
              Upgrade to add more →
            </Link>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-full sm:w-44 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          No delivery partners found.
        </div>
      )}

      {/* Table — desktop */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Partner</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Added</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden text-sm font-semibold text-blue-700 flex-shrink-0">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            p.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.email ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{p.phone ?? "—"}</td>
                    <td className="px-5 py-4">{statusBadge(p.status)}</td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(p)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteFor(p)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
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

          {/* Mobile cards */}
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

          <div className="mt-6 text-sm text-gray-600 text-center">
            Showing {filtered.length} {filtered.length === 1 ? "partner" : "partners"}
          </div>
        </>
      )}

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
                {/* ── PHASE 8: Warning when approving would exceed limit ─── */}
                {editing.status === "approved" &&
                  isAtPartnerLimit &&
                  partners.find((p) => p._id === editing._id)?.status !== "approved" && (
                    <p className="mt-1.5 text-xs text-red-600">
                      ⚠ Partner limit reached ({approvedCount}/{deliveryLimit}).
                      You cannot approve more partners on your current plan.
                    </p>
                  )}
                {/* ─────────────────────────────────────────────────────── */}
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