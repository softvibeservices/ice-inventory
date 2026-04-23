// src/app/components/UpgradePromptModal.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
//  UpgradePromptModal — shown when an API returns upgradeRequired: true.
//
//  Displayed by route handler consumers (orders, customers, products pages)
//  when the server returns HTTP 403 with { upgradeRequired: true }.
//
//  Props:
//    open         — whether the modal is visible
//    onClose      — dismiss callback
//    resource     — what was blocked: "invoice" | "customer" | "product" |
//                   "manager" | "deliveryPartner" | "feature"
//    used         — current usage count (optional)
//    limit        — current plan limit (optional)
//    featureName  — e.g. "Delivery Module" (when resource === "feature")
//    currentPlanId — used to show appropriate messaging
//
//  The modal shows a brief explanation and a CTA to /dashboard/subscription.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight, Lock } from "lucide-react";

export type BlockedResource =
  | "invoice"
  | "customer"
  | "product"
  | "manager"
  | "deliveryPartner"
  | "feature";

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  resource?: BlockedResource;
  used?: number;
  limit?: number | null;
  featureName?: string;
  currentPlanId?: string;
}

const RESOURCE_COPY: Record<
  BlockedResource,
  { title: string; body: (used?: number, limit?: number | null, feature?: string) => string }
> = {
  invoice: {
    title: "Invoice limit reached",
    body: (used, limit) =>
      limit
        ? `You've used ${used} of ${limit} invoices allowed on your current plan. Upgrade to create more bills this month.`
        : `You've reached your invoice limit. Upgrade your plan to continue billing.`,
  },
  customer: {
    title: "Customer limit reached",
    body: (used, limit) =>
      limit
        ? `You have ${used} of ${limit} customers on your plan. Upgrade to add more.`
        : `You've reached your customer limit. Upgrade your plan to add more customers.`,
  },
  product: {
    title: "Product limit reached",
    body: (used, limit) =>
      limit
        ? `You have ${used} of ${limit} products on your plan. Upgrade to add more.`
        : `You've reached your product limit. Upgrade your plan to add more products.`,
  },
  manager: {
    title: "Manager seat limit reached",
    body: (used, limit) =>
      limit
        ? `You have ${used} of ${limit} manager seats on your plan.`
        : `Your current plan doesn't include manager seats. Upgrade to Scale or Business.`,
  },
  deliveryPartner: {
    title: "Delivery partner limit reached",
    body: (used, limit) =>
      limit
        ? `You have ${used} of ${limit} delivery partners on your plan.`
        : `Delivery partners are not available on your current plan.`,
  },
  feature: {
    title: "Feature not available",
    body: (_, __, feature) =>
      `${feature ?? "This feature"} is not included in your current plan. Upgrade to unlock it.`,
  },
};

export default function UpgradePromptModal({
  open,
  onClose,
  resource = "invoice",
  used,
  limit,
  featureName,
  currentPlanId,
}: UpgradePromptModalProps) {
  const router = useRouter();

  // Trap focus / close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = RESOURCE_COPY[resource];
  const isExpired =
    currentPlanId === undefined ||
    (limit === 0 && resource === "invoice");

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mb-4">
          <Lock size={22} className="text-cyan-600" />
        </div>

        {/* Copy */}
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {isExpired ? "Subscription expired" : copy.title}
        </h2>
        <p className="text-sm text-gray-600 leading-6 mb-5">
          {isExpired
            ? "Your subscription has expired. Renew or upgrade your plan to continue using this feature."
            : copy.body(used, limit, featureName)}
        </p>

        {/* Usage bar (if relevant counts available) */}
        {used != null && limit != null && limit > 0 && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Usage</span>
              <span>
                {used} / {limit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  used >= limit ? "bg-red-500" : "bg-cyan-500"
                }`}
                style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              router.push("/dashboard/subscription");
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            View Plans
            <ArrowUpRight size={15} />
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}