// src/app/page.tsx
// Server Component — fully crawlable, no client JS needed
// src/app/page.tsx
// Server Component — fully crawlable, no client JS needed
// src/app/page.tsx
// Minimal, professional SaaS homepage design
// src/app/page.tsx
// Server Component — fully crawlable, zero client JS
// SEO + AEO (Answer Engine Optimisation) hardened

import type { Metadata } from "next";
import Link from "next/link";
import PricingSection from "./components/PricingSection";

// ─── Metadata (OpenGraph + Twitter + canonical) ───────────────────────────────

export const metadata: Metadata = {
  title: "Ice Saathi — Wholesale Inventory, Billing & Delivery Management",
  description:
    "Ice Saathi is a complete management platform for ice cream wholesalers. Manage products, customers, GST invoices, stock alerts, delivery tracking and sales reports from one dashboard. Free 30-day trial.",
  keywords: [
    "ice cream inventory management",
    "ice cream wholesale software",
    "GST billing software India",
    "delivery partner tracking",
    "wholesale stock management",
    "ice cream distributor software",
    "inventory management India",
    "SoftVibe ice saathi",
  ],
  authors: [{ name: "SoftVibe Services" }],
  creator: "SoftVibe Services",
  publisher: "SoftVibe Services",
  metadataBase: new URL("https://ice-inventory.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Ice Saathi",
    title: "Ice Saathi — Wholesale Inventory, Billing & Delivery Management",
    description:
      "Complete inventory, GST billing and delivery management for ice cream wholesalers. 12 business modules. Free 30-day trial.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ice Saathi — Inventory & Billing for Ice Cream Wholesalers",
    description:
      "Manage products, customers, GST invoices, stock, delivery partners and sales — all from one dashboard.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
};

// ─── Structured Data (JSON-LD) ────────────────────────────────────────────────

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://ice-inventory.vercel.app/#software",
      name: "Ice Saathi",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Ice Saathi is a complete management platform for ice cream wholesalers. It handles products, customers, orders, GST billing, stock management, delivery partner tracking and sales analytics.",
      offers: [
        {
          "@type": "Offer",
          name: "Free Trial",
          price: "0",
          priceCurrency: "INR",
          description: "30-day free trial with no credit card required.",
        },
        {
          "@type": "Offer",
          name: "Starter Plan",
          price: "499",
          priceCurrency: "INR",
          billingIncrement: "P1M",
        },
        {
          "@type": "Offer",
          name: "Growth Plan",
          price: "1499",
          priceCurrency: "INR",
          billingIncrement: "P1M",
        },
        {
          "@type": "Offer",
          name: "Business Plan",
          price: "2499",
          priceCurrency: "INR",
          billingIncrement: "P1M",
        },
      ],
      featureList: [
        "Product Management with bulk CSV import",
        "Customer Management with GPS location",
        "Order Management with discount and debt tracking",
        "GST-compliant PDF invoice generation",
        "Live stock management with low-stock alerts",
        "Restock history with bulk upload support",
        "Sales analytics with date-range filtering",
        "Customer ledger with transaction history",
        "Delivery partner management with approval workflow",
        "Live GPS delivery tracking on interactive map",
        "Manager accounts with role-based access",
        "Sticky notes for pre-order dispatch planning",
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://ice-inventory.vercel.app/#org",
      name: "SoftVibe Services",
      url: "https://ice-inventory.vercel.app",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@softvibe.in",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://ice-inventory.vercel.app/#website",
      url: "https://ice-inventory.vercel.app",
      name: "Ice Saathi",
      publisher: { "@id": "https://ice-inventory.vercel.app/#org" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Ice Saathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ice Saathi is a complete management platform for ice cream wholesalers and retailers. It handles products, customers, orders, billing, stock, delivery partners and sales reports — all from one dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Does Ice Saathi support GST billing?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can generate GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full itemised product details. Every invoice gets a unique serial number automatically.",
          },
        },
        {
          "@type": "Question",
          name: "Can I track delivery staff in real time?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Delivery partners share their GPS location from their phone and you can see their live position on a map directly from your dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Can I import products and stock in bulk?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. The platform provides a sample file format guide inside.",
          },
        },
        {
          "@type": "Question",
          name: "Can I add manager accounts for my staff?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can create manager accounts for your staff. They get access to the same dashboard and you control their permissions.",
          },
        },
        {
          "@type": "Question",
          name: "How do delivery partners log in?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Delivery partners have a separate mobile-friendly login. They receive a one-time password on their email to sign in securely. You approve each partner before they can access any orders.",
          },
        },
        {
          "@type": "Question",
          name: "What can I export as PDF from Ice Saathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can export GST invoices, customer reports, restock history and stock history summaries as formatted PDFs directly from the dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "How does stock update when I create an order?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Stock is deducted automatically every time an order is created. You always see the current quantity without any manual update needed.",
          },
        },
      ],
    },
  ],
};

// ─── Page data ────────────────────────────────────────────────────────────────

const FEATURES: { id: string; title: string; desc: string }[] = [
  {
    id: "product-management",
    title: "Product Management",
    desc: "Add, edit and delete your ice cream products. Set categories, units, MRP, selling price, pack size and minimum stock level. Import multiple products at once from a CSV or Excel file.",
  },
  {
    id: "customer-management",
    title: "Customer Management",
    desc: "Store complete customer records — shop name, multiple contacts, area, address and GPS location. The system automatically tracks each customer's credit, debit and total sales.",
  },
  {
    id: "order-management",
    title: "Order Management",
    desc: "Create orders with paid and free items, apply discounts and track every order from creation to settlement. Settle via Cash or Bank/UPI, mark as Debt, or discard. Filter by Unsettled, Settled, Debt and Discarded tabs.",
  },
  {
    id: "gst-billing",
    title: "GST Billing and PDF Invoices",
    desc: "Generate GST-compliant invoices with your business logo, QR code, digital signature and GSTIN. Every bill includes a unique serial number and can be downloaded as a print-ready PDF instantly.",
  },
  {
    id: "stock-management",
    title: "Stock Management",
    desc: "See live stock levels for every product. Get automatic low-stock alerts when a product drops below your set threshold. Reset all stock at once for a new period.",
  },
  {
    id: "restock-history",
    title: "Restock History",
    desc: "Log every restock with product, quantity added and a reason note. Upload bulk restock quantities from a CSV or Excel file. View the full restock history and export it as a PDF.",
  },
  {
    id: "sales-analytics",
    title: "Sales Analytics",
    desc: "Filter sales by date range. View total sales, number of orders, average order value, cash collected, bank/UPI collected and outstanding dues. See daily sales trends and your top customers by outstanding balance.",
  },
  {
    id: "customer-ledger",
    title: "Customer Ledger",
    desc: "View a complete transaction history per customer — every sale, payment and adjustment listed chronologically with running credit, debit and net balance totals.",
  },
  {
    id: "delivery-partner-management",
    title: "Delivery Partner Management",
    desc: "Register delivery staff and control who gets access. Review and approve or reject partner requests. Assign orders to partners and track delivery status from Pending to On the Way to Delivered.",
  },
  {
    id: "live-gps-tracking",
    title: "Live GPS Delivery Tracking",
    desc: "Delivery partners share their live location from their phone. You see their real-time position on an interactive map so you always know where your deliveries are.",
  },
  {
    id: "manager-roles",
    title: "Manager Accounts",
    desc: "Create accounts for your staff with manager-level access. Managers can use the same dashboard with permissions set by you. Each manager has their own secure login.",
  },
  {
    id: "sticky-notes",
    title: "Sticky Notes",
    desc: "Create quick order notes for a customer and assign them to a delivery partner for dispatch. Useful for planning before a formal order is created.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Create your account",
    desc: "Register with your name, email and shop name. Verify your email with a one-time password. Then set up your seller profile — GST number, logo, QR code, digital signature and bank details.",
  },
  {
    n: "02",
    title: "Add your products",
    desc: "Add your ice cream products one by one or import them all at once from an Excel or CSV file. Set the selling price, MRP, category, unit and minimum stock level for each.",
  },
  {
    n: "03",
    title: "Add your customers",
    desc: "Create records for each of your wholesale customers. Add their shop name, contacts, area and address. The system tracks their dues and payments automatically.",
  },
  {
    n: "04",
    title: "Create orders",
    desc: "Select a customer and add the products they ordered with quantities. Add free items if any. Apply a discount. Stock is deducted automatically the moment you save the order.",
  },
  {
    n: "05",
    title: "Bill and collect payment",
    desc: "Generate a GST invoice as a PDF and share it with your customer. Collect payment via Cash or Bank/UPI and mark the order settled. The customer ledger updates instantly.",
  },
  {
    n: "06",
    title: "Track your deliveries",
    desc: "Assign orders to your delivery staff. They update the delivery status from their phone and share their live location. You see exactly where every delivery is on the map.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Ice Saathi?",
    a: "Ice Saathi is a complete management platform for ice cream wholesalers and retailers. It handles your products, customers, orders, billing, stock, delivery partners and sales reports — all from one dashboard.",
  },
  {
    q: "Does it support GST billing?",
    a: "Yes. You can generate GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full itemised product details. Every invoice gets a unique serial number automatically.",
  },
  {
    q: "Can I track my delivery staff in real time?",
    a: "Yes. Delivery partners share their GPS location from their phone and you can see their live position on a map directly from your dashboard.",
  },
  {
    q: "Can I import products and stock in bulk?",
    a: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. The platform provides a sample file format guide inside.",
  },
  {
    q: "Can I add staff or manager accounts?",
    a: "Yes. You can create manager accounts for your staff. They get access to the same dashboard and you control their permissions.",
  },
  {
    q: "How do delivery partners log in?",
    a: "Delivery partners have a separate mobile-friendly login. They receive a one-time password on their email to sign in securely. You approve each partner before they can access any orders.",
  },
  {
    q: "What can I export as PDF?",
    a: "You can export GST invoices, customer reports, restock history and stock history summaries as formatted PDFs directly from the dashboard.",
  },
  {
    q: "How does stock update when I create an order?",
    a: "Stock is deducted automatically every time an order is created. You always see the current quantity without any manual update needed.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gray-900 focus:text-white focus:text-sm focus:rounded-lg"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-white">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" aria-label="Ice Saathi home" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md" aria-hidden="true">
                <span className="text-white text-xl font-bold">IS</span>
              </div>
              <span className="font-semibold text-gray-900">Ice Saathi</span>
            </Link>
            <nav aria-label="Primary navigation" className="flex items-center gap-1">
              <Link href="#features" className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="ml-2 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                Login
              </Link>
              <Link href="/register" className="ml-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Get Started
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content">

          {/* ── HERO ── */}
          <section aria-labelledby="hero-heading" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" aria-hidden="true" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                  Built for ice cream wholesale businesses in India
                </div>

                <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                  Run your ice cream wholesale business from one dashboard
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl">
                  Products, customers, orders, GST invoices, stock alerts, delivery tracking and sales reports — everything in one place. Free 30-day trial, no credit card needed.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Sign In →
                  </Link>
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  30 days free · No credit card required · Set up in minutes
                </p>
              </div>
            </div>
          </section>

          {/* ── STATS BAR ── */}
          <section aria-label="Platform highlights" className="border-y border-gray-200 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                <div>
                  <dt className="text-sm text-gray-600 mt-1">Business modules</dt>
                  <dd className="text-3xl font-bold text-gray-900">12</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 mt-1">Compliant invoices</dt>
                  <dd className="text-3xl font-bold text-gray-900">GST</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 mt-1">GPS delivery tracking</dt>
                  <dd className="text-3xl font-bold text-gray-900">Live</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 mt-1">Stock updates</dt>
                  <dd className="text-3xl font-bold text-gray-900">Auto</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" aria-labelledby="features-heading" className="py-24 sm:py-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-16">
                <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Everything your ice cream business needs
                </h2>
                <p className="text-lg text-gray-600">
                  12 modules built specifically for ice cream wholesale and distribution operations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {FEATURES.map((f, i) => (
                  <article key={f.id} id={f.id}>
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm"
                        aria-hidden="true"
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section id="how-it-works" aria-labelledby="workflow-heading" className="py-24 sm:py-32 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-16">
                <h2 id="workflow-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Up and running in minutes
                </h2>
                <p className="text-lg text-gray-600">
                  A straightforward setup that matches how your business already works.
                </p>
              </div>

              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" aria-label="Setup steps">
                {HOW_IT_WORKS.map((s) => (
                  <li key={s.n}>
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm"
                        aria-hidden="true"
                      >
                        {s.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── PRICING ── */}
          <PricingSection />

          {/* ── FAQ ── */}
          <section id="faq" aria-labelledby="faq-heading" className="py-24 sm:py-32 bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-12">
                <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Frequently asked questions
                </h2>
                <p className="text-lg text-gray-600">
                  Everything you need to know before getting started.
                </p>
              </div>

              {/*
                Rendered as plain <dl> — no JS accordion.
                All answers are visible to crawlers and AI answer engines.
              */}
              <dl className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                {FAQS.map((faq) => (
                  <div key={faq.q} className="px-6 py-5">
                    <dt className="font-semibold text-gray-900 mb-2 text-sm">{faq.q}</dt>
                    <dd className="text-sm text-gray-600 leading-relaxed">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ── CTA ── */}
          <section id="get-started" aria-labelledby="cta-heading" className="py-24 sm:py-32 bg-blue-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                Start managing your ice cream business today
              </h2>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
                Create your account, verify your email and you are ready. No setup fees, no complicated onboarding. Free for 30 days.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-white hover:bg-gray-100 text-blue-600 font-medium rounded-lg transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 border border-blue-400 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Already have an account? Login →
                </Link>
              </div>
            </div>
          </section>

        </main>

        {/* ── FOOTER ── */}
        <footer aria-label="Site footer" className="bg-gray-900 text-gray-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md" aria-hidden="true">
                    <span className="text-white text-xl font-bold">IS</span>
                  </div>
                  <span className="font-semibold text-white">Ice Saathi</span>
                </div>
                <p className="text-sm leading-relaxed">
                  Inventory, GST billing and delivery management for ice cream wholesalers and retailers in India.
                </p>
                <p className="text-sm mt-3">
                  <a href="mailto:support@softvibe.in" className="hover:text-white transition-colors">
                    support@softvibe.in
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Platform</h3>
                <ul className="space-y-2">
                  {[
                    { href: "#features",     label: "Features" },
                    { href: "#how-it-works", label: "How it Works" },
                    { href: "#pricing",      label: "Pricing" },
                    { href: "#faq",          label: "FAQ" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Features</h3>
                <ul className="space-y-2">
                  {[
                    "Product Management",
                    "Customer Management",
                    "Order Management",
                    "GST Billing",
                    "Stock Management",
                    "Delivery Tracking",
                  ].map((m) => (
                    <li key={m} className="text-sm">{m}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Account</h3>
                <ul className="space-y-2">
                  {[
                    { href: "/register",         label: "Create Account" },
                    { href: "/login",            label: "Login" },
                    { href: "/forgot-password",  label: "Forgot Password" },
                    { href: "/verify-account",   label: "Verify Account" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm">
                © {new Date().getFullYear()} Ice Saathi · by{" "}
                <a href="mailto:support@softvibe.in" className="hover:text-white transition-colors">
                  SoftVibe Services
                </a>
                . All rights reserved.
              </p>
              <p className="text-xs text-gray-600">
                GST billing · Stock management · Delivery tracking · India
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}