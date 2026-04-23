// ice-inventory\src\app\admin\users\[userId]\page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, User, Store, Phone, Mail, Calendar, CheckCircle, XCircle,
  Edit3, Save, X, Plus, Trash2, Clock, CreditCard, Package, AlertTriangle,
  RefreshCw, Copy, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  _id: string; name: string; email: string; phone?: string;
  shopName?: string; shopAddress?: string; isVerified: boolean;
  createdAt: string; lastLogin?: string;
}

interface Subscription {
  _id: string; planId: string; billingPeriod: string; status: string;
  startDate: string; currentPeriodEnd?: string; trialEndsAt?: string;
  invoicesUsedThisMonth: number; invoicesUsedTotal: number;
  invoiceCountResetAt: string;
  customLimits?: {
    maxInvoicesPerMonth?: number; maxCustomers?: number; maxProducts?: number;
    maxManagers?: number; maxDeliveryPartners?: number;
    hasDeliveryModule?: boolean; hasLiveTracking?: boolean; hasAdvancedReports?: boolean;
  };
}

interface AddOn {
  _id: string; addonType: string; quantity: number; expiresAt: string;
  isActive: boolean; createdAt: string; manuallyGranted?: boolean;
}

interface PaymentRecord {
  _id: string; type: string; planId?: string; billingPeriod?: string;
  addonType?: string; amount: number; status: string;
  razorpayOrderId?: string; razorpayPaymentId?: string; createdAt: string;
}

interface SubEditForm {
  planId: string; billingPeriod: string; status: string; currentPeriodEnd: string;
  customLimits: {
    maxInvoicesPerMonth: string; maxCustomers: string; maxProducts: string;
    maxManagers: string; maxDeliveryPartners: string;
    hasDeliveryModule: boolean; hasLiveTracking: boolean; hasAdvancedReports: boolean;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b", launch: "#3b82f6", scale: "#8b5cf6",
  business: "#10b981", customize: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", expired: "#ef4444", grace: "#f97316", cancelled: "#6b7280",
  pending: "#f59e0b", captured: "#10b981", failed: "#ef4444", refunded: "#6b7280",
};

const PLAN_OPTIONS = ["free_trial", "launch", "scale", "business", "customize"];
const BILLING_OPTIONS = ["monthly", "sixmonths", "yearly"];
const STATUS_OPTIONS = ["active", "expired", "grace", "cancelled"];
const ADDON_TYPES = [
  "extra_100_invoices", "extra_250_invoices", "extra_500_invoices",
  "extra_5_customers", "extra_10_customers", "extra_20_customers",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(paise / 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyableText({ text }: { text?: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return <span className="text-gray-700">—</span>;
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span
      onClick={copy}
      title="Click to copy"
      className="inline-flex items-center gap-1 cursor-pointer font-mono text-[11.5px] text-gray-400 hover:text-slate-300 transition-colors"
    >
      {text.length > 20 ? text.slice(0, 20) + "…" : text}
      {copied ? <Check size={11} color="#10b981" /> : <Copy size={11} color="#4b5563" />}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 px-5 py-3 border-b border-[#111827]">
      <div className="text-gray-700 mt-0.5 shrink-0"><Icon size={13} /></div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-[0.04em]">{label}</p>
        <p className="text-[13.5px] text-slate-300 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<SubEditForm>({
    planId: "",
    billingPeriod: "monthly",
    status: "active",
    currentPeriodEnd: "",
    customLimits: {
      maxInvoicesPerMonth: "", maxCustomers: "", maxProducts: "",
      maxManagers: "", maxDeliveryPartners: "",
      hasDeliveryModule: false, hasLiveTracking: false, hasAdvancedReports: false,
    },
  });

  const [grantForm, setGrantForm] = useState({
    addonType: ADDON_TYPES[0], quantity: "1", open: false, loading: false, error: "",
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUser = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user");

      const data = await res.json();
      setUser(data.user);
      setSubscription(data.subscription);
      setAddOns(data.addOns || []);
      setPayments(data.payments || []);

      if (data.subscription) {
        const sub = data.subscription;
        setEditForm({
          planId: sub.planId,
          billingPeriod: sub.billingPeriod || "monthly",
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString().split("T")[0] : "",
          customLimits: {
            maxInvoicesPerMonth: sub.customLimits?.maxInvoicesPerMonth?.toString() || "",
            maxCustomers: sub.customLimits?.maxCustomers?.toString() || "",
            maxProducts: sub.customLimits?.maxProducts?.toString() || "",
            maxManagers: sub.customLimits?.maxManagers?.toString() || "",
            maxDeliveryPartners: sub.customLimits?.maxDeliveryPartners?.toString() || "",
            hasDeliveryModule: sub.customLimits?.hasDeliveryModule || false,
            hasLiveTracking: sub.customLimits?.hasLiveTracking || false,
            hasAdvancedReports: sub.customLimits?.hasAdvancedReports || false,
          },
        });
      }
    } catch {
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  // ─── Save Subscription ───────────────────────────────────────────────────────

  const handleSaveSubscription = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, unknown> = {
        planId: editForm.planId,
        billingPeriod: editForm.billingPeriod,
        status: editForm.status,
        ...(editForm.currentPeriodEnd && { currentPeriodEnd: editForm.currentPeriodEnd }),
        ...(editForm.planId === "customize" && {
          customLimits: {
            maxInvoicesPerMonth: editForm.customLimits.maxInvoicesPerMonth ? parseInt(editForm.customLimits.maxInvoicesPerMonth) : undefined,
            maxCustomers: editForm.customLimits.maxCustomers ? parseInt(editForm.customLimits.maxCustomers) : undefined,
            maxProducts: editForm.customLimits.maxProducts ? parseInt(editForm.customLimits.maxProducts) : undefined,
            maxManagers: editForm.customLimits.maxManagers ? parseInt(editForm.customLimits.maxManagers) : undefined,
            maxDeliveryPartners: editForm.customLimits.maxDeliveryPartners ? parseInt(editForm.customLimits.maxDeliveryPartners) : undefined,
            hasDeliveryModule: editForm.customLimits.hasDeliveryModule,
            hasLiveTracking: editForm.customLimits.hasLiveTracking,
            hasAdvancedReports: editForm.customLimits.hasAdvancedReports,
          },
        }),
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      setSaveSuccess("Subscription updated successfully");
      setEditMode(false);
      fetchUser();
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateAddOn = async (addOnId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ addOnId, isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to deactivate");
      fetchUser();
    } catch {
      alert("Failed to deactivate add-on");
    }
  };

  const handleGrantAddOn = async () => {
    setGrantForm((f) => ({ ...f, loading: true, error: "" }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/addons", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          addonType: grantForm.addonType,
          quantity: parseInt(grantForm.quantity),
          manuallyGranted: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to grant add-on");
      }
      setGrantForm((f) => ({ ...f, open: false, loading: false }));
      fetchUser();
    } catch (err: unknown) {
      setGrantForm((f) => ({
        ...f, loading: false,
        error: err instanceof Error ? err.message : "Failed to grant add-on",
      }));
    }
  };

  // ─── Shared class strings ─────────────────────────────────────────────────

  const cardCls = "bg-[#0d1117] border border-[#1e2530] rounded-xl overflow-hidden";
  const cardHeaderCls = "flex items-center gap-2 px-5 py-4 border-b border-[#1a2232]";
  const formSelectCls = "flex-1 bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-blue-500 transition-colors";
  const formInputCls = "flex-1 bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-blue-500 transition-colors";
  const editBtnCls = "flex items-center gap-1.5 bg-blue-500/[0.08] border border-blue-500/20 text-blue-400 px-[11px] py-[5px] rounded-[7px] text-[12.5px] cursor-pointer hover:bg-blue-500/[0.15] transition-all";
  const saveBtnCls = "flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-[11px] py-[5px] rounded-[7px] text-[12.5px] cursor-pointer hover:bg-emerald-500/[0.18] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const cancelBtnCls = "flex items-center gap-1.5 bg-gray-500/10 border border-gray-500/20 text-gray-400 px-[11px] py-[5px] rounded-[7px] text-[12.5px] cursor-pointer hover:bg-gray-500/[0.18] transition-all";
  const thCls = "text-[11px] font-semibold text-gray-600 uppercase tracking-[0.05em] px-4 py-[10px] text-left border-b border-[#1a2232] bg-[#0a0f18] whitespace-nowrap";
  const tdCls = "px-4 py-[10px] text-[13px] text-gray-400 border-b border-[#111827] align-middle";

  // ─── Render: loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-gray-600 text-[13px]">
        <div className="w-6 h-6 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
        <p>Loading user details...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-red-400 text-[14px]">
        <AlertTriangle size={20} />
        <p>{error || "User not found"}</p>
        <button
          onClick={() => router.push("/admin/users")}
          className="bg-[#0d1117] border border-[#1e2530] text-gray-400 px-4 py-2 rounded-lg cursor-pointer text-[13px] mt-2 hover:border-[#2d3748] transition-colors"
        >
          ← Back to Users
        </button>
      </div>
    );
  }

  const plan = subscription?.planId || "free_trial";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/users")}
          className="flex items-center gap-1.5 bg-transparent border-none text-gray-500 text-[13px] cursor-pointer py-1.5 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Users
        </button>
        <button
          onClick={fetchUser}
          className="flex items-center gap-1.5 bg-[#0d1117] border border-[#1e2530] text-gray-400 px-3.5 py-[7px] rounded-lg text-[12.5px] cursor-pointer hover:border-[#2d3748] hover:text-slate-300 transition-all"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Banners */}
      {saveSuccess && (
        <div className="flex items-center gap-2 bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 px-3.5 py-2.5 rounded-lg text-[13px]">
          <CheckCircle size={14} />{saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-2 bg-red-500/[0.08] border border-red-500/20 text-red-300 px-3.5 py-2.5 rounded-lg text-[13px]">
          <AlertTriangle size={14} />{saveError}
        </div>
      )}

      {/* ── User Info Card ── */}
      <div className={cardCls}>
        <div className={cardHeaderCls}>
          <User size={15} className="text-blue-500" />
          <h2 className="text-[14px] font-semibold text-slate-300 flex-1">User Information</h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {user.isVerified
              ? <><CheckCircle size={13} color="#10b981" /> Verified</>
              : <><XCircle size={13} color="#ef4444" /> Unverified</>
            }
          </div>
        </div>
        <div className="grid grid-cols-3 max-[1100px]:grid-cols-2">
          <InfoRow icon={User} label="Full Name" value={user.name || "—"} />
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Phone} label="Phone" value={user.phone || "—"} />
          <InfoRow icon={Store} label="Shop Name" value={user.shopName || "—"} />
          <InfoRow icon={Store} label="Shop Address" value={user.shopAddress || "—"} />
          <InfoRow icon={Calendar} label="Registered" value={formatDate(user.createdAt)} />
          <InfoRow icon={Clock} label="Last Login" value={formatDate(user.lastLogin)} />
        </div>
      </div>

      {/* ── Subscription Card ── */}
      <div className={cardCls}>
        <div className={cardHeaderCls}>
          <CreditCard size={15} className="text-blue-500" />
          <h2 className="text-[14px] font-semibold text-slate-300 flex-1">Subscription</h2>
          <div className="flex gap-2">
            {!editMode && (
              <button className={editBtnCls} onClick={() => setEditMode(true)}>
                <Edit3 size={13} />Edit
              </button>
            )}
            {editMode && (
              <>
                <button className={saveBtnCls} onClick={handleSaveSubscription} disabled={saving}>
                  <Save size={13} />{saving ? "Saving..." : "Save"}
                </button>
                <button className={cancelBtnCls} onClick={() => { setEditMode(false); setSaveError(""); }}>
                  <X size={13} />Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {!subscription ? (
          <p className="px-5 py-6 text-gray-600 text-[13px] italic">No subscription found for this user.</p>
        ) : !editMode ? (
          /* Read-only view */
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-md border tracking-[0.05em]"
                style={{
                  background: `${PLAN_COLORS[plan] || "#6b7280"}18`,
                  color: PLAN_COLORS[plan] || "#6b7280",
                  borderColor: `${PLAN_COLORS[plan] || "#6b7280"}30`,
                }}
              >
                {plan.replace("_", " ").toUpperCase()}
              </span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
                style={{
                  background: `${STATUS_COLORS[subscription.status] || "#6b7280"}18`,
                  color: STATUS_COLORS[subscription.status] || "#6b7280",
                }}
              >
                {subscription.status}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 capitalize">
                {subscription.billingPeriod}
              </span>
            </div>
            <div className="grid grid-cols-3 max-[1100px]:grid-cols-2 -mx-5">
              <InfoRow icon={Calendar} label="Start Date" value={formatDate(subscription.startDate)} />
              <InfoRow icon={Calendar} label="Period End" value={subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "No expiry"} />
              {subscription.trialEndsAt && <InfoRow icon={Clock} label="Trial Ends" value={formatDate(subscription.trialEndsAt)} />}
              <InfoRow icon={Calendar} label="Invoice Reset" value={formatDate(subscription.invoiceCountResetAt)} />
              <InfoRow icon={CreditCard} label="Invoices This Month" value={`${subscription.invoicesUsedThisMonth} used`} />
              <InfoRow icon={CreditCard} label="Invoices Total" value={`${subscription.invoicesUsedTotal} used`} />
            </div>

            {subscription.planId === "customize" && subscription.customLimits && (
              <div className="border-t border-[#1a2232] pt-4">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.06em] mb-3">Custom Limits</p>
                <div className="grid grid-cols-4 max-[1100px]:grid-cols-2 gap-2">
                  {Object.entries(subscription.customLimits).map(([key, val]) => (
                    <div key={key} className="bg-[#111827] rounded-md px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-600 font-semibold uppercase tracking-[0.04em]">{key}</span>
                      <span className="text-[14px] font-semibold text-slate-300">
                        {typeof val === "boolean" ? (val ? "✓" : "✗") : val?.toString() || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Edit form */
          <div className="px-5 py-5 flex flex-col gap-3">
            {[
              { label: "Plan", key: "planId", options: PLAN_OPTIONS },
              { label: "Billing Period", key: "billingPeriod", options: BILLING_OPTIONS },
              { label: "Status", key: "status", options: STATUS_OPTIONS },
            ].map(({ label, key, options }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-[12.5px] text-gray-500 font-medium w-40 shrink-0">{label}</label>
                <select
                  className={formSelectCls}
                  value={editForm[key as keyof SubEditForm] as string}
                  onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                >
                  {options.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <label className="text-[12.5px] text-gray-500 font-medium w-40 shrink-0">Extend Period End</label>
              <input
                type="date"
                className={formInputCls}
                value={editForm.currentPeriodEnd}
                onChange={(e) => setEditForm((f) => ({ ...f, currentPeriodEnd: e.target.value }))}
                style={{ colorScheme: "dark" }}
              />
            </div>

            {editForm.planId === "customize" && (
              <div className="border-t border-[#1a2232] pt-4 mt-2">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.06em] mb-3">Custom Limits</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["maxInvoicesPerMonth","maxCustomers","maxProducts","maxManagers","maxDeliveryPartners"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-[12.5px] text-gray-500 font-medium w-40 shrink-0 capitalize">
                        {key.replace(/([A-Z])/g, " $1").replace("max", "Max ")}
                      </label>
                      <input
                        type="number"
                        className={formInputCls}
                        value={editForm.customLimits[key]}
                        onChange={(e) => setEditForm((f) => ({ ...f, customLimits: { ...f.customLimits, [key]: e.target.value } }))}
                      />
                    </div>
                  ))}
                  {(["hasDeliveryModule","hasLiveTracking","hasAdvancedReports"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-[12.5px] text-gray-500 font-medium w-40 shrink-0 capitalize">
                        {key.replace(/([A-Z])/g, " $1").replace("has", "").trim()}
                      </label>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                        checked={editForm.customLimits[key]}
                        onChange={(e) => setEditForm((f) => ({ ...f, customLimits: { ...f.customLimits, [key]: e.target.checked } }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add-ons Card ── */}
      <div className={cardCls}>
        <div className={cardHeaderCls}>
          <Package size={15} className="text-blue-500" />
          <h2 className="text-[14px] font-semibold text-slate-300 flex-1">Active Add-ons</h2>
          <button className={editBtnCls} onClick={() => setGrantForm((f) => ({ ...f, open: !f.open }))}>
            <Plus size={13} />Grant Add-on
          </button>
        </div>

        {grantForm.open && (
          <div className="px-5 py-3.5 border-b border-[#1a2232] bg-[#0a0f18] flex flex-col gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                className="bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-blue-500 transition-colors"
                value={grantForm.addonType}
                onChange={(e) => setGrantForm((f) => ({ ...f, addonType: e.target.value }))}
              >
                {ADDON_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <input
                type="number"
                className="w-20 bg-[#111827] border border-[#1e2530] rounded-[7px] px-3 py-[7px] text-[13px] text-slate-200 outline-none focus:border-blue-500 transition-colors"
                placeholder="Qty"
                value={grantForm.quantity}
                min="1"
                onChange={(e) => setGrantForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <button className={saveBtnCls} onClick={handleGrantAddOn} disabled={grantForm.loading}>
                {grantForm.loading ? "Granting..." : "Confirm Grant"}
              </button>
              <button className={cancelBtnCls} onClick={() => setGrantForm((f) => ({ ...f, open: false, error: "" }))}>
                Cancel
              </button>
            </div>
            {grantForm.error && <p className="text-xs text-red-400">{grantForm.error}</p>}
          </div>
        )}

        {addOns.length === 0 ? (
          <p className="px-5 py-6 text-gray-600 text-[13px] italic">No add-ons for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Type", "Qty", "Expires", "Status", "Source", "Action"].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addOns.map((a) => (
                  <tr key={a._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                    <td className={`${tdCls} text-[12.5px] text-slate-300 capitalize`}>{a.addonType.replace(/_/g, " ")}</td>
                    <td className={tdCls}>{a.quantity}</td>
                    <td className={`${tdCls} text-xs text-gray-600 whitespace-nowrap`}>{formatDate(a.expiresAt)}</td>
                    <td className={tdCls}>
                      <span className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[4px]"
                        style={{
                          background: a.isActive ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                          color: a.isActive ? "#34d399" : "#9ca3af",
                        }}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-[11px] text-gray-600 bg-gray-500/10 px-[7px] py-[2px] rounded-[4px]">
                        {a.manuallyGranted ? "Manual" : "Payment"}
                      </span>
                    </td>
                    <td className={tdCls}>
                      {a.isActive && (
                        <button
                          onClick={() => handleDeactivateAddOn(a._id)}
                          className="flex items-center gap-1.5 bg-red-500/[0.08] border border-red-500/20 text-red-400 px-2.5 py-1 rounded-[5px] text-[11.5px] cursor-pointer hover:bg-red-500/[0.15] transition-all whitespace-nowrap"
                        >
                          <Trash2 size={12} />Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payment History Card ── */}
      <div className={cardCls}>
        <div className={cardHeaderCls}>
          <CreditCard size={15} className="text-blue-500" />
          <h2 className="text-[14px] font-semibold text-slate-300 flex-1">Payment History</h2>
        </div>

        {payments.length === 0 ? (
          <p className="px-5 py-6 text-gray-600 text-[13px] italic">No payments found for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Date", "Type", "Details", "Amount", "Status", "Order ID", "Payment ID"].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-b border-[#111827] last:border-b-0 hover:bg-[#0f1623] transition-colors">
                    <td className={`${tdCls} text-xs text-gray-600 whitespace-nowrap`}>{formatDate(p.createdAt)}</td>
                    <td className={tdCls}>
                      <span className="text-[11px] font-semibold px-[7px] py-[2px] rounded-[4px] bg-blue-500/10 text-blue-400 capitalize">
                        {p.type}
                      </span>
                    </td>
                    <td className={`${tdCls} text-[12.5px] text-slate-300`}>
                      {p.planId || p.addonType || "—"}
                      {p.billingPeriod && <span className="text-[11.5px] text-gray-600"> · {p.billingPeriod}</span>}
                    </td>
                    <td className={`${tdCls} font-semibold text-emerald-400`}>{formatINR(p.amount)}</td>
                    <td className={tdCls}>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] whitespace-nowrap"
                        style={{
                          background: `${STATUS_COLORS[p.status] || "#6b7280"}18`,
                          color: STATUS_COLORS[p.status] || "#9ca3af",
                        }}>
                        {p.status}
                      </span>
                    </td>
                    <td className={tdCls}><CopyableText text={p.razorpayOrderId} /></td>
                    <td className={tdCls}><CopyableText text={p.razorpayPaymentId} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}