// src\app\dashboard\profile\delivery-partners\page.tsx

"use client";
import { useCallback, useEffect, useState } from "react";

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
  metadata?: Record<string, any>;
};

type Props = {
  userId?: string;
  statusFilter?: "pending" | "approved" | "rejected";
};

/**
 * DeliveryPartnersTable — updated:
 *  - includes adminEmail or userId in PATCH/DELETE body so server authorizes the action
 *  - dedupe by email (approved preferred / latest createdAt fallback)
 *  - darker text for readability
 *  - Edit modal (PATCH /api/delivery/update)
 *  - Delete modal (DELETE /api/delivery/delete)
 */
export default function DeliveryPartnersTable({ userId, statusFilter }: Props) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // edit modal state
  const [editing, setEditing] = useState<Partner | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // delete modal state
  const [deleting, setDeleting] = useState<Partner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getAdminEmailFromStorage = () => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.email ? String(parsed.email).toLowerCase() : null;
    } catch {
      return null;
    }
  };

  // client-side env fallback for admin email
  const envAdmin = typeof window !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_EMAIL
    ? String(process.env.NEXT_PUBLIC_ADMIN_EMAIL).toLowerCase()
    : undefined;

  const API_BASE = (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) || "";

  const UPDATE_URL = `${API_BASE || ""}/api/delivery/update`.replace(/([^:]\/)\/+/g, "$1");
  const DELETE_URL = `${API_BASE || ""}/api/delivery/delete`.replace(/([^:]\/)\/+/g, "$1");
  const LIST_BASE = `${API_BASE || ""}/api/delivery/list`.replace(/([^:]\/)\/+/g, "$1");

  // NOTE: prefer adminEmail (storage/env) first, then userId fallback
  const buildUrl = useCallback(() => {
    const base = LIST_BASE;
    const params = new URLSearchParams();

    const adminEmail = getAdminEmailFromStorage() ?? envAdmin;
    if (adminEmail) {
      params.set("adminEmail", String(adminEmail).toLowerCase());
    } else if (userId) {
      params.set("userId", userId);
    }

    if (statusFilter) params.set("status", statusFilter);
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  }, [userId, statusFilter, API_BASE, envAdmin, refreshKey, LIST_BASE]);

  const safeStatus = (raw?: any): Partner["status"] => {
    const s = String(raw ?? "pending").toLowerCase().trim();
    if (s === "approved") return "approved";
    if (s === "rejected") return "rejected";
    return "pending";
  };

  const dedupeByEmailPreferApproved = (list: Partner[]): Partner[] => {
    const byEmail = new Map<string, Partner[]>();
    for (const p of list) {
      const email = (p.email ?? "").toLowerCase();
      const key = email || `__no_email__:${p._id}`;
      const arr = byEmail.get(key) ?? [];
      arr.push(p);
      byEmail.set(key, arr);
    }

    const out: Partner[] = [];
    for (const [key, arr] of byEmail.entries()) {
      if (key.startsWith("__no_email__")) {
        arr.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        out.push(arr[0]);
        continue;
      }

      // prefer approved if any
      const approved = arr.filter((x) => safeStatus(x.status) === "approved");
      if (approved.length > 0) {
        approved.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        out.push(approved[0]);
        continue;
      }

      arr.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      out.push(arr[0]);
    }

    out.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return out;
  };

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
      });

      const rawText = await res.text();
      let parsed: any = null;
      try {
        parsed = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        console.debug("[DeliveryPartners] JSON parse error", e, rawText);
      }

      if (!res.ok) {
        const msg = (parsed && (parsed.error || parsed.message)) || `Server error ${res.status}`;
        setPartners([]);
        setError(String(msg));
        setLoading(false);
        return;
      }

      let list: any[] = [];
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed && Array.isArray(parsed.partners)) list = parsed.partners;
      else if (parsed && parsed.partner) list = [parsed.partner];
      else if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) list = [];
      else if (!parsed) {
        setPartners([]);
        setError("Empty response from server");
        setLoading(false);
        return;
      } else {
        if (parsed._id && parsed.name) list = [parsed];
        else {
          console.debug("[DeliveryPartners] Unexpected server response shape:", parsed);
          setPartners([]);
          setError("Unexpected response shape from server (see console)");
          setLoading(false);
          return;
        }
      }

      const normalized: Partner[] = list.map((p: any) => ({
        _id: String(p._id ?? p.id ?? ""),
        name: p.name ?? p.fullName ?? "Unknown",
        email: p.email ?? null,
        phone: p.phone ?? null,
        avatar: p.avatar ?? null,
        status: safeStatus(p.status ?? p.state ?? p.statusText),
        createdAt: p.createdAt ?? null,
        createdByUser: p.createdByUser ?? null,
        adminEmail: p.adminEmail ?? null,
        metadata: p.metadata ?? {},
      }));

      const deduped = dedupeByEmailPreferApproved(normalized);

      setPartners(deduped);
    } catch (err: any) {
      console.error("[DeliveryPartners] fetch failed:", err);
      setPartners([]);
      setError("Network error while fetching partners");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPartners, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso as string;
    }
  };

  function statusBadge(s: Partner["status"]) {
    if (s === "approved") return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Approved</span>;
    if (s === "rejected") return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Rejected</span>;
    return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Pending</span>;
  }

  // ---------- Edit handlers ----------
  function openEdit(p: Partner) {
    setEditing({ ...p });
  }

  function closeEdit() {
    setEditing(null);
    setEditSaving(false);
  }

  async function saveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    if (!editing.name || editing.name.trim().length < 1) {
      alert("Name is required");
      return;
    }
    if (!editing.email || !String(editing.email).includes("@")) {
      alert("Valid email is required");
      return;
    }

    setEditSaving(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // include adminEmail or userId for authorization
      const adminEmail = getAdminEmailFromStorage() ?? envAdmin ?? null;
      const body: any = {
        partnerId: editing._id,
        name: editing.name,
        email: (editing.email || "").toLowerCase(),
        phone: editing.phone ?? null,
        status: editing.status,
      };
      if (userId) body.userId = userId;
      else if (adminEmail) body.adminEmail = adminEmail;

      const res = await fetch(UPDATE_URL, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data && (data.error || data.message)) || `Update failed (${res.status})`;
        alert(message);
        setEditSaving(false);
        return;
      }

      setPartners((prev) => {
        const filtered = prev.filter((x) => x._id !== editing._id);
        const updated: Partner = {
          ...editing,
          email: (editing.email ?? "").toLowerCase(),
        };
        const merged = [updated, ...filtered];
        return dedupeByEmailPreferApproved(merged);
      });

      alert(data?.message ?? "Partner updated");
      closeEdit();
    } catch (err) {
      console.error("[DeliveryPartners] update failed:", err);
      alert("Update failed (network error)");
    } finally {
      setEditSaving(false);
    }
  }

  // ---------- Delete handlers ----------
  function openDelete(p: Partner) {
    setDeleting(p);
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteLoading(false);
  }

  async function doDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const adminEmail = getAdminEmailFromStorage() ?? envAdmin ?? null;
      const body: any = { partnerId: deleting._id };
      if (userId) body.userId = userId;
      else if (adminEmail) body.adminEmail = adminEmail;

      const res = await fetch(DELETE_URL, {
        method: "DELETE",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data && (data.error || data.message)) || `Delete failed (${res.status})`;
        alert(message);
        setDeleteLoading(false);
        return;
      }

      setPartners((p) => p.filter((x) => x._id !== deleting._id));
      alert(data?.message ?? "Partner deleted");
      closeDelete();
    } catch (err) {
      console.error("[DeliveryPartners] delete failed:", err);
      alert("Delete failed (network error)");
      setDeleteLoading(false);
    }
  }

  const partnerCount = partners.length;

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Delivery Partners</h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-700">{partnerCount} partner(s)</div>
          <div className="flex gap-2">
            <button onClick={refresh} className="text-gray-700 px-3 py-1 rounded text-sm border hover:bg-gray-50">Refresh</button>
            <button onClick={() => { try { navigator.clipboard?.writeText(buildUrl()); alert("Fetch URL copied to clipboard"); } catch { alert(buildUrl()); } }} className="px-3 py-1 rounded text-sm border hover:bg-gray-50">Copy fetch URL</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-gray-600">Loading...</div>
      ) : error ? (
        <div className="py-6 text-center text-sm text-red-600">
          <div>{error}</div>
          <div className="mt-3">
            <button onClick={refresh} className="px-3 py-1 rounded text-sm border hover:bg-gray-50">Try again</button>
          </div>
          <div className="mt-2 text-xs text-gray-500">Open console for debug details.</div>
        </div>
      ) : partners.length === 0 ? (
        <div className="py-6 text-center text-gray-600">No delivery partners yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2 text-gray-700">Name</th>
                <th className="pb-2 text-gray-700">Email</th>
                <th className="pb-2 text-gray-700">Phone</th>
                <th className="pb-2 text-gray-700">Status</th>
                <th className="pb-2 text-gray-700">Created</th>
                <th className="pb-2 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      {p.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">{p.name ? p.name[0].toUpperCase() : "?"}</div>
                      )}
                      <div className="font-medium text-gray-800">{p.name}</div>
                    </div>
                  </td>
                  <td className="py-3 text-gray-800">{p.email ?? "-"}</td>
                  <td className="py-3 text-gray-800">{p.phone ?? "-"}</td>
                  <td className="py-3">{statusBadge(p.status)}</td>
                  <td className="py-3 text-gray-700">{formatDate(p.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-3 py-1 rounded text-sm border hover:bg-gray-50 text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(p)}
                        className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"
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
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <form onSubmit={saveEdit} className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Edit Partner</h4>

            <label className="block text-sm text-gray-700 mb-1">Name</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full mb-3 px-3 py-2 border rounded text-gray-800"
            />

            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              value={editing.email ?? ""}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              className="w-full mb-3 px-3 py-2 border rounded text-gray-800"
            />

            <label className="block text-sm text-gray-700 mb-1">Phone</label>
            <input
              value={editing.phone ?? ""}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              className="w-full mb-3 px-3 py-2 border rounded text-gray-800"
            />

            <label className="block text-sm text-gray-700 mb-1">Status</label>
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: safeStatus(e.target.value) })}
              className="w-full mb-4 px-3 py-2 border rounded text-gray-800"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeEdit} className="px-3 py-1 rounded border text-sm">Cancel</button>
              <button type="submit" disabled={editSaving} className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeDelete} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 z-10">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Delete partner</h4>
            <p className="text-sm text-gray-700 mb-4">Are you sure you want to permanently delete <strong>{deleting.name}</strong>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={closeDelete} className="px-3 py-1 rounded border text-sm">Cancel</button>
              <button onClick={doDelete} disabled={deleteLoading} className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
