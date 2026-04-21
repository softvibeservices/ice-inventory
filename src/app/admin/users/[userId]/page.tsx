// ice-inventory\src\app\admin\users\[userId]\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Store,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Clock,
  CreditCard,
  Package,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  shopName?: string;
  shopAddress?: string;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Subscription {
  _id: string;
  planId: string;
  billingPeriod: string;
  status: string;
  startDate: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  invoicesUsedThisMonth: number;
  invoicesUsedTotal: number;
  invoiceCountResetAt: string;
  customLimits?: {
    maxInvoicesPerMonth?: number;
    maxCustomers?: number;
    maxProducts?: number;
    maxManagers?: number;
    maxDeliveryPartners?: number;
    hasDeliveryModule?: boolean;
    hasLiveTracking?: boolean;
    hasAdvancedReports?: boolean;
  };
}

interface AddOn {
  _id: string;
  addonType: string;
  quantity: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  manuallyGranted?: boolean;
}

interface PaymentRecord {
  _id: string;
  type: string;
  planId?: string;
  billingPeriod?: string;
  addonType?: string;
  amount: number;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

interface SubEditForm {
  planId: string;
  billingPeriod: string;
  status: string;
  currentPeriodEnd: string;
  customLimits: {
    maxInvoicesPerMonth: string;
    maxCustomers: string;
    maxProducts: string;
    maxManagers: string;
    maxDeliveryPartners: string;
    hasDeliveryModule: boolean;
    hasLiveTracking: boolean;
    hasAdvancedReports: boolean;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free_trial: "#f59e0b",
  launch: "#3b82f6",
  scale: "#8b5cf6",
  business: "#10b981",
  customize: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  expired: "#ef4444",
  grace: "#f97316",
  cancelled: "#6b7280",
  pending: "#f59e0b",
  captured: "#10b981",
  failed: "#ef4444",
  refunded: "#6b7280",
};

const PLAN_OPTIONS = ["free_trial", "launch", "scale", "business", "customize"];
const BILLING_OPTIONS = ["monthly", "sixmonths", "yearly"];
const STATUS_OPTIONS = ["active", "expired", "grace", "cancelled"];
const ADDON_TYPES = [
  "extra_100_invoices",
  "extra_250_invoices",
  "extra_500_invoices",
  "extra_5_customers",
  "extra_10_customers",
  "extra_20_customers",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function CopyableText({ text }: { text?: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return <span className="muted">—</span>;

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="copyable" onClick={copy} title="Click to copy">
      {text.length > 20 ? text.slice(0, 20) + "…" : text}
      {copied ? (
        <Check size={11} color="#10b981" />
      ) : (
        <Copy size={11} color="#4b5563" />
      )}
      <style jsx>{`
        .copyable {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-family: "JetBrains Mono", monospace;
          font-size: 11.5px;
          color: #9ca3af;
        }
        .copyable:hover {
          color: #cbd5e1;
        }
        .muted {
          color: #4b5563;
        }
      `}</style>
    </span>
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
      maxInvoicesPerMonth: "",
      maxCustomers: "",
      maxProducts: "",
      maxManagers: "",
      maxDeliveryPartners: "",
      hasDeliveryModule: false,
      hasLiveTracking: false,
      hasAdvancedReports: false,
    },
  });

  const [grantForm, setGrantForm] = useState({
    addonType: ADDON_TYPES[0],
    quantity: "1",
    open: false,
    loading: false,
    error: "",
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

      // Pre-fill edit form
      if (data.subscription) {
        const sub = data.subscription;
        setEditForm({
          planId: sub.planId,
          billingPeriod: sub.billingPeriod || "monthly",
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd
            ? new Date(sub.currentPeriodEnd).toISOString().split("T")[0]
            : "",
          customLimits: {
            maxInvoicesPerMonth:
              sub.customLimits?.maxInvoicesPerMonth?.toString() || "",
            maxCustomers: sub.customLimits?.maxCustomers?.toString() || "",
            maxProducts: sub.customLimits?.maxProducts?.toString() || "",
            maxManagers: sub.customLimits?.maxManagers?.toString() || "",
            maxDeliveryPartners:
              sub.customLimits?.maxDeliveryPartners?.toString() || "",
            hasDeliveryModule: sub.customLimits?.hasDeliveryModule || false,
            hasLiveTracking: sub.customLimits?.hasLiveTracking || false,
            hasAdvancedReports: sub.customLimits?.hasAdvancedReports || false,
          },
        });
      }
    } catch (err) {
      setError("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

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
        ...(editForm.currentPeriodEnd && {
          currentPeriodEnd: editForm.currentPeriodEnd,
        }),
        ...(editForm.planId === "customize" && {
          customLimits: {
            maxInvoicesPerMonth: editForm.customLimits.maxInvoicesPerMonth
              ? parseInt(editForm.customLimits.maxInvoicesPerMonth)
              : undefined,
            maxCustomers: editForm.customLimits.maxCustomers
              ? parseInt(editForm.customLimits.maxCustomers)
              : undefined,
            maxProducts: editForm.customLimits.maxProducts
              ? parseInt(editForm.customLimits.maxProducts)
              : undefined,
            maxManagers: editForm.customLimits.maxManagers
              ? parseInt(editForm.customLimits.maxManagers)
              : undefined,
            maxDeliveryPartners: editForm.customLimits.maxDeliveryPartners
              ? parseInt(editForm.customLimits.maxDeliveryPartners)
              : undefined,
            hasDeliveryModule: editForm.customLimits.hasDeliveryModule,
            hasLiveTracking: editForm.customLimits.hasLiveTracking,
            hasAdvancedReports: editForm.customLimits.hasAdvancedReports,
          },
        }),
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

  // ─── Deactivate AddOn ─────────────────────────────────────────────────────

  const handleDeactivateAddOn = async (addOnId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/addons`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ addOnId, isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to deactivate");
      fetchUser();
    } catch (err) {
      alert("Failed to deactivate add-on");
    }
  };

  // ─── Grant AddOn ──────────────────────────────────────────────────────────

  const handleGrantAddOn = async () => {
    setGrantForm((f) => ({ ...f, loading: true, error: "" }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/addons`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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
        ...f,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to grant add-on",
      }));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading user details...</p>
        <style jsx>{`
          .page-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 12px;
            color: #4b5563;
            font-size: 13px;
          }
          .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid #1e2530;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-error">
        <AlertTriangle size={20} color="#ef4444" />
        <p>{error || "User not found"}</p>
        <button className="back-btn" onClick={() => router.push("/admin/users")}>
          ← Back to Users
        </button>
        <style jsx>{`
          .page-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 12px;
            color: #ef4444;
            font-size: 14px;
          }
          .back-btn {
            background: #0d1117;
            border: 1px solid #1e2530;
            color: #9ca3af;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            margin-top: 8px;
          }
        `}</style>
      </div>
    );
  }

  const plan = subscription?.planId || "free_trial";

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="back-link" onClick={() => router.push("/admin/users")}>
          <ArrowLeft size={14} />
          Users
        </button>
        <button
          className="refresh-btn"
          onClick={fetchUser}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Success / Error banners */}
      {saveSuccess && (
        <div className="success-banner">
          <CheckCircle size={14} />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="error-banner">
          <AlertTriangle size={14} />
          {saveError}
        </div>
      )}

      {/* User Info Card */}
      <div className="card">
        <div className="card-header">
          <User size={15} className="card-icon" />
          <h2 className="card-title">User Information</h2>
          <div className="user-verified">
            {user.isVerified ? (
              <><CheckCircle size={13} color="#10b981" /> Verified</>
            ) : (
              <><XCircle size={13} color="#ef4444" /> Unverified</>
            )}
          </div>
        </div>
        <div className="info-grid">
          <InfoRow icon={User} label="Full Name" value={user.name || "—"} />
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={Phone} label="Phone" value={user.phone || "—"} />
          <InfoRow icon={Store} label="Shop Name" value={user.shopName || "—"} />
          <InfoRow icon={Store} label="Shop Address" value={user.shopAddress || "—"} />
          <InfoRow icon={Calendar} label="Registered" value={formatDate(user.createdAt)} />
          <InfoRow icon={Clock} label="Last Login" value={formatDate(user.lastLogin)} />
        </div>
      </div>

      {/* Subscription Card */}
      <div className="card">
        <div className="card-header">
          <CreditCard size={15} className="card-icon" />
          <h2 className="card-title">Subscription</h2>
          <div className="card-actions">
            {!editMode && (
              <button className="edit-btn" onClick={() => setEditMode(true)}>
                <Edit3 size={13} />
                Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  className="save-btn"
                  onClick={handleSaveSubscription}
                  disabled={saving}
                >
                  <Save size={13} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => { setEditMode(false); setSaveError(""); }}
                >
                  <X size={13} />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {!subscription ? (
          <p className="no-data">No subscription found for this user.</p>
        ) : !editMode ? (
          /* Read-only view */
          <div className="sub-view">
            <div className="sub-top">
              <span
                className="plan-pill"
                style={{
                  background: `${PLAN_COLORS[plan] || "#6b7280"}18`,
                  color: PLAN_COLORS[plan] || "#6b7280",
                  borderColor: `${PLAN_COLORS[plan] || "#6b7280"}30`,
                }}
              >
                {plan.replace("_", " ").toUpperCase()}
              </span>
              <span
                className="status-pill"
                style={{
                  background: `${STATUS_COLORS[subscription.status] || "#6b7280"}18`,
                  color: STATUS_COLORS[subscription.status] || "#6b7280",
                }}
              >
                {subscription.status}
              </span>
              <span className="period-pill">{subscription.billingPeriod}</span>
            </div>
            <div className="info-grid">
              <InfoRow icon={Calendar} label="Start Date" value={formatDate(subscription.startDate)} />
              <InfoRow
                icon={Calendar}
                label="Period End"
                value={subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "No expiry (free trial)"}
              />
              {subscription.trialEndsAt && (
                <InfoRow icon={Clock} label="Trial Ends" value={formatDate(subscription.trialEndsAt)} />
              )}
              <InfoRow icon={Calendar} label="Invoice Reset Date" value={formatDate(subscription.invoiceCountResetAt)} />
              <InfoRow
                icon={CreditCard}
                label="Invoices This Month"
                value={`${subscription.invoicesUsedThisMonth} used`}
              />
              <InfoRow
                icon={CreditCard}
                label="Invoices Total"
                value={`${subscription.invoicesUsedTotal} used`}
              />
            </div>

            {subscription.planId === "customize" && subscription.customLimits && (
              <div className="custom-limits">
                <p className="sub-section-label">Custom Limits</p>
                <div className="limits-grid">
                  {Object.entries(subscription.customLimits).map(([key, val]) => (
                    <div className="limit-item" key={key}>
                      <span className="limit-key">{key}</span>
                      <span className="limit-val">
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
          <div className="edit-form">
            <div className="form-row">
              <label className="form-label">Plan</label>
              <select
                className="form-select"
                value={editForm.planId}
                onChange={(e) => setEditForm((f) => ({ ...f, planId: e.target.value }))}
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Billing Period</label>
              <select
                className="form-select"
                value={editForm.billingPeriod}
                onChange={(e) => setEditForm((f) => ({ ...f, billingPeriod: e.target.value }))}
              >
                {BILLING_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Extend Period End</label>
              <input
                type="date"
                className="form-input"
                value={editForm.currentPeriodEnd}
                onChange={(e) => setEditForm((f) => ({ ...f, currentPeriodEnd: e.target.value }))}
              />
            </div>

            {editForm.planId === "customize" && (
              <div className="custom-section">
                <p className="sub-section-label">Custom Limits</p>
                <div className="form-grid">
                  {(
                    [
                      ["maxInvoicesPerMonth", "Max Invoices/Month"],
                      ["maxCustomers", "Max Customers"],
                      ["maxProducts", "Max Products"],
                      ["maxManagers", "Max Managers"],
                      ["maxDeliveryPartners", "Max Delivery Partners"],
                    ] as const
                  ).map(([key, label]) => (
                    <div className="form-row" key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.customLimits[key as keyof typeof editForm.customLimits] as string}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            customLimits: { ...f.customLimits, [key]: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ))}

                  {(
                    [
                      ["hasDeliveryModule", "Delivery Module"],
                      ["hasLiveTracking", "Live Tracking"],
                      ["hasAdvancedReports", "Advanced Reports"],
                    ] as const
                  ).map(([key, label]) => (
                    <div className="form-row form-check" key={key}>
                      <label className="form-label">{label}</label>
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={editForm.customLimits[key as keyof typeof editForm.customLimits] as boolean}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            customLimits: { ...f.customLimits, [key]: e.target.checked },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add-ons Card */}
      <div className="card">
        <div className="card-header">
          <Package size={15} className="card-icon" />
          <h2 className="card-title">Active Add-ons</h2>
          <button
            className="edit-btn"
            onClick={() => setGrantForm((f) => ({ ...f, open: !f.open }))}
          >
            <Plus size={13} />
            Grant Add-on
          </button>
        </div>

        {/* Grant form */}
        {grantForm.open && (
          <div className="grant-form">
            <div className="grant-row">
              <select
                className="form-select"
                value={grantForm.addonType}
                onChange={(e) => setGrantForm((f) => ({ ...f, addonType: e.target.value }))}
              >
                {ADDON_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                placeholder="Qty"
                value={grantForm.quantity}
                min="1"
                onChange={(e) => setGrantForm((f) => ({ ...f, quantity: e.target.value }))}
                style={{ width: "80px" }}
              />
              <button
                className="save-btn"
                onClick={handleGrantAddOn}
                disabled={grantForm.loading}
              >
                {grantForm.loading ? "Granting..." : "Confirm Grant"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setGrantForm((f) => ({ ...f, open: false, error: "" }))}
              >
                Cancel
              </button>
            </div>
            {grantForm.error && (
              <p className="grant-error">{grantForm.error}</p>
            )}
          </div>
        )}

        {addOns.length === 0 ? (
          <p className="no-data">No add-ons for this user.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {addOns.map((a) => (
                  <tr key={a._id}>
                    <td className="addon-type">{a.addonType.replace(/_/g, " ")}</td>
                    <td>{a.quantity}</td>
                    <td className="date-cell">{formatDate(a.expiresAt)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: a.isActive ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                          color: a.isActive ? "#34d399" : "#9ca3af",
                        }}
                      >
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <span className="source-badge">
                        {a.manuallyGranted ? "Manual" : "Payment"}
                      </span>
                    </td>
                    <td>
                      {a.isActive && (
                        <button
                          className="deactivate-btn"
                          onClick={() => handleDeactivateAddOn(a._id)}
                        >
                          <Trash2 size={12} />
                          Deactivate
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

      {/* Payment History Card */}
      <div className="card">
        <div className="card-header">
          <CreditCard size={15} className="card-icon" />
          <h2 className="card-title">Payment History</h2>
        </div>

        {payments.length === 0 ? (
          <p className="no-data">No payments found for this user.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Order ID</th>
                  <th>Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="date-cell">{formatDate(p.createdAt)}</td>
                    <td>
                      <span className="type-badge">{p.type}</span>
                    </td>
                    <td className="details-cell">
                      {p.planId || p.addonType || "—"}
                      {p.billingPeriod && (
                        <span className="period-tag"> · {p.billingPeriod}</span>
                      )}
                    </td>
                    <td className="amount-cell">{formatINR(p.amount)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${STATUS_COLORS[p.status] || "#6b7280"}18`,
                          color: STATUS_COLORS[p.status] || "#6b7280",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <CopyableText text={p.razorpayOrderId} />
                    </td>
                    <td>
                      <CopyableText text={p.razorpayPaymentId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Styles ─────────────────────────────────────────────────────────── */}
      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #6b7280;
          font-size: 13px;
          cursor: pointer;
          padding: 6px 0;
          transition: color 0.15s;
        }

        .back-link:hover {
          color: #cbd5e1;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0d1117;
          border: 1px solid #1e2530;
          color: #9ca3af;
          padding: 7px 13px;
          border-radius: 8px;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .refresh-btn:hover {
          border-color: #2d3748;
          color: #cbd5e1;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
        }

        .card {
          background: #0d1117;
          border: 1px solid #1e2530;
          border-radius: 12px;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          border-bottom: 1px solid #1a2232;
        }

        .card-icon {
          color: #3b82f6;
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #cbd5e1;
          flex: 1;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .user-verified {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #9ca3af;
          margin-left: auto;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          padding: 4px 0;
        }

        .no-data {
          padding: 24px 20px;
          color: #4b5563;
          font-size: 13px;
          font-style: italic;
        }

        .sub-view {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sub-top {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .plan-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid transparent;
          letter-spacing: 0.05em;
        }

        .status-pill,
        .period-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(107, 114, 128, 0.1);
          color: #9ca3af;
          text-transform: capitalize;
        }

        .sub-section-label {
          font-size: 11px;
          font-weight: 700;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }

        .custom-limits {
          border-top: 1px solid #1a2232;
          padding-top: 14px;
          margin-top: 4px;
        }

        .limits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .limit-item {
          background: #111827;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .limit-key {
          font-size: 10px;
          color: #4b5563;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .limit-val {
          font-size: 14px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .edit-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .custom-section {
          border-top: 1px solid #1a2232;
          padding-top: 16px;
          margin-top: 4px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .form-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .form-check {
          justify-content: flex-start;
        }

        .form-label {
          font-size: 12.5px;
          color: #6b7280;
          font-weight: 500;
          width: 160px;
          flex-shrink: 0;
        }

        .form-select,
        .form-input {
          flex: 1;
          background: #111827;
          border: 1px solid #1e2530;
          border-radius: 7px;
          padding: 7px 11px;
          font-size: 13px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.15s;
        }

        .form-select:focus,
        .form-input:focus {
          border-color: #3b82f6;
        }

        .form-input[type="date"] {
          color-scheme: dark;
        }

        .form-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #3b82f6;
          cursor: pointer;
        }

        .edit-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 5px 11px;
          border-radius: 7px;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .edit-btn:hover {
          background: rgba(59, 130, 246, 0.15);
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
          padding: 5px 11px;
          border-radius: 7px;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-btn:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.18);
        }

        .cancel-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          padding: 5px 11px;
          border-radius: 7px;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .cancel-btn:hover {
          background: rgba(107, 114, 128, 0.18);
        }

        .grant-form {
          padding: 14px 20px;
          border-bottom: 1px solid #1a2232;
          background: #0a0f18;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .grant-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .grant-error {
          font-size: 12px;
          color: #f87171;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          font-size: 11px;
          font-weight: 600;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 16px;
          text-align: left;
          border-bottom: 1px solid #1a2232;
          background: #0a0f18;
          white-space: nowrap;
        }

        .data-table td {
          padding: 10px 16px;
          font-size: 13px;
          color: #9ca3af;
          border-bottom: 1px solid #111827;
          vertical-align: middle;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tbody tr:hover td {
          background: #0f1623;
        }

        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .addon-type {
          font-size: 12.5px;
          color: #cbd5e1;
          text-transform: capitalize;
        }

        .source-badge {
          font-size: 11px;
          color: #6b7280;
          background: rgba(107, 114, 128, 0.1);
          padding: 2px 7px;
          border-radius: 4px;
        }

        .deactivate-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 4px 9px;
          border-radius: 5px;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .deactivate-btn:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .date-cell {
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
        }

        .type-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          text-transform: capitalize;
        }

        .details-cell {
          font-size: 12.5px;
          color: #cbd5e1;
        }

        .period-tag {
          color: #6b7280;
          font-size: 11.5px;
        }

        .amount-cell {
          font-weight: 600;
          color: #10b981 !important;
        }

        @media (max-width: 1100px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .limits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// ─── Info Row Helper ──────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="info-row">
      <div className="info-icon">
        <Icon size={13} />
      </div>
      <div className="info-content">
        <p className="info-label">{label}</p>
        <p className="info-value">{value}</p>
      </div>
      <style jsx>{`
        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 20px;
          border-bottom: 1px solid #111827;
        }

        .info-icon {
          color: #374151;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-label {
          font-size: 11px;
          color: #4b5563;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .info-value {
          font-size: 13.5px;
          color: #cbd5e1;
          font-weight: 400;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}