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

export default function DeliveryPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [toasts, setToasts] = useState<
    { id: string; type: "success" | "error" | "info"; message: string }[]
  >([]);

  const [qText, setQText] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [page, setPage] = useState(1);
  const perPage = 8;

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

  const API_BASE =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
      : "";

  const LIST_URL = `${API_BASE}/api/delivery/list`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
  const UPDATE_URL = `${API_BASE}/api/delivery/update`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
  const DELETE_URL = `${API_BASE}/api/delivery/delete`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );

  const pushToast = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    const id =
      String(Date.now()) + Math.random().toString(36).slice(2, 8);
    setToasts((s) => [...s, { id, type, message }]);
    setTimeout(
      () => setToasts((s) => s.filter((t) => t.id !== id)),
      4500
    );
  };

  const removeToast = (id: string) =>
    setToasts((s) => s.filter((t) => t.id !== id));

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQ(qText.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [qText]);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = getSession();
      const adminEmail = session?.email
        ? String(session.email).toLowerCase()
        : null;
      const adminId = session?.id ?? session?._id ?? null;

      const q = new URLSearchParams();

      if (adminEmail) q.set("adminEmail", adminEmail);
      else if (adminId) q.set("userId", adminId);

      const url = `${LIST_URL}${
        q.toString() ? `?${q.toString()}` : ""
      }`;

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Failed to fetch partners");
        setPartners([]);
        pushToast(
          "error",
          data?.error ?? "Failed to fetch partners"
        );
        return;
      }

      const list: any[] = Array.isArray(data)
        ? data
        : data.partners ??
          (data.partner ? [data.partner] : []);

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
  }, [LIST_URL, refreshKey]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filtered = useMemo(() => {
    const s = debouncedQ;
    return partners.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter)
        return false;
      if (!s) return true;
      return (
        (p.name ?? "").toLowerCase().includes(s) ||
        (p.email ?? "").toLowerCase().includes(s) ||
        (p.phone ?? "").toLowerCase().includes(s)
      );
    });
  }, [partners, debouncedQ, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage)
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

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
        headers: {
          "Content-Type": "application/json",
        },
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
            ? {
                ...x,
                ...editing,
                email: (editing.email || "").toLowerCase(),
              }
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

  function requestDelete(p: Partner) {
    setConfirmDeleteFor(p);
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
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        pushToast("error", data?.error ?? "Delete failed");
        setConfirmDeleteFor(null);
        return;
      }

      setPartners((p) =>
        p.filter((x) => x._id !== target._id)
      );

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
    if (s === "approved")
      return (
        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
          Approved
        </span>
      );
    if (s === "rejected")
      return (
        <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
          Rejected
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso as string;
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl">
              🚚
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">
                Delivery Partners
              </div>
              <div className="text-sm text-gray-600">
                Manage delivery partners — search, approve, edit or
                remove.
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="flex-1 md:flex-none">
              <input
                aria-label="Search delivery partners"
                value={qText}
                onChange={(e) => {
                  setQText(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, phone..."
                className="w-full md:w-72 px-3 py-2 border rounded text-sm text-gray-600"
              />
            </div>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 border rounded text-sm text-gray-600"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={() => {
                setRefreshKey((k) => k + 1);
                fetchPartners();
              }}
              className="ml-2 px-3 py-2 bg-gray-100 rounded border text-sm text-gray-500"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            Loading partners…
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-600">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-gray-600 mb-3">
              No delivery partners found.
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setQText("");
                  setStatusFilter("all");
                  fetchPartners();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Reset filters
              </button>
              <button
                onClick={() => fetchPartners()}
                className="px-3 py-2 border rounded text-gray-500"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2">Partner</th>
                    <th className="py-2">Contact</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Requested</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr
                      key={p._id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-sm font-medium text-slate-700">
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : p.name ? (
                              p.name
                                .charAt(0)
                                .toUpperCase()
                            ) : (
                              "?"
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {p._id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="text-sm text-gray-700">
                          {p.email ?? "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.phone ?? "-"}
                        </div>
                      </td>

                      <td className="py-3">
                        {statusBadge(p.status)}
                      </td>

                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditing(p)}
                            className="px-3 py-1 rounded border text-sm text-gray-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => requestDelete(p)}
                            className="px-3 py-1 rounded bg-red-600 text-white text-sm"
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
            <div className="md:hidden grid grid-cols-1 gap-3">
              {paged.map((p) => (
                <div
                  key={p._id}
                  className="border rounded-lg p-3 bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-sm font-medium text-slate-700">
                      {p.avatar ? (
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : p.name ? (
                        p.name.charAt(0).toUpperCase()
                      ) : (
                        "?"
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-800">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.email ?? "-"}
                          </div>
                        </div>
                        <div>{statusBadge(p.status)}</div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">
                          {p.phone ?? "-"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(p.createdAt)}
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setEditing(p)}
                          className="px-3 py-1 rounded border text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => requestDelete(p)}
                          className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div>
                Showing{" "}
                {Math.min(
                  (page - 1) * perPage + 1,
                  filtered.length
                )}{" "}
                -{" "}
                {Math.min(
                  page * perPage,
                  filtered.length
                )}{" "}
                of {filtered.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  className="px-2 py-1 border rounded"
                  disabled={page === 1}
                >
                  First
                </button>

                <button
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                  className="px-2 py-1 border rounded"
                  disabled={page === 1}
                >
                  Prev
                </button>

                <div className="px-2">
                  {page} / {totalPages}
                </div>

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(totalPages, p + 1)
                    )
                  }
                  className="px-2 py-1 border rounded"
                  disabled={page === totalPages}
                >
                  Next
                </button>

                <button
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1 border rounded"
                  disabled={page === totalPages}
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditing(null)}
          />
          <form
            onSubmit={saveEdit}
            className="relative bg-white rounded p-6 z-10 w-full max-w-md"
          >
            <h4 className="font-semibold mb-2 text-gray-500">
              Edit Partner
            </h4>

            <label className="block text-sm text-gray-700">
              Name
            </label>
            <input
              value={editing.name}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  name: e.target.value,
                })
              }
              className="w-full mb-2 border p-2 rounded text-gray-500"
            />

            <label className="block text-sm text-gray-700">
              Email
            </label>
            <input
              value={editing.email ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  email: e.target.value,
                })
              }
              className="w-full mb-2 border p-2 rounded text-gray-500"
            />

            <label className="block text-sm text-gray-700">
              Phone
            </label>
            <input
              value={editing.phone ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  phone: e.target.value,
                })
              }
              className="w-full mb-2 border p-2 rounded text-gray-500"
            />

            <label className="block text-sm text-gray-700">
              Status
            </label>
            <select
              value={editing.status}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  status: e.target.value as Partner["status"],
                })
              }
              className="w-full mb-4 border p-2 rounded text-gray-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-3 py-1 border rounded text-gray-500"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmDeleteFor(null)}
          />

          <div className="relative bg-white rounded p-6 z-10 w-full max-w-sm">
            <h4 className="font-semibold mb-2 text-gray-500">
              Confirm Deletion
            </h4>

            <p className="text-sm text-gray-700">
              Are you sure you want to permanently
              delete{" "}
              <strong>
                {confirmDeleteFor.name}
              </strong>{" "}
              (ID: {confirmDeleteFor._id})?
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteFor(null)}
                className="text-gray-500 px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deletingLoading}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                {deletingLoading
                  ? "Deleting..."
                  : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg shadow p-3 flex items-start gap-3 ${
              t.type === "success"
                ? "bg-green-50 border border-green-200"
                : t.type === "error"
                ? "bg-red-50 border border-red-200"
                : "bg-white border"
            }`}
          >
            <div className="flex-1">
              <div className="text-sm text-gray-700">
                {t.message}
              </div>
            </div>

            <div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-xs text-gray-500 px-2 py-1"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
