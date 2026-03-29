"use client";
// src/app/components/PricingSection.tsx

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Period = "monthly" | "sixmonths" | "yearly";

// ── EXACT PRICING DATA from reference ──────────────────────────────────────
const plans = {
  starter: {
    monthly:   { price: "499",    per: "/ month",    save: "" },
    sixmonths: { price: "2,499",  per: "/ 6 months", save: "Save ₹495 vs monthly" },
    yearly:    { price: "4,999",  per: "/ year",     save: "Save ₹989 vs monthly" },
  },
  growth: {
    monthly:   { price: "1,499",  per: "/ month",    save: "" },
    sixmonths: { price: "7,999",  per: "/ 6 months", save: "Save ₹994 vs monthly" },
    yearly:    { price: "14,999", per: "/ year",     save: "Save ₹2,988 vs monthly" },
  },
  business: {
    monthly:   { price: "2,499",  per: "/ month",    save: "" },
    sixmonths: { price: "13,499", per: "/ 6 months", save: "Save ₹1,494 vs monthly" },
    yearly:    { price: "24,999", per: "/ year",     save: "Save ₹4,989 vs monthly" },
  },
};

// ── ADD-ONS: Advanced Reports Pack REMOVED. Bulk Setup = ₹499 one-time ────
const ADDONS = [
  {
    icon: "🧾",
    name: "Extra Invoices Pack",
    desc: "Add extra monthly invoice capacity when your billing volume increases.",
    incl: "+100 invoices / month",
    price: "₹299",
    per: "/ month",
    oneTime: false,
  },
  {
    icon: "👨‍💼",
    name: "Extra Manager Seats",
    desc: "Add more internal team access for staff handling operations.",
    incl: "+1 manager account",
    price: "₹199",
    per: "/ month",
    oneTime: false,
  },
  {
    icon: "🛵",
    name: "Extra Delivery Partners",
    desc: "Add more delivery partner accounts for larger dispatch workflows.",
    incl: "+3 delivery partner accounts",
    price: "₹249",
    per: "/ month",
    oneTime: false,
  },
  {
    icon: "💬",
    name: "Priority WhatsApp Support",
    desc: "Get faster issue resolution and business-hour support for operational help.",
    incl: null,
    price: "₹499",
    per: "/ month",
    oneTime: false,
  },
  {
    icon: "🗂️",
    name: "Bulk Setup Assistance",
    desc: "Get help setting up products, customers, and initial business data faster.",
    incl: null,
    price: "₹499",
    per: "one-time",
    oneTime: true,
  },
];

const FAQS = [
  {
    q: `What does "Invoices / month" mean?`,
    a: `It means how many invoices or bills you can generate inside Ice Inventory in one month. Once the limit is reached for the month, you'll need to upgrade your plan or add an Extra Invoices Pack.`,
  },
  {
    q: "Do my limits reset every month?",
    a: "Yes. Monthly usage limits reset automatically at the start of your next billing cycle. Your data — products, customers, and records — is never deleted on reset.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes. You can upgrade your plan anytime as your business grows. There's no lock-in and no complicated process — just pick the new plan and continue.",
  },
  {
    q: "Will I lose my data if I change plans?",
    a: "No. Your products, customers, invoices, and business records remain completely safe when you switch plans. Nothing is deleted.",
  },
  {
    q: "Are there any hidden charges?",
    a: "No. The pricing is transparent and clearly listed above. Optional add-ons are separate and always your choice — nothing is charged without your knowledge.",
  },
  {
    q: "Which plan is best for most businesses?",
    a: "Growth is the best choice for most active ice cream distributors because it balances scale, reporting, and team usage. It includes the full delivery partner system, advanced analytics, and up to 500 invoices per month.",
  },
  {
    q: "Can I get a custom plan for my business?",
    a: "Yes. If your operations need custom limits or workflow support, you can choose the Customize option and talk to us. We'll tailor the plan around your exact business needs.",
  },
  {
    q: "Is Free Trial really free?",
    a: "Yes. You can try Ice Inventory free for 30 days before deciding to upgrade. No credit card required. You get access to the core features with trial-level limits.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-colors duration-200 ${
        open ? "border-white/[0.13] bg-[#0c1422]" : "border-white/[0.07] bg-[#0c1422] hover:border-white/[0.13]"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-[18px] text-left"
      >
        <span className="text-[14.5px] font-semibold text-[#e8eeff] leading-snug">{q}</span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/[0.18] flex items-center justify-center text-[13px] text-cyan-400 transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48" : "max-h-0"}`}>
        <p className="px-5 sm:px-6 pb-[18px] text-[13.5px] text-[#8899bb] leading-[1.7]">{a}</p>
      </div>
    </div>
  );
}

function Chip({ icon, label, value, valClass }: { icon: string; label: string; value: string; valClass: string }) {
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.07] rounded-[9px] px-[11px] py-2 gap-2">
      <span className="flex items-center gap-[7px] text-[11.5px] text-[#8899bb] min-w-0">
        <span className="text-[13px] shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-[6px] shrink-0 ${valClass}`}>
        {value}
      </span>
    </div>
  );
}

function Feat({ text, no, dotClass }: { text: string; no?: boolean; dotClass: string }) {
  return (
    <li className={`flex items-start gap-2 text-[12.5px] py-[4.5px] leading-[1.45] ${no ? "text-[#5a6a88]" : "text-[#a8bdd8]"}`}>
      <span className={`shrink-0 w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] mt-[2px] ${dotClass}`}>
        {no ? "✗" : "✓"}
      </span>
      {text}
    </li>
  );
}

export default function PricingSection() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const periodOptions: { key: Period; label: string; badge?: string }[] = [
    { key: "monthly",   label: "Monthly" },
    { key: "sixmonths", label: "6 Months", badge: "Save 17%" },
    { key: "yearly",    label: "Yearly",   badge: "Save 17%" },
  ];

  useEffect(() => {
    const idx = periodOptions.findIndex((p) => p.key === period);
    const btn = btnRefs.current[idx];
    const track = trackRef.current;
    if (!btn || !track) return;
    const bR = btn.getBoundingClientRect();
    const tR = track.getBoundingClientRect();
    setSliderStyle({ width: bR.width, left: bR.left - tR.left - 5 });
  }, [period]);

  const g = (plan: keyof typeof plans) => plans[plan][period];

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="border-b border-white/[0.06]"
      style={{ background: "#05090f" }}
    >
      <div className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-7 pt-20 pb-16">

        {/* ── SECTION HERO ──────────────────────────────────────────────── */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 text-[10.5px] font-bold tracking-[.22em] uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-4 py-[5px] rounded-full mb-7">
            <span className="w-[5px] h-[5px] rounded-full bg-cyan-400 animate-pulse shrink-0" />
            Ice Inventory · SaaS Pricing
          </div>
          <h2
            id="pricing-heading"
            className="text-[clamp(32px,5.5vw,56px)] font-extrabold tracking-[-0.035em] leading-[1.06] text-[#e8eeff] mb-5"
          >
            Simple pricing for<br />
            <span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
              growing ice cream businesses
            </span>
          </h2>
          <p className="text-[16.5px] text-[#8899bb] max-w-[520px] mx-auto mb-6 leading-[1.68]">
            Manage stock, invoices, customers, deliveries, and business operations — with a plan that grows as your business grows.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[10px]">
            {["No hidden charges", "Upgrade anytime", "Built for real wholesale workflows"].map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-[5px] bg-[rgba(34,211,160,.06)] border border-[rgba(34,211,160,.16)] rounded-full px-4 py-[6px] text-[12.5px] text-[#22d3a0]"
              >
                <span className="text-[11px]">✦</span> {b}
              </span>
            ))}
          </div>
        </div>

        {/* ── BILLING TOGGLE ──────────────────────────────────────────────── */}
        <div className="flex justify-center py-12">
          <div
            ref={trackRef}
            className="relative flex items-center bg-[#0c1422] border border-white/[0.13] rounded-full p-[5px] gap-1"
            role="group"
            aria-label="Billing period"
          >
            <span
              aria-hidden
              className="absolute top-[5px] h-[calc(100%-10px)] bg-cyan-400 rounded-full transition-all duration-300 ease-in-out pointer-events-none"
              style={{ width: sliderStyle.width, left: sliderStyle.left }}
            />
            {periodOptions.map((opt, i) => (
              <button
                key={opt.key}
                ref={(el) => { btnRefs.current[i] = el; }}
                onClick={() => setPeriod(opt.key)}
                className={`relative z-10 flex items-center gap-1.5 px-6 py-[10px] rounded-full text-[12.5px] font-bold tracking-[.04em] transition-colors duration-200 whitespace-nowrap ${
                  period === opt.key ? "text-black" : "text-[#8899bb] hover:text-white"
                }`}
              >
                {opt.label}
                {opt.badge && (
                  <span className="text-[9px] bg-[rgba(34,211,160,.15)] text-[#22d3a0] rounded-full px-[7px] py-[2px] font-extrabold uppercase tracking-[.1em]">
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── FREE TRIAL — full-width banner ─────────────────────────────── */}
        <div className="mb-5 rounded-3xl border border-[rgba(34,211,160,.25)] bg-[#0c1422] p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-5">
            <div className="flex-1 min-w-0">
              <div className="text-2xl mb-4">🆓</div>
              <div className="text-[11px] font-extrabold text-[#22d3a0] uppercase tracking-[.18em] mb-[5px]">Free Trial</div>
              <div className="text-[12px] text-[#8899bb] mb-5 leading-[1.5]">For trying the system before going paid</div>
              <div className="flex items-baseline gap-[3px] mb-1">
                <span className="text-[20px] font-bold text-[#22d3a0] opacity-70 mt-1 self-start">₹</span>
                <span className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-[#22d3a0] tracking-[-0.03em] leading-none">0</span>
              </div>
              <div className="text-[11.5px] text-[#5a6a88] mb-4">30 Days Free · No card needed</div>
              <div className="bg-[rgba(34,211,160,.05)] border border-[rgba(34,211,160,.14)] rounded-[10px] px-3 py-[10px] text-[11.5px] text-[#22d3a0] leading-[1.6] max-w-lg">
                ✦ &nbsp;Try the full system free for <strong>30 days</strong> before deciding to upgrade.
              </div>
            </div>
            <Link
              href="/register"
              className="shrink-0 self-start px-5 py-3 text-[13px] font-bold tracking-[.04em] bg-[rgba(34,211,160,.1)] text-[#22d3a0] border border-[rgba(34,211,160,.28)] rounded-xl hover:opacity-85 transition-opacity"
            >
              Start Free Trial
            </Link>
          </div>
          <div className="h-px bg-white/[0.07] mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[7px] mb-4">
            {[
              { icon: "🧾", label: "Invoices total",   value: "50" },
              { icon: "👥", label: "Customers",         value: "25" },
              { icon: "🍦", label: "Products",           value: "50" },
              { icon: "👨‍💼", label: "Managers",          value: "None" },
              { icon: "🛵", label: "Delivery Partners",  value: "None" },
            ].map((c) => (
              <Chip key={c.label} icon={c.icon} label={c.label} value={c.value}
                valClass={c.value === "None" ? "opacity-35 bg-[rgba(34,211,160,.1)] text-[#22d3a0]" : "bg-[rgba(34,211,160,.1)] text-[#22d3a0]"}
              />
            ))}
          </div>
          <div className="h-px bg-white/[0.07] mb-4" />
          <div className="text-[10px] uppercase tracking-[.15em] text-[#5a6a88] font-bold mb-2">Includes</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
            {[
              { text: "GST invoice generation" },
              { text: "PDF bill download" },
              { text: "Product management" },
              { text: "Stock management" },
              { text: "Customer management" },
              { text: "Customer ledger" },
              { text: "Basic reports" },
              { text: "No manager accounts", no: true },
              { text: "No delivery partner module", no: true },
            ].map((f) => (
              <Feat key={f.text} text={f.text} no={f.no}
                dotClass={f.no ? "bg-white/[0.04] text-[#5a6a88]" : "bg-[rgba(34,211,160,.12)] text-[#22d3a0]"}
              />
            ))}
          </ul>
        </div>

        {/* ── PAID PLANS GRID ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

          {/* STARTER */}
          <div className="relative rounded-3xl border border-[rgba(245,158,11,.22)] bg-[#0c1422] p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_32px_70px_rgba(0,0,0,.5)]">
            <div className="text-2xl mb-4">🚀</div>
            <div className="text-[11px] font-extrabold text-[#f59e0b] uppercase tracking-[.18em] mb-[5px]">Starter</div>
            <div className="text-[12px] text-[#8899bb] mb-5 leading-[1.5]">For small wholesalers starting digital operations</div>
            <div className="flex items-baseline gap-[3px] mb-1">
              <span className="text-[20px] font-bold text-[#f59e0b] opacity-70 mt-1 self-start">₹</span>
              <span className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-[#f59e0b] tracking-[-0.03em] leading-none">{g("starter").price}</span>
              <span className="text-[12px] text-[#5a6a88] ml-0.5">&nbsp;{g("starter").per}</span>
            </div>
            <div className="h-6 mb-4">
              {g("starter").save ? (
                <span className="text-[11px] text-[#22d3a0] bg-[rgba(34,211,160,.08)] border border-[rgba(34,211,160,.15)] inline-block px-[9px] py-[2px] rounded-full">
                  ✦ {g("starter").save}
                </span>
              ) : null}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="space-y-[7px] mb-4">
              {[
                { icon: "🧾", label: "Invoices / month", value: "150" },
                { icon: "👥", label: "Customers",         value: "150" },
                { icon: "🍦", label: "Products",           value: "200" },
                { icon: "👨‍💼", label: "Managers",          value: "1 + Admin" },
                { icon: "🛵", label: "Delivery Partners",  value: "Basic" },
              ].map((c) => (
                <Chip key={c.label} icon={c.icon} label={c.label} value={c.value}
                  valClass="bg-[rgba(245,158,11,.1)] text-[#f59e0b]" />
              ))}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="text-[10px] uppercase tracking-[.15em] text-[#5a6a88] font-bold mb-2">Includes</div>
            <ul className="flex-1 mb-6">
              {["GST invoice generation","PDF bill download","Product management","Stock management","Customer management","Customer ledger","Basic sales insights","Basic delivery workflow","Sticky notes / dispatch notes"].map((f) => (
                <Feat key={f} text={f} dotClass="bg-[rgba(245,158,11,.12)] text-[#f59e0b]" />
              ))}
            </ul>
            <Link href="/register"
              className="block w-full text-center py-3 text-[13px] font-bold tracking-[.04em] bg-[rgba(245,158,11,.1)] text-[#f59e0b] border border-[rgba(245,158,11,.28)] rounded-xl hover:opacity-85 transition-opacity mt-auto">
              Start with Starter
            </Link>
          </div>

          {/* GROWTH */}
          <div
            className="relative rounded-3xl p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-[6px]"
            style={{
              background: "linear-gradient(155deg,#0d2040 0%,#0a1628 100%)",
              border: "1px solid rgba(0,212,255,.42)",
              boxShadow: "0 0 0 1px rgba(0,212,255,.1), 0 0 60px rgba(0,212,255,.1)",
              transform: "scale(1.02)",
            }}
          >
            <div
              className="absolute -top-[13px] left-1/2 -translate-x-1/2 text-black text-[9px] font-extrabold uppercase tracking-[.2em] px-4 py-[4px] rounded-full whitespace-nowrap"
              style={{ background: "linear-gradient(90deg,#00d4ff,#5eead4)", boxShadow: "0 4px 20px rgba(0,212,255,.4)" }}
            >
              ⭐ Most Popular
            </div>
            <div className="text-2xl mb-4">📈</div>
            <div className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-[.18em] mb-[5px]">Growth</div>
            <div className="text-[12px] text-[#8899bb] mb-5 leading-[1.5]">For growing distributors handling more daily operations</div>
            <div className="flex items-baseline gap-[3px] mb-1">
              <span className="text-[20px] font-bold text-cyan-400 opacity-70 mt-1 self-start">₹</span>
              <span className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-cyan-400 tracking-[-0.03em] leading-none">{g("growth").price}</span>
              <span className="text-[12px] text-[#5a6a88] ml-0.5">&nbsp;{g("growth").per}</span>
            </div>
            <div className="h-6 mb-4">
              {g("growth").save ? (
                <span className="text-[11px] text-[#22d3a0] bg-[rgba(34,211,160,.08)] border border-[rgba(34,211,160,.15)] inline-block px-[9px] py-[2px] rounded-full">
                  ✦ {g("growth").save}
                </span>
              ) : null}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="space-y-[7px] mb-4">
              {[
                { icon: "🧾", label: "Invoices / month", value: "500" },
                { icon: "👥", label: "Customers",         value: "500" },
                { icon: "🍦", label: "Products",           value: "1,000" },
                { icon: "👨‍💼", label: "Managers",          value: "Up to 5" },
                { icon: "🛵", label: "Delivery Partners",  value: "Full system" },
              ].map((c) => (
                <Chip key={c.label} icon={c.icon} label={c.label} value={c.value}
                  valClass="bg-cyan-500/10 text-cyan-400" />
              ))}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="text-[10px] uppercase tracking-[.15em] text-[#5a6a88] font-bold mb-2">Everything in Starter, plus</div>
            <ul className="flex-1 mb-6">
              {["Advanced analytics","Bulk product upload","Bulk restock upload","Full delivery partner system","Live delivery tracking","Better business reporting","Priority support"].map((f) => (
                <Feat key={f} text={f} dotClass="bg-cyan-500/10 text-cyan-400" />
              ))}
            </ul>
            <Link href="/register"
              className="block w-full text-center py-3 text-[13px] font-bold tracking-[.04em] text-black rounded-xl transition-all mt-auto hover:opacity-90"
              style={{ background: "#00d4ff", boxShadow: "0 6px 30px rgba(0,212,255,.35)" }}>
              Choose Growth
            </Link>
          </div>

          {/* BUSINESS */}
          <div className="relative rounded-3xl border border-[rgba(167,139,250,.28)] bg-[#0c1422] p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_32px_70px_rgba(0,0,0,.5)]">
            <div className="text-2xl mb-4">🏢</div>
            <div className="text-[11px] font-extrabold text-[#a78bfa] uppercase tracking-[.18em] mb-[5px]">Business</div>
            <div className="text-[12px] text-[#8899bb] mb-5 leading-[1.5]">For serious wholesalers running larger operations</div>
            <div className="flex items-baseline gap-[3px] mb-1">
              <span className="text-[20px] font-bold text-[#a78bfa] opacity-70 mt-1 self-start">₹</span>
              <span className="text-[clamp(28px,3.5vw,40px)] font-extrabold text-[#a78bfa] tracking-[-0.03em] leading-none">{g("business").price}</span>
              <span className="text-[12px] text-[#5a6a88] ml-0.5">&nbsp;{g("business").per}</span>
            </div>
            <div className="h-6 mb-4">
              {g("business").save ? (
                <span className="text-[11px] text-[#22d3a0] bg-[rgba(34,211,160,.08)] border border-[rgba(34,211,160,.15)] inline-block px-[9px] py-[2px] rounded-full">
                  ✦ {g("business").save}
                </span>
              ) : null}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="space-y-[7px] mb-4">
              {[
                { icon: "🧾", label: "Invoices / month", value: "1,500+" },
                { icon: "👥", label: "Customers",         value: "Unlimited" },
                { icon: "🍦", label: "Products",           value: "Unlimited" },
                { icon: "👨‍💼", label: "Managers",          value: "Unlimited" },
                { icon: "🛵", label: "Delivery Partners",  value: "Unlimited" },
              ].map((c) => (
                <Chip key={c.label} icon={c.icon} label={c.label} value={c.value}
                  valClass="bg-[rgba(167,139,250,.1)] text-[#a78bfa]" />
              ))}
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="text-[10px] uppercase tracking-[.15em] text-[#5a6a88] font-bold mb-2">Everything in Growth, plus</div>
            <ul className="flex-1 mb-6">
              {["Complete operational access","Full-scale team usage","Premium support","Future premium features included","Best for high-volume businesses"].map((f) => (
                <Feat key={f} text={f} dotClass="bg-[rgba(167,139,250,.1)] text-[#a78bfa]" />
              ))}
            </ul>
            <Link href="/register"
              className="block w-full text-center py-3 text-[13px] font-bold tracking-[.04em] bg-[rgba(167,139,250,.12)] text-[#a78bfa] border border-[rgba(167,139,250,.3)] rounded-xl hover:opacity-85 transition-opacity mt-auto">
              Scale with Business
            </Link>
          </div>

        </div>

        {/* ── CUSTOMIZE — dashed, separated below paid plans ──────────────── */}
        <div
          className="mb-[72px] rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-6 transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_32px_70px_rgba(0,0,0,.5)]"
          style={{ background: "linear-gradient(145deg,#120d22 0%,#0c1020 100%)", border: "1.5px dashed rgba(167,139,250,.35)" }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-2xl mb-4">🎛️</div>
            <div className="text-[11px] font-extrabold text-[#a78bfa] uppercase tracking-[.18em] mb-[5px]">Customize</div>
            <div className="text-[12px] text-[#8899bb] mb-5 leading-[1.5]">For businesses needing custom limits or special workflows</div>
            <div className="text-[clamp(22px,2.5vw,28px)] font-extrabold text-[#a78bfa] tracking-[-0.03em] mb-[4px]">Custom</div>
            <div className="text-[11.5px] text-[#5a6a88] mb-4">Pricing tailored to your needs</div>
            <div className="rounded-[10px] px-[13px] py-3 text-[12px] text-[#c4b5fd] mb-4 leading-[1.6] max-w-xl"
              style={{ background: "rgba(167,139,250,.05)", border: "1px solid rgba(167,139,250,.15)" }}>
              Need a plan tailored to your business operations? We can customize limits and workflows for you.
            </div>
            <div className="h-px bg-white/[0.07] mb-4" />
            <div className="text-[10px] uppercase tracking-[.15em] text-[#5a6a88] font-bold mb-2">What can be customized</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {["Custom invoice limits","Custom customer limits","Custom product limits","Custom manager seats","Custom delivery partner capacity","Custom onboarding support","Future custom workflow support"].map((f) => (
                <Feat key={f} text={f} dotClass="bg-[rgba(167,139,250,.1)] text-[#a78bfa]" />
              ))}
            </ul>
          </div>
          <a href="mailto:support@softvibe.in"
            className="shrink-0 self-start px-5 py-3 text-[13px] font-bold tracking-[.04em] text-[#e8eeff] rounded-xl hover:opacity-85 transition-opacity"
            style={{ background: "linear-gradient(135deg,rgba(167,139,250,.18),rgba(0,212,255,.1))", border: "1px solid rgba(167,139,250,.3)" }}>
            Talk to Us
          </a>
        </div>

        {/* ── COMPARISON TABLE ────────────────────────────────────────────── */}
        <div className="mb-[72px]">
          <div className="mb-10">
            <div className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.025em] text-[#e8eeff] mb-2">Compare what each plan includes</div>
            <div className="text-[14.5px] text-[#8899bb]">Every limit and feature side by side — no fine print.</div>
          </div>
          <div className="overflow-x-auto rounded-[20px] border border-white/[0.07] bg-[#0c1422]">
            <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-white/[0.13]">
                  <th className="text-left px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#8899bb]">Feature / Limit</th>
                  <th className="text-center px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#22d3a0]">Free Trial</th>
                  <th className="text-center px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#f59e0b]">Starter</th>
                  <th className="text-center px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-cyan-400 bg-cyan-500/[0.025]">Growth</th>
                  <th className="text-center px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#a78bfa]">Business</th>
                  <th className="text-center px-4 py-[18px] text-[10.5px] font-extrabold uppercase tracking-[.12em] text-[#c4b5fd]">Customize</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { cat: "🧾 Usage Limits" },
                    { feat: "Invoices / month",          t: "50 total",    s: "150",         g: "500",         b: "1,500+",    c: "Custom" },
                    { feat: "Customers",                 t: "25",          s: "150",         g: "500",         b: "Unlimited", c: "Custom" },
                    { feat: "Products",                  t: "50",          s: "200",         g: "1,000",       b: "Unlimited", c: "Custom" },
                    { feat: "Managers",                  t: "—",           s: "1 + Admin",   g: "Up to 5",     b: "Unlimited", c: "Custom" },
                    { feat: "Delivery Partners",         t: "—",           s: "Basic",       g: "Full system", b: "Unlimited", c: "Custom" },
                    { cat: "⚙️ Core Features" },
                    { feat: "GST Billing",               t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "PDF Invoice Download",      t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "Product Management",        t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "Stock Management",          t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "Customer Management",       t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "Customer Ledger",           t: "✓", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { feat: "Sticky Notes / Dispatch",   t: "—", s: "✓", g: "✓", b: "✓", c: "✓" },
                    { cat: "📈 Growth Features" },
                    { feat: "Bulk Product Upload",       t: "—", s: "—",          g: "✓", b: "✓", c: "Flexible" },
                    { feat: "Bulk Restock Upload",       t: "—", s: "—",          g: "✓", b: "✓", c: "Flexible" },
                    { feat: "Delivery Partner Workflow", t: "—", s: "Basic only", g: "✓", b: "✓", c: "Custom" },
                    { feat: "Live Delivery Tracking",    t: "—", s: "—",          g: "✓", b: "✓", c: "Custom" },
                    { feat: "Advanced Analytics",        t: "—", s: "—",          g: "✓", b: "✓", c: "Flexible" },
                    { feat: "Better Reporting",          t: "—", s: "Basic only", g: "✓", b: "✓", c: "Custom" },
                    { feat: "Priority Support",          t: "—", s: "—",          g: "✓", b: "✓", c: "✓" },
                  ] as Array<{ cat: string } | { feat: string; t: string; s: string; g: string; b: string; c: string }>
                ).map((row, i) => {
                  if ("cat" in row) {
                    return (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-[14px] pb-[7px] text-[9.5px] font-bold uppercase tracking-[.16em] text-[#5a6a88]"
                          style={{ background: "rgba(255,255,255,.018)" }}>
                          {row.cat}
                        </td>
                      </tr>
                    );
                  }
                  const cell = (v: string, isG?: boolean) => {
                    const bg = isG ? "bg-cyan-500/[0.025]" : "";
                    if (v === "✓") return <td className={`text-center px-4 py-[11px] border-b border-white/[0.03] ${bg}`}><span className={`text-[15px] ${isG ? "text-cyan-400" : "text-[#22d3a0]"}`}>✓</span></td>;
                    if (v === "—") return <td className={`text-center px-4 py-[11px] border-b border-white/[0.03] ${bg}`}><span className="text-[15px] text-white/10">—</span></td>;
                    if (v === "Unlimited" || v === "Full system") return <td className={`text-center px-4 py-[11px] border-b border-white/[0.03] font-bold text-[#22d3a0] ${bg}`}>{v}</td>;
                    if (v === "Custom" || v === "Flexible") return <td className={`text-center px-4 py-[11px] border-b border-white/[0.03] text-[#a78bfa] font-semibold text-[11px] ${bg}`}>{v}</td>;
                    return <td className={`text-center px-4 py-[11px] border-b border-white/[0.03] font-semibold text-[#e8eeff] text-[12px] ${bg}`}>{v}</td>;
                  };
                  return (
                    <tr key={i} className="hover:bg-white/[0.015] transition-colors">
                      <td className="px-4 py-[11px] border-b border-white/[0.03] text-[#8899bb]">{row.feat}</td>
                      {cell(row.t)}{cell(row.s)}{cell(row.g, true)}{cell(row.b)}{cell(row.c)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ADD-ONS ──────────────────────────────────────────────────────── */}
        <div className="mb-[72px]">
          <div className="mb-10">
            <div className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.025em] text-[#e8eeff] mb-2">Optional add-ons as your business grows</div>
            <div className="text-[14.5px] text-[#8899bb]">Expand your workflow without changing your main plan.</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDONS.map((ao) => (
              <div key={ao.name}
                className="bg-[#0c1422] border border-white/[0.07] rounded-[18px] p-[22px] flex flex-col transition-all duration-200 hover:border-white/[0.13] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,.4)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-[42px] h-[42px] rounded-xl bg-cyan-500/10 flex items-center justify-center text-[20px] shrink-0">{ao.icon}</div>
                  <span className="text-[13px] font-bold text-[#e8eeff]">{ao.name}</span>
                </div>
                <p className="text-[12px] text-[#8899bb] leading-[1.55] mb-[14px] flex-1">{ao.desc}</p>
                {ao.incl && (
                  <div className="flex items-center gap-[5px] text-[11.5px] text-[#a8bdd8] mb-[10px]">
                    <span className="text-cyan-400 text-[9px]">✦</span>{ao.incl}
                  </div>
                )}
                <div className={`text-[20px] font-extrabold ${ao.oneTime ? "text-[#f59e0b]" : "text-cyan-400"}`}>
                  {ao.price}<small className="text-[12px] text-[#5a6a88] font-normal ml-[3px]">{ao.per}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <div className="mb-[72px]">
          <div className="mb-10">
            <div className="text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.025em] text-[#e8eeff] mb-2">Frequently asked questions</div>
            <div className="text-[14.5px] text-[#8899bb]">Everything you need to know before choosing a plan.</div>
          </div>
          <div className="flex flex-col gap-[10px] max-w-3xl">
            {FAQS.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <div className="rounded-[28px] px-8 sm:px-12 py-16 text-center relative overflow-hidden mb-14"
          style={{ background: "linear-gradient(145deg,#0d1d35 0%,#08121f 100%)", border: "1px solid rgba(0,212,255,.15)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 80% at 50% -20%,rgba(0,212,255,.08),transparent)" }} />
          <h3 className="relative text-[clamp(26px,4vw,42px)] font-extrabold tracking-[-0.03em] text-[#e8eeff] mb-[14px]">
            Start managing your ice cream<br />business properly
          </h3>
          <p className="relative text-[15px] text-[#8899bb] max-w-[500px] mx-auto mb-9 leading-[1.65]">
            Choose a plan that fits your current operations and upgrade when your business grows.
          </p>
          <div className="relative flex flex-wrap items-center justify-center gap-[14px]">
            <Link href="/register"
              className="px-8 py-[14px] text-black text-[14px] font-bold tracking-[.04em] rounded-xl transition-all hover:opacity-90 hover:scale-[.98]"
              style={{ background: "#00d4ff", boxShadow: "0 6px 30px rgba(0,212,255,.35)" }}>
              Start Free Trial
            </Link>
            <a href="mailto:support@softvibe.in"
              className="px-8 py-[13px] text-[#e8eeff] text-[14px] font-bold tracking-[.04em] rounded-xl border border-white/[0.13] hover:border-[rgba(167,139,250,.4)] hover:bg-[rgba(167,139,250,.1)] transition-all hover:scale-[.98]">
              Talk to Us
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}