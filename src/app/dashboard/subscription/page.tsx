// src/app/dashboard/subscription/page.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
//  /dashboard/subscription
//
//  Full subscription management page for admin users.
//
//  Sections:
//    1. Current plan card — plan name, status, dates, days remaining
//    2. Usage bars         — invoices, customers, products
//    3. Active add-ons     — type, quantity, expiry
//    4. Upgrade plans      — Launch / Scale / Business comparison cards
//    5. Add-ons catalogue  — 6 add-on tiles
//    6. Payment history    — last 10 PaymentRecord docs
//
//  Since Razorpay keys are not yet configured, upgrade / add-on purchase
//  buttons display a "Coming soon" state and show a contact support modal.
//  When Razorpay keys are added, replace the handleUpgrade / handleAddon
//  functions with the actual Razorpay checkout flow.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Package,
  FileText,
  Zap,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Mail,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  Types (mirrors subscription.types.ts ISubscriptionStatusResponse)
// ─────────────────────────────────────────────────────────────────────────────
interface EffectiveLimits {
  invoicesPerMonth: number | null;
  invoicesTotal: number | null;
  customers: number | null;
  products: number | null;
  managers: number;
  deliveryPartners: number;
  hasDeliveryModule: boolean;
  hasLiveTracking: boolean;
  hasAdvancedReports: boolean;
  [key: string]: unknown;
}

interface ActiveAddOn {
  id: string;
  type: string;
  quantity: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface SubscriptionStatus {
  planId: string;
  planName: string;
  billingPeriod: string;
  status: "active" | "expired" | "cancelled" | "grace";
  startDate: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  invoiceCountResetAt: string;
  usage: {
    invoicesUsedThisMonth: number;
    invoicesUsedTotal: number;
    customersCount: number;
    productsCount: number;
  };
  effectiveLimits: EffectiveLimits;
  activeAddOns: ActiveAddOn[];
}

interface PaymentRecord {
  id: string;
  type: "subscription" | "addon";
  planId?: string;
  billingPeriod?: string;
  addonType?: string;
  addonQuantity?: number;
  amount: number;
  currency: string;
  status: "pending" | "captured" | "failed" | "refunded";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Static data
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_DISPLAY: Record<
  string,
  { name: string; color: string; badge: string; tagline: string }
> = {
  free_trial: {
    name: "Free Trial",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    tagline: "Explore the platform with no commitment",
  },
  launch: {
    name: "Launch",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    tagline: "For small shop owners",
  },
  scale: {
    name: "Scale",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    badge: "bg-cyan-100 text-cyan-700",
    tagline: "For growing distributors",
  },
  business: {
    name: "Business",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    tagline: "For high-volume operations",
  },
  customize: {
    name: "Custom",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    tagline: "Tailored to your business",
  },
};

const UPGRADE_PLANS = [
  {
    id: "launch",
    name: "Launch",
    monthly: 499,
    tagline: "For small shop owners",
    highlight: false,
    features: [
      "120 invoices / month",
      "60 customers",
      "50 products",
      "Admin only",
      "Full billing + inventory",
      "PDF invoices with GST",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthly: 1499,
    tagline: "For growing distributors",
    highlight: true,
    features: [
      "400 invoices / month",
      "100 customers",
      "120 products",
      "Up to 3 Managers",
      "Up to 5 Delivery Partners",
      "Live map tracking",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 2499,
    tagline: "For high-volume operations",
    highlight: false,
    features: [
      "1,500 invoices / month",
      "Unlimited customers",
      "300 products",
      "Up to 10 Managers",
      "Up to 15 Delivery Partners",
      "Advanced reports + export",
    ],
  },
];

const ADDON_DISPLAY: Record<string, { label: string; desc: string; price: string }> = {
  extra_invoice_100: {
    label: "+100 Invoices/Month",
    desc: "Add 100 more invoices to your monthly plan.",
    price: "₹199/mo",
  },
  extra_invoice_300: {
    label: "+300 Invoices/Month",
    desc: "Add 300 more invoices for higher billing volume.",
    price: "₹499/mo",
  },
  extra_manager: {
    label: "+1 Manager Seat",
    desc: "One additional internal manager account.",
    price: "₹149/mo",
  },
  extra_delivery: {
    label: "+3 Delivery Partners",
    desc: "Expand your dispatch team.",
    price: "₹199/mo",
  },
  advanced_reports: {
    label: "Advanced Reports",
    desc: "Deeper business reporting and insights.",
    price: "₹299/mo",
  },
  setup_migration: {
    label: "Setup & Migration",
    desc: "We help you import products, customers and configure your system.",
    price: "₹499 one-time",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function UsageBar({
  label,
  icon: Icon,
  used,
  limit,
  suffix = "",
}: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number | null;
  suffix?: string;
}) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="text-xs text-green-600 font-medium">Unlimited</span>
          </div>
          <div className="h-1.5 bg-green-100 rounded-full">
            <div className="h-full bg-green-400 rounded-full w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  const barColor =
    pct >= 100
      ? "bg-red-500"
      : pct >= 80
      ? "bg-amber-500"
      : "bg-cyan-500";
  const textColor =
    pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-gray-500";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          pct >= 100 ? "bg-red-50" : pct >= 80 ? "bg-amber-50" : "bg-cyan-50"
        }`}
      >
        <Icon
          size={16}
          className={pct >= 100 ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-cyan-600"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-xs font-semibold ${textColor}`}>
            {used} / {limit}
            {suffix}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Payment status badge
// ─────────────────────────────────────────────────────────────────────────────
function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    captured: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Coming Soon Modal — shown when upgrade is clicked without Razorpay
// ─────────────────────────────────────────────────────────────────────────────
function ComingSoonModal({
  open,
  onClose,
  planName,
}: {
  open: boolean;
  onClose: () => void;
  planName?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto mb-4">
          <Zap size={26} className="text-cyan-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {planName ? `Upgrade to ${planName}` : "Payment coming soon"}
        </h3>
        <p className="text-sm text-gray-600 leading-6 mb-5">
          Online payments are being set up and will be available very soon.
          To upgrade your plan now, please contact us directly at{" "}
          <a
            href="mailto:support@softvibe.in"
            className="text-cyan-600 font-semibold hover:underline"
          >
            support@softvibe.in
          </a>{" "}
          and we&apos;ll activate your plan manually.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@softvibe.in"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Mail size={16} />
            Email support
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Coming-soon modal
  const [csModal, setCsModal] = useState<{ open: boolean; planName?: string }>({
    open: false,
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.role === "manager") {
        router.push("/dashboard");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  // ── Fetch subscription data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/subscription", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        setError("Failed to load subscription data. Please try again.");
        return;
      }

      const data = await res.json();
      setSub(data.subscription);
      setPayments(data.recentPayments ?? []);
    } catch {
      setError("An unexpected error occurred. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading subscription...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !sub) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full text-center">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">Something went wrong</p>
            <p className="text-gray-500 text-sm mb-5">
              {error ?? "No subscription data found."}
            </p>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Derived display data ───────────────────────────────────────────────────
  const planDisplay = PLAN_DISPLAY[sub.planId] ?? PLAN_DISPLAY.launch;
  const daysLeft =
    sub.planId === "free_trial"
      ? getDaysLeft(sub.trialEndsAt)
      : getDaysLeft(sub.currentPeriodEnd);

  const isExpired = sub.status === "expired" || sub.status === "cancelled";

  const invoicesUsed =
    sub.planId === "free_trial"
      ? sub.usage.invoicesUsedTotal
      : sub.usage.invoicesUsedThisMonth;
  const invoicesLimit =
    sub.planId === "free_trial"
      ? sub.effectiveLimits.invoicesTotal
      : sub.effectiveLimits.invoicesPerMonth;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardNavbar />

      <ComingSoonModal
        open={csModal.open}
        onClose={() => setCsModal({ open: false })}
        planName={csModal.planName}
      />

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-6 sm:py-8 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your plan, usage and billing history
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* ── Expired banner ───────────────────────────────────────────────── */}
        {isExpired && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Your subscription has expired
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Upgrade below to restore access to billing and other features.
              </p>
            </div>
          </div>
        )}

        {/* ── Current Plan Card ────────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border p-5 sm:p-6 ${planDisplay.color}`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/70 border border-current/20 flex items-center justify-center shrink-0">
                <CreditCard size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">{planDisplay.name} Plan</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planDisplay.badge}`}>
                    {sub.status === "active"
                      ? "Active"
                      : sub.status === "grace"
                      ? "Grace Period"
                      : "Expired"}
                  </span>
                </div>
                <p className="text-sm opacity-70 mt-0.5">{planDisplay.tagline}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="text-right text-sm space-y-1 shrink-0">
              {sub.planId === "free_trial" ? (
                <>
                  <p className="opacity-60">Trial ends</p>
                  <p className="font-semibold">{formatDate(sub.trialEndsAt)}</p>
                  {daysLeft !== null && (
                    <p
                      className={`text-xs font-medium ${
                        daysLeft <= 5 ? "text-red-600" : "opacity-70"
                      }`}
                    >
                      {daysLeft > 0 ? `${daysLeft} days left` : "Expired today"}
                    </p>
                  )}
                </>
              ) : sub.currentPeriodEnd ? (
                <>
                  <p className="opacity-60">Renews on</p>
                  <p className="font-semibold capitalize">
                    {sub.billingPeriod} · {formatDate(sub.currentPeriodEnd)}
                  </p>
                  {daysLeft !== null && (
                    <p className="text-xs opacity-70">{daysLeft} days remaining</p>
                  )}
                </>
              ) : null}
              <p className="text-xs opacity-50">Since {formatDate(sub.startDate)}</p>
            </div>
          </div>
        </div>

        {/* ── Usage ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Usage</h3>
          <p className="text-xs text-gray-400 mb-4">
            {sub.planId === "free_trial"
              ? "Lifetime invoice count · Resets never"
              : `Monthly usage · Resets on ${formatDate(sub.invoiceCountResetAt)}`}
          </p>

          <UsageBar
            label={sub.planId === "free_trial" ? "Trial Invoices (lifetime)" : "Invoices this month"}
            icon={FileText}
            used={invoicesUsed}
            limit={invoicesLimit}
          />
          <UsageBar
            label="Customers"
            icon={Users}
            used={sub.usage.customersCount}
            limit={sub.effectiveLimits.customers}
            suffix=" slots"
          />
          <UsageBar
            label="Products"
            icon={Package}
            used={sub.usage.productsCount}
            limit={sub.effectiveLimits.products}
            suffix=" slots"
          />
        </div>

        {/* ── Active Add-ons ───────────────────────────────────────────────── */}
        {sub.activeAddOns.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Active Add-ons
            </h3>
            <div className="space-y-3">
              {sub.activeAddOns.map((addon) => {
                const info = ADDON_DISPLAY[addon.type];
                return (
                  <div
                    key={addon.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                        <Zap size={15} className="text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {info?.label ?? addon.type}
                        </p>
                        {addon.quantity > 1 && (
                          <p className="text-xs text-gray-500">× {addon.quantity}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {addon.expiresAt ? (
                        <p className="text-xs text-gray-500">
                          Expires {formatDate(addon.expiresAt)}
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 font-medium">
                          Lifetime
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Upgrade Plans ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">
              {sub.planId === "free_trial" || isExpired
                ? "Choose a plan"
                : "Upgrade your plan"}
            </h3>
            <TrendingUp size={18} className="text-cyan-600" />
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Payment gateway integration coming soon — contact us to upgrade now.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {UPGRADE_PLANS.map((plan) => {
              const isCurrent = sub.planId === plan.id && !isExpired;
              return (
                <article
                  key={plan.id}
                  className={`relative rounded-xl border p-4 flex flex-col gap-3 ${
                    plan.highlight
                      ? "border-cyan-400 bg-cyan-50/40 shadow-sm"
                      : "border-gray-200"
                  } ${isCurrent ? "ring-2 ring-green-400" : ""}`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-2.5 right-4 bg-green-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}

                  <div>
                    <p className="text-sm font-bold text-gray-900">{plan.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
                  </div>

                  <div className="text-2xl font-extrabold text-gray-900">
                    ₹{plan.monthly.toLocaleString("en-IN")}
                    <span className="text-xs font-normal text-gray-400 ml-1">/mo</span>
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle2 size={13} className="text-cyan-600 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() =>
                      setCsModal({ open: true, planName: plan.name })
                    }
                    disabled={isCurrent}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                      isCurrent
                        ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                        : plan.highlight
                        ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <CheckCircle2 size={13} />
                        Current Plan
                      </>
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ChevronRight size={13} />
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        {/* ── Add-ons Catalogue ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">Optional Add-ons</h3>
            <Zap size={18} className="text-amber-500" />
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Expand your plan without changing your tier.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(ADDON_DISPLAY).map(([type, info]) => (
              <div
                key={type}
                className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {info.label}
                </p>
                <p className="text-xs text-gray-500 leading-5 mb-3">{info.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{info.price}</span>
                  <button
                    onClick={() =>
                      setCsModal({ open: true, planName: info.label })
                    }
                    className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    Buy →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Payment History ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Payment History
          </h3>

          {payments.length === 0 ? (
            <div className="py-10 text-center">
              <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No payments yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium pr-4">Date</th>
                    <th className="pb-2 font-medium pr-4">Description</th>
                    <th className="pb-2 font-medium pr-4">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {p.type === "subscription"
                          ? `${
                              PLAN_DISPLAY[p.planId ?? ""]?.name ?? p.planId
                            } Plan · ${p.billingPeriod ?? ""}`
                          : ADDON_DISPLAY[p.addonType ?? ""]?.label ??
                            p.addonType}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Support CTA ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-dashed border-gray-300 rounded-2xl px-5 py-4 bg-gray-50">
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              Need a custom plan or have a billing question?
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Contact our team and we&apos;ll help you find the right fit.
            </p>
          </div>
          <a
            href="mailto:support@softvibe.in"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-100 text-gray-900 rounded-xl transition-colors"
          >
            <Mail size={15} />
            Contact support
          </a>
        </div>

      </main>

      <Footer />
    </div>
  );
}