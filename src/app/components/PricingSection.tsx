"use client";
  // src/app/components/PricingSection.tsx

import { useMemo, useState } from "react";
import Link from "next/link";

type Period = "monthly" | "sixmonths" | "yearly";
type PlanKey = "launch" | "scale" | "business";

const plans = {
  launch: {
    name: "Launch",
    tag: "For small shop owners",
    highlight: false,
    description:
      "Best for single-owner ice cream shops that need billing, inventory and customer tracking without team complexity.",
    monthly: { price: 499, per: "/mo", save: "" },
    sixmonths: { price: 2499, per: "/6 months", save: "Save ₹495" },
    yearly: { price: 4999, per: "/year", save: "Save ₹989" },
    features: [
      "120 invoices / month",
      "60 customers",
      "50 products",
      "Admin only (no manager seats)",
      "Full billing + inventory system",
      "Customer ledger & payment tracking",
      "PDF invoices with GST",
      "Basic stock alerts",
      "Sales reports",
    ],
    cta: "Start with Launch",
  },

  scale: {
    name: "Scale",
    tag: "For growing distributors",
    highlight: true,
    description:
      "Built for active ice cream distributors managing daily orders, staff operations, delivery flow and business reporting.",
    monthly: { price: 1499, per: "/mo", save: "" },
    sixmonths: { price: 7999, per: "/6 months", save: "Save ₹995" },
    yearly: { price: 14999, per: "/year", save: "Save ₹2,989" },
    features: [
      "400 invoices / month",
      "100 customers",
      "120 products",
      "1 Admin + Up to 3 Managers",
      "Up to 5 Delivery Partners",
      "Delivery partner mobile app",
      "Live map tracking of deliveries",
      "Delivery workflow management",
      "Sales analytics dashboard",
      "Customer payment history",
      "Advanced stock management",
      "Role-based permissions",
      "Priority support",
    ],
    cta: "Choose Scale",
  },

  business: {
    name: "Business",
    tag: "For high-volume operations",
    highlight: false,
    description:
      "Ideal for serious distributors handling large invoice volume, multiple staff members, bigger dispatch teams and advanced workflows.",
    monthly: { price: 2499, per: "/mo", save: "" },
    sixmonths: { price: 13499, per: "/6 months", save: "Save ₹1,495" },
    yearly: { price: 24999, per: "/year", save: "Save ₹4,989" },
    features: [
      "1,500 invoices / month",
      "Unlimited customers",
      "300 products",
      "1 Admin + Up to 10 Managers",
      "Up to 15 Delivery Partners",
      "Delivery partner mobile app",
      "Real-time map + Route optimization",
      "Advanced delivery analytics",
      "Bulk billing operations",
      "Advanced business reports",
      "Custom workflows",
      "Role-based permissions",
      "Dedicated priority support",
      "Data export & backup",
    ],
    cta: "Scale with Business",
  },
} as const;

const FREE_TRIAL_FEATURES = [
  "50 invoices during trial",
  "20 customers",
  "30 products",
  "Admin only (shop owner)",
  "Basic billing + inventory",
  "Customer ledger",
  "PDF invoice generation",
  "Stock alerts",
];

const ADDONS = [
  {
    name: "Extra Invoice Pack (100)",
    desc: "Add 100 more invoices to your monthly plan without changing your subscription tier.",
    price: "₹199",
    per: "/mo",
  },
  {
    name: "Extra Invoice Pack (300)",
    desc: "Best for businesses that temporarily need more monthly billing capacity.",
    price: "₹499",
    per: "/mo",
  },
  {
    name: "Extra Manager Seat",
    desc: "Add one more internal manager account for operations, billing or stock handling.",
    price: "₹149",
    per: "/mo",
  },
  {
    name: "Extra Delivery Partner Pack",
    desc: "Add 3 more delivery partner accounts for larger delivery operations.",
    price: "₹199",
    per: "/mo",
  },
  {
    name: "Advanced Reports Add-on",
    desc: "Unlock deeper business reporting and advanced operational insights.",
    price: "₹299",
    per: "/mo",
  },
  {
    name: "Setup & Migration Help",
    desc: "We help you import products, customers and set up your system correctly.",
    price: "₹499",
    per: "one-time",
  },
];

const FAQS = [
  {
    q: `What does "Invoices / month" mean in Ice Inventory pricing?`,
    a: `It means the number of GST bills or invoices you can generate inside Ice Inventory during one billing cycle. If you reach your monthly invoice limit, you can upgrade your plan or purchase an Extra Invoice Pack.`,
  },
  {
    q: "Which Ice Inventory pricing plan is best for most businesses?",
    a: "The Scale plan is the best fit for most active ice cream distributors. It includes staff access, delivery management, analytics and enough monthly invoice capacity for regular operations.",
  },
  {
    q: "Can I upgrade my Ice Inventory plan later?",
    a: "Yes. You can upgrade your plan anytime as your shop, staff, delivery operations or invoice volume grows. Your existing data stays safe.",
  },
  {
    q: "Will I lose my data if I change plans?",
    a: "No. Your products, customers, invoices, ledger history and operational records remain safe when you switch plans.",
  },
  {
    q: "Do pricing limits reset every month?",
    a: "Yes. Monthly usage limits such as invoices reset automatically at the beginning of your next billing cycle. Your stored business data does not get deleted.",
  },
  {
    q: "Is the free trial really free?",
    a: "Yes. Ice Inventory offers a 30-day free trial with no credit card required. You can test billing, inventory and customer management before subscribing.",
  },
  {
    q: "Does Ice Inventory include delivery management in every plan?",
    a: "No. Delivery workflow is available from the Scale plan onward because smaller single-owner shops often do not need dispatch management.",
  },
  {
    q: "Can I get a custom pricing plan for my ice cream business?",
    a: "Yes. If your business needs different limits, custom workflows or larger operational capacity, we can create a custom plan for you.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm sm:text-[15px] font-semibold text-gray-900">
          {q}
        </span>
        <span
          className={`shrink-0 text-gray-400 transition-transform duration-200 text-xl leading-none ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? "max-h-48 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-gray-600 leading-7">{a}</p>
      </div>
    </div>
  );
}

const CHECK = (
  <svg
    className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5"
    fill="none"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="7" fill="#ECFEFF" />
    <path
      d="M5 8l2 2 4-4"
      stroke="#0891B2"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function PricingSection() {
  const [period, setPeriod] = useState<Period>("monthly");

  const currentPlans = useMemo(() => {
    return Object.entries(plans).map(([key, value]) => ({
      key: key as PlanKey,
      ...value,
      billing: value[period],
    }));
  }, [period]);

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="py-24 sm:py-32 bg-white scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ───────────────── HEADER ───────────────── */}
        <div className="max-w-3xl mb-12">
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-cyan-600 mb-3">
            Pricing
          </p>

          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight"
          >
            Simple pricing for ice cream inventory, billing and delivery management
          </h2>

          <p className="mt-5 text-base sm:text-lg text-gray-600 leading-8 max-w-2xl">
            Choose the right Ice Inventory pricing plan for your ice cream shop,
            distributor business or delivery operation. Start free, upgrade when
            your invoice volume and business complexity grow.
          </p>
        </div>

        {/* ───────────────── BILLING TOGGLE ───────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <div
            className="inline-flex items-center bg-gray-100 rounded-xl p-1"
            role="group"
            aria-label="Billing period"
          >
            {([
              { key: "monthly" as Period, label: "Monthly" },
              { key: "sixmonths" as Period, label: "6 Months", badge: "−17%" },
              { key: "yearly" as Period, label: "Yearly", badge: "−17%" },
            ] as { key: Period; label: string; badge?: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === opt.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
                {opt.badge && (
                  <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            Save more with longer billing cycles.
          </p>
        </div>

        {/* ───────────────── PLANS GRID ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* FREE TRIAL */}
          <article className="flex flex-col border border-gray-200 rounded-3xl p-6 sm:p-7 bg-gray-50">
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-[0.18em] mb-2">
                Free Trial
              </div>

              <div className="text-3xl font-bold text-gray-900">₹0</div>

              <p className="text-sm text-gray-500 mt-2">
                30 days free · No credit card required
              </p>
            </div>

            <p className="text-sm text-gray-600 leading-7 mb-6">
              Test Ice Inventory for 30 days with enough capacity to explore
              billing, products, and customer workflows before choosing a paid plan.
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_TRIAL_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                  {CHECK}
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center py-3 text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
            >
              Start Free Trial
            </Link>
          </article>

          {/* PAID PLANS */}
          {currentPlans.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-3xl p-6 sm:p-7 transition-all ${
                plan.highlight
                  ? "border-2 border-cyan-500 shadow-xl shadow-cyan-100"
                  : "border border-gray-200 hover:shadow-md"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-1 bg-cyan-600 text-white text-[10px] font-bold rounded-full uppercase tracking-[0.18em]">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5 pt-1">
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${
                    plan.highlight ? "text-cyan-700" : "text-gray-500"
                  }`}
                >
                  {plan.name}
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ₹{formatPrice(plan.billing.price)}
                  </span>
                  <span className="text-sm text-gray-500 mb-1">
                    {plan.billing.per}
                  </span>
                </div>

                {plan.billing.save ? (
                  <div className="text-xs text-green-600 font-medium mt-2">
                    {plan.billing.save}
                  </div>
                ) : (
                  <div className="h-5 mt-2" />
                )}

                <p className="text-sm font-medium text-gray-900 mt-3">
                  {plan.tag}
                </p>

                <p className="text-sm text-gray-600 leading-7 mt-2">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    {CHECK}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3 text-sm font-semibold rounded-xl transition-colors ${
                  plan.highlight
                    ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>

     {/* ───────────────── CUSTOM PLAN ───────────────── */}
        <div className="mb-16 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-dashed border-gray-300 rounded-2xl px-6 sm:px-8 py-6 bg-gray-50">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Need a custom plan for your ice cream business?
            </h3>
            <p className="text-sm text-gray-600 leading-7">
              If you need custom invoice limits, more delivery capacity, special
              workflows or support for a larger team, we can tailor a plan around
              your exact operations.
            </p>
          </div>

          <a
            href="mailto:support@softvibe.in"
            className="shrink-0 inline-flex items-center justify-center px-5 py-3 text-sm font-semibold border border-gray-300 bg-white hover:bg-gray-100 text-gray-900 rounded-xl transition-colors"
          >
            Talk to us →
          </a>
        </div>

        {/* ───────────────── ADD-ONS ───────────────── */}
        <div className="mb-16">
          <div className="max-w-3xl mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Optional add-ons
            </h3>
            <p className="text-base text-gray-600 leading-8">
              Expand your workflow without changing your full plan. These add-ons
              help you increase billing capacity, team access and operational
              flexibility only when needed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {ADDONS.map((addon) => (
              <article
                key={addon.name}
                className="border border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-sm transition-shadow bg-white"
              >
                <h4 className="text-base font-semibold text-gray-900 mb-2">
                  {addon.name}
                </h4>
                <p className="text-sm text-gray-600 leading-7 mb-4">
                  {addon.desc}
                </p>
                <div className="text-2xl font-bold text-gray-900">
                  {addon.price}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {addon.per}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ───────────────── FAQ ───────────────── */}
        <div className="max-w-4xl">
          <div className="mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Pricing FAQ
            </h3>
            <p className="text-base text-gray-600 leading-8">
              Answers to common questions about Ice Inventory pricing, invoice
              limits, upgrades, delivery features and plan selection.
            </p>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden px-6 sm:px-8 bg-white">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}