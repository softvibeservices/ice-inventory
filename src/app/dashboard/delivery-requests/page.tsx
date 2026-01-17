// src/app/dashboard/delivery-requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { Check, X, RefreshCw, Truck, AlertCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

type Partner = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  notifiedAt?: string | null;
  metadata?: Record<string, any>;
};

export default function DeliveryRequestsPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    partnerId: string;
    action: "approve" | "reject";
    partnerName: string;
  } | null>(null);

  // detect admin identity from URL or window (supporting ?adminEmail=... or ?userId=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const aemail = params.get("adminEmail") ?? params.get("email");
    const uid = params.get("userId");
    if (aemail) setAdminEmail(aemail.toLowerCase());
    if (uid) setUserId(uid);

    // try to detect session user if no query param was provided
    (async () => {
      if (!aemail && !uid) {
        try {
          const r = await fetch("/api/auth/session");
          if (r.ok) {
            const j = await r.json().catch(() => null);
            const maybeUser = j?.user ?? j;
            if (maybeUser?.email)
              setAdminEmail(String(maybeUser.email).toLowerCase());
            if (maybeUser?._id) setUserId(String(maybeUser._id));
            if (maybeUser?.id) setUserId(String(maybeUser.id));
          }
        } catch {
          // ignore if endpoint doesn't exist
        }
      }
    })();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(stored || "{}");
    if (parsed?.role === "manager") {
      router.push("/dashboard");
    }
  }, []);

  // load pending partners when admin identity is known
  const loadRequests = async () => {
    if (!userId && !adminEmail) {
      setErrorMsg(
        "Provide ?userId=... or ?adminEmail=... in URL, or ensure session endpoint exists."
      );
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (userId) q.set("userId", userId);
      if (adminEmail) q.set("adminEmail", adminEmail);
      q.set("status", "pending");

      const res = await fetch(`/api/delivery/list?${q.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data?.error ?? "Failed to load requests";
        setPartners([]);
        setErrorMsg(String(err));
      } else {
        setPartners(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load delivery partner requests:", err);
      setPartners([]);
      setErrorMsg("Failed to load delivery partner requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [userId, adminEmail]);

  // Show confirmation modal
  const showConfirmation = (
    partnerId: string,
    action: "approve" | "reject",
    partnerName: string
  ) => {
    setConfirmAction({ partnerId, action, partnerName });
    setShowConfirmModal(true);
  };

  // Accept / Reject handler (robust JSON parsing and error handling)
  async function handleAction(partnerId: string, action: "approve" | "reject") {
    if (!userId && !adminEmail) {
      setErrorMsg("Missing admin identity. Provide ?userId or ?adminEmail in URL.");
      return;
    }

    setShowConfirmModal(false);
    setWorkingId(partnerId);

    try {
      const body: any = { partnerId };
      if (userId) body.userId = userId;
      if (adminEmail) body.adminEmail = adminEmail;

      const res = await fetch(`/api/delivery/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err =
          data?.error ?? data?.message ?? res.statusText ?? "Action failed";
        setErrorMsg(String(err));
      } else {
        setPartners((p) => p.filter((x) => x._id !== partnerId));
        setErrorMsg(null);
        // Show success message
        const successMsg =
          action === "approve"
            ? "✅ Partner approved successfully!"
            : "❌ Partner request rejected.";
        // You can replace this with a toast notification if you prefer
        const tempDiv = document.createElement("div");
        tempDiv.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50";
        tempDiv.textContent = successMsg;
        document.body.appendChild(tempDiv);
        setTimeout(() => tempDiv.remove(), 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Action failed. Please try again.");
    } finally {
      setWorkingId(null);
      setConfirmAction(null);
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardNavbar userId={userId ?? undefined} />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                    Delivery Partner Requests
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Approve or decline delivery partners who have requested
                    access to your shop.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <Clock size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {loading ? "Loading..." : `${partners.length} pending`}
                  </span>
                </div>
                <button
                  onClick={loadRequests}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{errorMsg}</div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Loading requests…</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && partners.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Pending Requests
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                You don't have any pending delivery partner requests at the
                moment. New requests will appear here.
              </p>
            </div>
          )}

          {/* Partner Cards Grid */}
          {!loading && partners.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {partners.map((p) => (
                <article
                  key={p._id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5"
                >
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg sm:text-xl font-semibold text-blue-700 overflow-hidden border-2 border-white shadow-sm">
                        {p.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          p.name?.charAt(0)?.toUpperCase() ?? "D"
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                            {p.name}
                          </h3>
                          <div className="text-sm text-gray-600 truncate">
                            {p.email}
                          </div>
                          {p.phone && (
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              📞 <span>{p.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                          <Clock size={12} />
                          <span>{formatDate(p.createdAt)}</span>
                        </div>
                      </div>

                      {/* Metadata */}
                      {p.metadata && Object.keys(p.metadata).length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {Object.entries(p.metadata)
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <div
                                key={k}
                                className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2.5 py-1 rounded"
                              >
                                <span className="font-medium capitalize text-gray-700">
                                  {k}:
                                </span>
                                <span className="text-gray-600">
                                  {String(v)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          disabled={workingId === p._id}
                          onClick={() =>
                            showConfirmation(p._id, "approve", p.name)
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors ${
                            workingId === p._id
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {workingId === p._id ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span className="hidden sm:inline">
                                Processing...
                              </span>
                            </>
                          ) : (
                            <>
                              <Check size={18} />
                              <span>Accept</span>
                            </>
                          )}
                        </button>

                        <button
                          disabled={workingId === p._id}
                          onClick={() =>
                            showConfirmation(p._id, "reject", p.name)
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors ${
                            workingId === p._id
                              ? "opacity-60 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {workingId === p._id ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span className="hidden sm:inline">
                                Processing...
                              </span>
                            </>
                          ) : (
                            <>
                              <X size={18} />
                              <span>Decline</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmAction.action === "approve"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {confirmAction.action === "approve" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {confirmAction.action === "approve"
                    ? "Approve Partner"
                    : "Reject Partner"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to{" "}
                  <span className="font-semibold">
                    {confirmAction.action === "approve" ? "approve" : "reject"}
                  </span>{" "}
                  <span className="font-semibold">
                    {confirmAction.partnerName}
                  </span>
                  ?{" "}
                  {confirmAction.action === "approve"
                    ? "They will be able to access delivery operations."
                    : "They will not be able to access your shop."}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(confirmAction.partnerId, confirmAction.action)
                }
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-white transition-colors font-medium ${
                  confirmAction.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmAction.action === "approve"
                  ? "Yes, Approve"
                  : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}