// src/app/dashboard/delivery-requests/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { Check, X } from "lucide-react";
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
            if (maybeUser?.email) setAdminEmail(String(maybeUser.email).toLowerCase());
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
  useEffect(() => {
    async function load() {
      if (!userId && !adminEmail) {
        // allow UI to show helpful message rather than just failing
        setErrorMsg("Provide ?userId=... or ?adminEmail=... in URL, or ensure session endpoint exists.");
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
        // handle potential non-JSON gracefully
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
    }

    load();
  }, [userId, adminEmail]);

  // Accept / Reject handler (robust JSON parsing and error handling)
  async function handleAction(partnerId: string, action: "approve" | "reject") {
    if (!userId && !adminEmail) {
      alert("Missing admin identity. Provide ?userId or ?adminEmail in URL.");
      return;
    }

    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this delivery partner?`)) return;

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

      // parse JSON if present — guard against empty replies
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err = data?.error ?? data?.message ?? res.statusText ?? "Action failed";
        alert(String(err));
      } else {
        // success — remove from list and show a small friendly message
        setPartners((p) => p.filter((x) => x._id !== partnerId));
        alert(action === "approve" ? "Partner approved." : "Partner rejected.");
      }
    } catch (err) {
      console.error(err);
      alert("Action failed. See console for details.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardNavbar userId={userId ?? undefined} />

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Delivery Partner Requests</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Approve or decline delivery partners who have requested access to your shop.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700">
                  {loading ? "Loading..." : `${partners.length} pending`}
                </div>
                <a
                  href={adminEmail ? `/dashboard/delivery-requests?adminEmail=${encodeURIComponent(adminEmail)}` : "/dashboard/delivery-requests"}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                >
                  Refresh
                </a>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {loading && (
              <div className="py-10 text-center text-gray-500">Loading requests…</div>
            )}

            {!loading && partners.length === 0 && (
              <div className="rounded-lg border p-6 text-center text-gray-600">No pending delivery partner requests.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {partners.map((p) => (
                <article key={p._id} className="bg-white border rounded-lg shadow-sm p-4 flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-medium text-slate-600 overflow-hidden">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      p.name?.charAt(0)?.toUpperCase() ?? "D"
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{p.name}</h3>
                          <div className="text-sm text-gray-600">{p.email}</div>
                          {p.phone && <div className="text-sm text-gray-600">📞 {p.phone}</div>}
                        </div>

                        <div className="text-xs text-gray-500">
                          Requested: {p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}
                        </div>
                      </div>

                      {p.metadata && Object.keys(p.metadata).length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          {/* render a couple of useful metadata fields (if any) */}
                          {Object.entries(p.metadata).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="inline-block mr-3">
                              <span className="font-medium capitalize">{k}:</span> <span>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={workingId === p._id}
                        onClick={() => handleAction(p._id, "approve")}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded bg-green-600 text-white hover:opacity-90 transition ${workingId === p._id ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <Check size={16} /> Accept
                      </button>

                      <button
                        disabled={workingId === p._id}
                        onClick={() => handleAction(p._id, "reject")}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-600 text-white hover:opacity-90 transition ${workingId === p._id ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
