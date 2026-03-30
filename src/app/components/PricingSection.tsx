"use client";
// src/app/components/PricingSection.tsx

import { useState } from "react";
import Link from "next/link";

type Period = "monthly" | "sixmonths" | "yearly";

const plans = {
  starter: {
    monthly:   { price: "499",    per: "/mo",       save: "" },
    sixmonths: { price: "2,499",  per: "/6 months", save: "Save ₹495" },
    yearly:    { price: "4,999",  per: "/year",     save: "Save ₹989" },
  },
  growth: {
    monthly:   { price: "1,499",  per: "/mo",       save: "" },
    sixmonths: { price: "7,999",  per: "/6 months", save: "Save ₹994" },
    yearly:    { price: "14,999", per: "/year",     save: "Save ₹2,988" },
  },
  business: {
    monthly:   { price: "2,499",  per: "/mo",       save: "" },
    sixmonths: { price: "13,499", per: "/6 months", save: "Save ₹1,494" },
    yearly:    { price: "24,999", per: "/year",     save: "Save ₹4,989" },
  },
};

const ADDONS = [
  { name: "Extra Invoices Pack",       desc: "Add extra monthly invoice capacity.",                        price: "₹299", per: "/mo" },
  { name: "Extra Manager Seats",       desc: "More internal team access for operations staff.",            price: "₹199", per: "/mo" },
  { name: "Extra Delivery Partners",   desc: "More delivery partner accounts for larger dispatch.",        price: "₹249", per: "/mo" },
  { name: "Priority WhatsApp Support", desc: "Faster issue resolution during business hours.",             price: "₹499", per: "/mo" },
  { name: "Bulk Setup Assistance",     desc: "Help setting up products, customers and initial data.",      price: "₹499", per: "one-time" },
];

const FAQS = [
  { q: `What does "Invoices / month" mean?`,   a: `It means how many invoices you can generate inside Ice Inventory in one month. Once the limit is reached, upgrade your plan or add an Extra Invoices Pack.` },
  { q: "Do my limits reset every month?",      a: "Yes. Monthly usage limits reset automatically at the start of your next billing cycle. Your data is never deleted on reset." },
  { q: "Can I upgrade later?",                 a: "Yes. Upgrade anytime as your business grows — no lock-in, no complicated process." },
  { q: "Will I lose data if I change plans?",  a: "No. Products, customers, invoices and records remain completely safe when you switch plans." },
  { q: "Are there any hidden charges?",        a: "No. The pricing is transparent. Optional add-ons are always your choice — nothing is charged without your knowledge." },
  { q: "Which plan is best for most?",         a: "Growth is the best choice for most active distributors. It includes the full delivery system, advanced analytics and up to 500 invoices per month." },
  { q: "Can I get a custom plan?",             a: "Yes. If your operations need custom limits or workflow support, contact us and we'll tailor a plan around your exact needs." },
  { q: "Is Free Trial really free?",           a: "Yes. Try Ice Inventory free for 30 days. No credit card required. You get access to core features with trial-level limits." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <span className={`shrink-0 text-gray-400 transition-transform duration-200 text-lg leading-none ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-40 pb-4" : "max-h-0"}`}>
        <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

const CHECK = (
  <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#EFF6FF" />
    <path d="M5 8l2 2 4-4" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PricingSection() {
  const [period, setPeriod] = useState<Period>("monthly");
  const g = (plan: keyof typeof plans) => plans[plan][period];

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="max-w-2xl mb-12">
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-base text-gray-500">
            Pick a plan that fits your operations. Upgrade as your business grows.
          </p>
        </div>

        {/* ── Billing toggle ── */}
        <div className="flex items-center gap-3 mb-10">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1" role="group" aria-label="Billing period">
            {([
              { key: "monthly"   as Period, label: "Monthly" },
              { key: "sixmonths" as Period, label: "6 Months", badge: "−17%" },
              { key: "yearly"    as Period, label: "Yearly",   badge: "−17%" },
            ] as { key: Period; label: string; badge?: string }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === opt.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
        </div>

        {/* ── Plans grid — Free Trial + 3 paid plans in ONE row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">

          {/* Free Trial */}
          <div className="flex flex-col border border-gray-200 rounded-2xl p-6 bg-gray-50">
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Free Trial</div>
              <div className="text-2xl font-bold text-gray-900">₹0</div>
              <div className="text-xs text-gray-500 mt-0.5">30 days · No card needed</div>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {["50 invoices total", "25 customers", "50 products", "Core features only"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">{CHECK}{f}</li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center py-2.5 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              Start Free
            </Link>
          </div>

          {/* Starter */}
          <div className="flex flex-col border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Starter</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">₹{g("starter").price}</span>
                <span className="text-xs text-gray-500">{g("starter").per}</span>
              </div>
              {g("starter").save
                ? <div className="text-xs text-green-600 font-medium mt-0.5">{g("starter").save}</div>
                : <div className="h-4 mt-0.5" />}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {["150 invoices / month", "150 customers", "200 products", "1 manager + admin", "Basic delivery workflow"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">{CHECK}{f}</li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center py-2.5 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              Start with Starter
            </Link>
          </div>

          {/* Growth — highlighted */}
          <div className="flex flex-col relative border-2 border-blue-600 rounded-2xl p-6 shadow-lg">
            <div className="absolute -top-3 left-6">
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            </div>
            <div className="mb-4 pt-1">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Growth</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">₹{g("growth").price}</span>
                <span className="text-xs text-gray-500">{g("growth").per}</span>
              </div>
              {g("growth").save
                ? <div className="text-xs text-green-600 font-medium mt-0.5">{g("growth").save}</div>
                : <div className="h-4 mt-0.5" />}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {["500 invoices / month", "500 customers", "1,000 products", "Up to 5 managers", "Full delivery system", "Advanced analytics"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">{CHECK}{f}</li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Choose Growth
            </Link>
          </div>

          {/* Business */}
          <div className="flex flex-col border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Business</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">₹{g("business").price}</span>
                <span className="text-xs text-gray-500">{g("business").per}</span>
              </div>
              {g("business").save
                ? <div className="text-xs text-green-600 font-medium mt-0.5">{g("business").save}</div>
                : <div className="h-4 mt-0.5" />}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {["1,500+ invoices / month", "Unlimited customers", "Unlimited products", "Unlimited managers", "Unlimited delivery partners", "Premium support"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">{CHECK}{f}</li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center py-2.5 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              Scale with Business
            </Link>
          </div>

        </div>

        {/* ── Custom plan strip ── */}
        <div className="mb-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-dashed border-gray-300 rounded-xl px-6 py-5 bg-gray-50">
          <div>
            <span className="text-sm font-semibold text-gray-900">Need something custom?</span>
            <span className="ml-2 text-sm text-gray-500">We can tailor limits and workflows for your exact operations.</span>
          </div>
          <a
            href="mailto:support@softvibe.in"
            className="shrink-0 px-5 py-2.5 text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 rounded-lg transition-colors"
          >
            Talk to us →
          </a>
        </div>

        {/* ── Add-ons ── */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-gray-900 mb-1">Optional add-ons</h3>
          <p className="text-sm text-gray-500 mb-6">Expand your workflow without changing your plan.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDONS.map((addon) => (
              <div key={addon.name} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="text-sm font-semibold text-gray-900 mb-1">{addon.name}</div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{addon.desc}</p>
                <div className="text-lg font-bold text-gray-900">
                  {addon.price}
                  <span className="text-xs font-normal text-gray-500 ml-1">{addon.per}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Frequently asked questions</h3>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden px-6">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}