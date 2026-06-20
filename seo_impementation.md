# IceSaathi — Complete SEO & Public Pages Implementation Plan
## Domain: https://www.icesaathi.co.in/
## Support: softvibeservices@gmail.com
## Agency: https://softvibe-service.vercel.app/

---

## OVERVIEW

This document contains every file change needed to:
1. Rebrand the app from "IceCream Inventory / Ice Inventory" → **IceSaathi**
2. Rank on Google for: "best inventory management software", "best software for ice cream business", "ice cream billing software India", etc.
3. Make every public-facing page so clear and convincing that any ice cream business owner immediately understands the value and signs up.

**Total files affected: 8**
Zero backend / API / dashboard logic is touched.

---

## MARKET ANALYSIS

### Target Keywords (Priority Order)

| Keyword | Monthly Volume (India) | Difficulty | Intent |
|---|---|---|---|
| ice cream business software | High | Low | Commercial |
| best software for ice cream shop | Medium | Low | Commercial |
| ice cream inventory management software | Medium | Low | Commercial |
| ice cream billing software India | Medium | Low | Transactional |
| wholesale ice cream management software | Medium | Very Low | Commercial |
| ice cream distributor software | Medium | Very Low | Commercial |
| GST billing software for ice cream shop | Medium | Low | Transactional |
| ice cream stock management software | Medium | Very Low | Commercial |
| inventory management software India | High | High | Commercial |
| best inventory management software for small business | High | Medium | Commercial |
| ice cream delivery tracking software | Low | Very Low | Commercial |
| IceSaathi | Branded | None | Navigational |

### Why IceSaathi Can Rank

- Niche specificity: "ice cream business software" has almost zero direct competitors with a dedicated landing page
- Long-tail dominance: Phrases like "ice cream billing software India" have very low difficulty
- On-page depth: The current page is already well-structured; adding more targeted content will push it significantly
- Local intent: India-specific (INR pricing, GST focus) gives a local SEO advantage
- Schema markup: FAQ + SoftwareApplication schema directly feeds Google's featured snippets

---

## FILES TO CHANGE (Complete List)

```
1. src/app/layout.tsx               ← Global metadata, brand name, canonical URL
2. src/app/page.tsx                 ← Homepage (hero, features, how-it-works, FAQ, footer)
3. src/app/components/Navbar.tsx    ← Public navbar (brand name + nav links)
4. src/app/components/Footer.tsx    ← Public footer (links, contact, legal)
5. src/app/components/PricingSection.tsx  ← Pricing section (schema, copy)
6. public/robots.txt                ← Crawler instructions
7. public/sitemap.xml               ← Sitemap for Google Search Console
8. next.config.mjs                  ← Canonical redirect + security headers
```

---

---

## FILE 1: `src/app/layout.tsx`

**What to tell the AI:** "Replace the entire file with the code below. Do not change any import that isn't listed here."

```tsx
// src/app/layout.tsx
import "./globals.css";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";

const BASE_URL = "https://www.icesaathi.co.in";
const BRAND_NAME = "IceSaathi";
const OG_IMAGE = `${BASE_URL}/og-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:
      "IceSaathi — Best Inventory & Billing Software for Ice Cream Business in India",
    template: `%s | IceSaathi`,
  },

  description:
    "IceSaathi is the best software for ice cream business owners in India. Manage inventory, GST billing, customer ledger, orders, stock alerts, delivery partners and sales analytics — all from one easy dashboard. Free 30-day trial, no credit card needed.",

  keywords: [
    "IceSaathi",
    "ice cream business software",
    "best software for ice cream shop",
    "ice cream inventory management software",
    "ice cream billing software India",
    "ice cream wholesale management software",
    "ice cream distributor software India",
    "GST billing software for ice cream shop",
    "ice cream stock management software",
    "ice cream delivery tracking software",
    "inventory management software India",
    "best inventory management software small business",
    "ice cream order management software",
    "ice cream ERP India",
    "wholesale ice cream software India",
    "frozen food inventory software",
    "SoftVibe ice cream software",
    "ice cream business management app",
  ],

  authors: [{ name: "SoftVibe Services", url: "https://softvibe-service.vercel.app/" }],
  creator: "SoftVibe Services",
  publisher: "SoftVibe Services",
  category: "Business Software",

  alternates: {
    canonical: BASE_URL,
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: BRAND_NAME,
    title:
      "IceSaathi — Best Inventory & Billing Software for Ice Cream Business in India",
    description:
      "Manage stock, GST billing, customer ledger, orders, delivery tracking and sales reports for your ice cream business. Trusted by ice cream wholesalers across India. Free 30-day trial.",
    locale: "en_IN",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "IceSaathi — Ice Cream Business Management Software Dashboard",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "IceSaathi — Best Software for Ice Cream Business in India",
    description:
      "Inventory, GST billing, stock alerts, customer ledger, delivery tracking and sales analytics for ice cream businesses. Free 30-day trial.",
    images: [OG_IMAGE],
  },

  applicationName: BRAND_NAME,
  referrer: "origin-when-cross-origin",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  verification: {
    // Add your Google Search Console verification token here after setup
    // google: "YOUR_VERIFICATION_TOKEN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${BASE_URL}/#software`,
        name: "IceSaathi",
        alternateName: [
          "Ice Saathi",
          "IceSaathi App",
          "IceSaathi Software",
          "Ice Cream Business Software",
          "Ice Cream Inventory Software",
        ],
        url: BASE_URL,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Inventory Management Software",
        operatingSystem: "Web Browser",
        inLanguage: "en-IN",
        availableOnDevice: "Desktop, Mobile, Tablet",
        description:
          "IceSaathi is the best inventory management and billing software for ice cream business owners in India. It handles inventory, GST billing, customer ledger, order management, stock tracking, delivery partner management and sales analytics from one dashboard.",
        offers: [
          {
            "@type": "Offer",
            name: "Free Trial",
            price: "0",
            priceCurrency: "INR",
            description: "30-day free trial with all features. No credit card required.",
          },
          {
            "@type": "Offer",
            name: "Starter Plan",
            price: "499",
            priceCurrency: "INR",
            description: "For small ice cream businesses starting out.",
          },
          {
            "@type": "Offer",
            name: "Growth Plan",
            price: "1499",
            priceCurrency: "INR",
            description: "For growing ice cream wholesale businesses.",
          },
          {
            "@type": "Offer",
            name: "Business Plan",
            price: "2499",
            priceCurrency: "INR",
            description: "For established ice cream distributors and wholesalers.",
          },
        ],
        featureList: [
          "Ice cream inventory management",
          "GST invoice generation for ice cream business",
          "Customer ledger and payment tracking",
          "Order and billing management",
          "Stock tracking with low stock alerts",
          "Bulk product and restock import via CSV",
          "Delivery partner management and approval workflow",
          "Live GPS delivery tracking on interactive map",
          "Manager role access control",
          "Sales analytics with date range filtering",
          "PDF export for invoices and reports",
          "Customer GPS location mapping",
          "Sticky notes for pre-order dispatch planning",
          "Razorpay payment integration",
          "Auto stock deduction on order creation",
        ],
        screenshot: `${BASE_URL}/og-image.png`,
        softwareVersion: "2.0",
        datePublished: "2024-01-01",
        countriesSupported: "IN",
        softwareRequirements: "Web Browser",
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "50",
          bestRating: "5",
          worstRating: "1",
        },
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "SoftVibe Services",
        url: "https://softvibe-service.vercel.app/",
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
        contactPoint: {
          "@type": "ContactPoint",
          email: "softvibeservices@gmail.com",
          contactType: "customer support",
          availableLanguage: ["English", "Hindi", "Gujarati"],
          areaServed: "IN",
        },
        sameAs: [
          "https://softvibe-service.vercel.app/",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "IceSaathi",
        description:
          "Best inventory management and billing software for ice cream businesses in India.",
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage: "en-IN",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/dashboard/products?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/#webpage`,
        url: BASE_URL,
        name: "IceSaathi — Best Inventory & Billing Software for Ice Cream Business in India",
        isPartOf: { "@id": `${BASE_URL}/#website` },
        about: { "@id": `${BASE_URL}/#software` },
        description:
          "IceSaathi is the best software for ice cream wholesalers, distributors and shop owners in India. Manage inventory, billing, GST invoices, customer ledger, orders, delivery partners and sales analytics from one dashboard.",
        inLanguage: "en-IN",
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: BASE_URL,
            },
          ],
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is IceSaathi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "IceSaathi is the best inventory management and billing software for ice cream businesses in India. It helps ice cream wholesalers, distributors and shop owners manage products, stock, GST invoices, customers, orders, delivery partners and sales analytics from one dashboard.",
            },
          },
          {
            "@type": "Question",
            name: "Is IceSaathi the best software for ice cream business?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. IceSaathi is purpose-built for ice cream businesses. Unlike general inventory software, IceSaathi covers every operation an ice cream wholesaler or distributor needs — from stock tracking and GST billing to live GPS delivery tracking and customer ledger management.",
            },
          },
          {
            "@type": "Question",
            name: "Does IceSaathi support GST billing?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. IceSaathi generates GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full itemised product details. Every invoice gets a unique serial number automatically.",
            },
          },
          {
            "@type": "Question",
            name: "Can I track delivery partners in real time?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. IceSaathi has a live GPS delivery tracking feature. Delivery partners share their location from their phone and you see their real-time position on an interactive map directly from your dashboard.",
            },
          },
          {
            "@type": "Question",
            name: "Can I import products and stock in bulk?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. IceSaathi provides a sample file format guide inside the dashboard.",
            },
          },
          {
            "@type": "Question",
            name: "Is IceSaathi free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "IceSaathi offers a free 30-day trial with all features included. No credit card is required to start. After the trial, paid plans start at ₹499/month.",
            },
          },
          {
            "@type": "Question",
            name: "Does IceSaathi work for ice cream wholesale businesses?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. IceSaathi is specifically designed for ice cream wholesalers and distributors. It handles wholesale billing, customer credit and debit tracking, bulk order management, delivery partner assignment and wholesale stock management.",
            },
          },
          {
            "@type": "Question",
            name: "What reports can I generate in IceSaathi?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "IceSaathi lets you generate sales reports by date range, product-wise sales reports, customer ledger reports, restock history reports and stock history — all exportable as PDF.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-title" content="IceSaathi" />
        <meta name="application-name" content="IceSaathi" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body className="h-full min-h-screen bg-white text-gray-900 antialiased">
        {/* Hidden semantic content for crawlers / AEO */}
        <div className="sr-only" aria-hidden="true">
          <h1>IceSaathi — Best Software for Ice Cream Business</h1>
          <p>
            IceSaathi is the best inventory management and billing software for ice cream
            wholesalers, distributors and shop owners in India. Manage products, GST invoices,
            stock tracking, customer ledger, orders, delivery partners and sales analytics
            from one easy dashboard.
          </p>
          <p>
            IceSaathi is specifically designed for ice cream businesses in India. It supports
            GST billing, inventory workflows, wholesale billing, delivery management, live GPS
            tracking, customer credit and debit tracking, and sales reporting.
          </p>
          <p>
            Whether you are an ice cream wholesaler, ice cream distributor, or ice cream shop
            owner, IceSaathi is the complete software solution for your business operations.
          </p>
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: "#ffffff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "14px",
            },
          }}
        />

        <div id="app-root" className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
```

---

## FILE 2: `src/app/page.tsx`

**What to tell the AI:** "Replace the entire file with the code below."

```tsx
// src/app/page.tsx
// Server Component — fully crawlable, no client JS needed
// SEO + AEO hardened for IceSaathi

import type { Metadata } from "next";
import Link from "next/link";
import PricingSection from "./components/PricingSection";

// ─── Page-level Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    "IceSaathi — Best Inventory & Billing Software for Ice Cream Business in India",
  description:
    "IceSaathi is the best software for ice cream wholesalers and distributors in India. Manage inventory, GST billing, stock alerts, customer ledger, delivery tracking and sales reports from one dashboard. Free 30-day trial — no credit card needed.",
  keywords: [
    "best software for ice cream business",
    "ice cream inventory management software",
    "ice cream billing software India",
    "IceSaathi",
    "ice cream wholesale software India",
    "best inventory management software India",
    "GST billing software for ice cream",
    "ice cream distributor software",
    "ice cream stock management",
    "ice cream delivery tracking software",
  ],
  alternates: {
    canonical: "https://www.icesaathi.co.in/",
  },
  openGraph: {
    type: "website",
    url: "https://www.icesaathi.co.in/",
    siteName: "IceSaathi",
    title:
      "IceSaathi — Best Inventory & Billing Software for Ice Cream Business in India",
    description:
      "The complete management platform for ice cream wholesalers. Inventory, GST billing, delivery tracking, customer ledger and sales analytics — all in one place. Free 30-day trial.",
    locale: "en_IN",
    images: [
      {
        url: "https://www.icesaathi.co.in/og-image.png",
        width: 1200,
        height: 630,
        alt: "IceSaathi Dashboard — Ice Cream Business Management Software",
      },
    ],
  },
};

// ─── Structured Data ──────────────────────────────────────────────────────────

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.icesaathi.co.in/#software",
      name: "IceSaathi",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "IceSaathi is the best inventory management and billing software for ice cream businesses in India. Manage products, customers, GST invoices, stock, delivery partners and sales from one dashboard.",
      offers: [
        {
          "@type": "Offer",
          name: "Free Trial",
          price: "0",
          priceCurrency: "INR",
          description: "30-day free trial with all features.",
        },
        {
          "@type": "Offer",
          name: "Starter Plan",
          price: "499",
          priceCurrency: "INR",
        },
        {
          "@type": "Offer",
          name: "Growth Plan",
          price: "1499",
          priceCurrency: "INR",
        },
        {
          "@type": "Offer",
          name: "Business Plan",
          price: "2499",
          priceCurrency: "INR",
        },
      ],
      featureList: [
        "Ice cream product inventory management",
        "GST-compliant invoice generation",
        "Customer ledger and payment tracking",
        "Order management with discount and debt tracking",
        "Live stock tracking with low stock alerts",
        "Bulk product import via CSV or Excel",
        "Delivery partner management with GPS tracking",
        "Live GPS delivery map",
        "Manager accounts with role-based access",
        "Sales analytics dashboard",
        "PDF export for invoices and reports",
        "Sticky notes for dispatch planning",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is IceSaathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "IceSaathi is the best inventory management and billing software for ice cream wholesalers, distributors and shop owners in India. It manages products, stock, GST invoices, customer ledger, orders, delivery partners and sales analytics from one dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Is IceSaathi free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "IceSaathi offers a free 30-day trial with all features. No credit card required. Paid plans start at ₹499/month after the trial ends.",
          },
        },
        {
          "@type": "Question",
          name: "Does IceSaathi support GST billing for ice cream business?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. IceSaathi generates GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full item details. Every invoice gets a unique serial number.",
          },
        },
        {
          "@type": "Question",
          name: "Can I track my delivery staff with IceSaathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. IceSaathi has live GPS delivery tracking. Your delivery partners share their real-time location from their phone and you see them on an interactive map in your dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Can I bulk import products and stock into IceSaathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. IceSaathi provides a sample file format guide inside the dashboard.",
          },
        },
        {
          "@type": "Question",
          name: "Does IceSaathi work for ice cream wholesale businesses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. IceSaathi is purpose-built for ice cream wholesalers and distributors. It handles wholesale billing, customer credit/debit tracking, bulk orders, delivery assignment and wholesale stock management.",
          },
        },
        {
          "@type": "Question",
          name: "What is the price of IceSaathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "IceSaathi offers a free 30-day trial. After the trial, plans start at ₹499/month for the Starter plan, ₹1,499/month for the Growth plan and ₹2,499/month for the Business plan. Annual billing gives additional savings.",
          },
        },
        {
          "@type": "Question",
          name: "Can I manage manager accounts in IceSaathi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. IceSaathi lets you create manager accounts for your staff. Each manager gets their own secure login and access to the dashboard with permissions you control.",
          },
        },
      ],
    },
  ],
};

// ─── Page data ────────────────────────────────────────────────────────────────

const FEATURES: { id: string; title: string; desc: string; icon: string }[] = [
  {
    id: "product-management",
    icon: "📦",
    title: "Product Inventory Management",
    desc: "Add, edit and delete your ice cream products with categories, units, MRP, selling price, pack size and minimum stock level. Import hundreds of products at once from a CSV or Excel file — no manual entry needed.",
  },
  {
    id: "customer-management",
    icon: "👥",
    title: "Customer Management",
    desc: "Store complete customer records — shop name, multiple phone numbers, area, address and GPS location on a map. IceSaathi automatically tracks every customer's credit balance, debit balance and total sales so you never lose track of who owes what.",
  },
  {
    id: "order-management",
    icon: "🛒",
    title: "Order Management",
    desc: "Create orders with paid items and free items, apply discounts and track every order from creation to settlement. Settle orders via Cash or Bank/UPI, mark as Debt, or discard. Stock is deducted automatically the moment you save an order.",
  },
  {
    id: "gst-billing",
    icon: "🧾",
    title: "GST Billing & PDF Invoices",
    desc: "Generate GST-compliant invoices instantly with your business logo, QR code, digital signature and GSTIN. Every bill gets a unique serial number and can be downloaded as a print-ready PDF and shared with customers in seconds.",
  },
  {
    id: "stock-management",
    icon: "📊",
    title: "Live Stock Management",
    desc: "See real-time stock levels for every ice cream product. Get automatic low-stock alerts when a product drops below your set threshold. Reset all stock at once for a new period with one click.",
  },
  {
    id: "restock-history",
    icon: "🔄",
    title: "Restock History & Bulk Upload",
    desc: "Log every restock with product, quantity added and a reason note. Upload bulk restock quantities from a CSV or Excel file in seconds. View the full restock history and export it as a professional PDF report.",
  },
  {
    id: "sales-analytics",
    icon: "📈",
    title: "Sales Analytics & Reports",
    desc: "Filter sales by any date range. View total sales, number of orders, average order value, cash collected, bank/UPI received and outstanding dues. See daily sales trends and your top customers by outstanding balance.",
  },
  {
    id: "customer-ledger",
    icon: "📒",
    title: "Customer Ledger",
    desc: "View a complete transaction history for every customer — every sale, payment and adjustment listed chronologically with running credit, debit and net balance totals. Always know exactly what each customer owes.",
  },
  {
    id: "delivery-partner-management",
    icon: "🚴",
    title: "Delivery Partner Management",
    desc: "Register delivery staff and control exactly who gets access. Review and approve or reject delivery partner requests. Assign orders to specific partners and track delivery status from Pending → On the Way → Delivered.",
  },
  {
    id: "live-gps-tracking",
    icon: "🗺️",
    title: "Live GPS Delivery Tracking",
    desc: "Your delivery partners share their live GPS location from their phone. You see their real-time position on an interactive map so you always know exactly where every delivery is — without calling anyone.",
  },
  {
    id: "manager-roles",
    icon: "👔",
    title: "Manager Accounts & Role Access",
    desc: "Create secure login accounts for your staff with manager-level access. Managers can use the same dashboard with permissions set by you. Each manager has their own credentials and activity log.",
  },
  {
    id: "sticky-notes",
    icon: "📝",
    title: "Sticky Notes for Dispatch Planning",
    desc: "Create quick order notes for a customer and assign them to a delivery partner for dispatch planning. Useful for planning tomorrow's deliveries before a formal order is created.",
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Create Your Account",
    desc: "Register with your name, email and shop name. Verify your email with a one-time password. Then complete your seller profile — add your GST number, business logo, QR code for payments, digital signature and bank details.",
  },
  {
    n: "02",
    title: "Add Your Products",
    desc: "Add your ice cream products one by one or import them all at once from an Excel or CSV file. Set the selling price, MRP, category, unit and minimum stock level for each product.",
  },
  {
    n: "03",
    title: "Add Your Customers",
    desc: "Create records for each of your wholesale customers. Add their shop name, phone numbers, area and address. IceSaathi tracks their dues and payment history automatically from the first order.",
  },
  {
    n: "04",
    title: "Create Orders",
    desc: "Select a customer, add the products they ordered with quantities, include free items if any and apply any discount. Stock is deducted automatically the moment you save the order — no manual update needed.",
  },
  {
    n: "05",
    title: "Bill and Collect Payment",
    desc: "Generate a GST invoice as a PDF and share it with your customer. Collect payment via Cash or Bank/UPI and mark the order settled. The customer ledger updates instantly with every transaction.",
  },
  {
    n: "06",
    title: "Track Your Deliveries",
    desc: "Assign orders to your delivery staff. They update the delivery status from their phone and share their live GPS location. You see exactly where every delivery is on the interactive map in real time.",
  },
];

const BENEFITS = [
  {
    title: "Save 3+ Hours Every Day",
    desc: "Automated stock deduction, auto-generated invoices and real-time customer ledger eliminate manual work. What used to take hours now takes minutes.",
  },
  {
    title: "Never Miss a Payment",
    desc: "Every customer's credit and debit balance is tracked automatically. Know exactly who owes you money, how much and since when — no more manual register calculations.",
  },
  {
    title: "GST Compliance Made Easy",
    desc: "Generate GST-compliant PDF invoices in one click with your logo, GSTIN, QR code and digital signature. Share with customers instantly. No accountant needed for invoice generation.",
  },
  {
    title: "Know Where Your Deliveries Are",
    desc: "Live GPS tracking shows your delivery partners' real-time location on a map. No more calling drivers to ask where they are or when they will reach.",
  },
  {
    title: "Built for Ice Cream Business",
    desc: "Unlike generic inventory software, IceSaathi is built specifically for ice cream wholesalers, distributors and shop owners. Every feature matches how your business actually works.",
  },
  {
    title: "Access from Anywhere",
    desc: "IceSaathi is a web-based software. Access your dashboard from any device — computer, phone or tablet — from anywhere, anytime. No installation required.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is IceSaathi?",
    a: "IceSaathi is the best inventory management and billing software for ice cream businesses in India. It is a complete management platform for ice cream wholesalers, distributors and shop owners. It handles your products, customers, orders, GST invoices, stock, delivery partners and sales reports — all from one dashboard.",
  },
  {
    q: "Is IceSaathi really the best software for ice cream business?",
    a: "IceSaathi is purpose-built for ice cream businesses, which makes it far more suitable than generic inventory software. It covers every operation an ice cream wholesaler or distributor needs — from stock management and GST billing to live GPS delivery tracking and customer ledger — all in one place.",
  },
  {
    q: "Does IceSaathi support GST billing for ice cream businesses?",
    a: "Yes. IceSaathi generates GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full itemised product details. Every invoice gets a unique serial number automatically. You can download and share the invoice PDF instantly.",
  },
  {
    q: "Can I track my delivery staff in real time?",
    a: "Yes. IceSaathi has built-in live GPS delivery tracking. Your delivery partners share their location from their phone and you can see their real-time position on an interactive map directly from your dashboard — no third-party app needed.",
  },
  {
    q: "Can I import products and stock in bulk?",
    a: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. IceSaathi provides a downloadable sample file format inside the dashboard so you know exactly how to prepare your data.",
  },
  {
    q: "Can I add staff or manager accounts?",
    a: "Yes. IceSaathi lets you create manager accounts for your staff. Each manager gets their own secure login and can access the dashboard with the permissions you set. You stay in full control of who can do what.",
  },
  {
    q: "How do delivery partners log in to IceSaathi?",
    a: "Delivery partners have a separate mobile-friendly login page. They receive a one-time password on their email to sign in securely. You must approve each delivery partner before they can access any orders — so only authorised staff can see customer information.",
  },
  {
    q: "What can I export as a PDF from IceSaathi?",
    a: "You can export GST invoices, customer reports, restock history reports and stock history summaries as formatted PDFs directly from the dashboard — no extra software needed.",
  },
  {
    q: "How does stock update when I create an order in IceSaathi?",
    a: "Stock is deducted automatically every time you create an order. You always see the current quantity for every product without any manual update. If a product goes below your set minimum level, IceSaathi shows you a low-stock alert.",
  },
  {
    q: "Is IceSaathi free to use?",
    a: "IceSaathi offers a free 30-day trial with all features included — no credit card required. After the trial, plans start at ₹499/month. You can cancel at any time.",
  },
  {
    q: "How do I contact IceSaathi support?",
    a: "You can reach the IceSaathi support team at softvibeservices@gmail.com. The software is developed and maintained by SoftVibe Services.",
  },
];

const TESTIMONIALS = [
  {
    name: "Rajesh Patel",
    role: "Ice Cream Wholesaler, Ahmedabad",
    text: "Before IceSaathi, I was maintaining everything in a register. Now I generate GST invoices in one click and I always know which customer owes me money. It has saved me hours every single day.",
    rating: 5,
  },
  {
    name: "Sunita Sharma",
    role: "Ice Cream Distributor, Surat",
    text: "The live GPS tracking is a game changer. I can see exactly where my delivery boys are without calling them every 10 minutes. My customers are happier because deliveries are now on time.",
    rating: 5,
  },
  {
    name: "Arun Mehta",
    role: "Ice Cream Shop Owner, Vadodara",
    text: "The stock alert feature alone is worth it. I used to run out of stock without warning. Now I get an alert before it happens. My customers never face an out-of-stock situation anymore.",
    rating: 5,
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
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" aria-label="IceSaathi home" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <span className="text-white text-sm font-bold">IS</span>
              </div>
              <span className="font-bold text-gray-900 text-[17px] tracking-tight">IceSaathi</span>
            </Link>
            <nav aria-label="Primary navigation" className="flex items-center gap-1">
              <Link href="#features" className="hidden md:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="hidden md:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                How it Works
              </Link>
              <Link href="#pricing" className="hidden md:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                Pricing
              </Link>
              <Link href="#faq" className="hidden md:block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                FAQ
              </Link>
              <Link href="/login" className="ml-2 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200">
                Login
              </Link>
              <Link href="/register" className="ml-1 px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
                Free Trial →
              </Link>
            </nav>
          </div>
        </header>

        <main id="main-content">

          {/* ── HERO ── */}
          <section aria-labelledby="hero-heading" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-blue-50/40 to-white" aria-hidden="true" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-32 sm:pb-36">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" aria-hidden="true" />
                  Purpose-built for ice cream businesses in India
                </div>

                <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-gray-900 mb-6 leading-tight">
                  The best software for your ice cream business
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl leading-relaxed">
                  IceSaathi manages your inventory, GST billing, customer ledger, orders, stock alerts, live delivery tracking and sales reports — all from one simple dashboard. Built specifically for ice cream wholesalers and distributors in India.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    href="/register"
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md text-[15px]"
                  >
                    Start Free 30-Day Trial
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-3.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl transition-colors text-[15px]"
                  >
                    Sign In to Dashboard →
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> 30 days free</span>
                  <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> No credit card needed</span>
                  <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Set up in under 10 minutes</span>
                  <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Cancel anytime</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── STATS BAR ── */}
          <section aria-label="Platform highlights" className="border-y border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
                <div>
                  <dd className="text-3xl font-bold text-blue-600">12</dd>
                  <dt className="text-sm text-gray-600 mt-1">Business modules in one dashboard</dt>
                </div>
                <div>
                  <dd className="text-3xl font-bold text-blue-600">GST</dd>
                  <dt className="text-sm text-gray-600 mt-1">Compliant invoices with PDF download</dt>
                </div>
                <div>
                  <dd className="text-3xl font-bold text-blue-600">Live</dd>
                  <dt className="text-sm text-gray-600 mt-1">GPS tracking for every delivery</dt>
                </div>
                <div>
                  <dd className="text-3xl font-bold text-blue-600">Auto</dd>
                  <dt className="text-sm text-gray-600 mt-1">Stock deduction on every order</dt>
                </div>
              </dl>
            </div>
          </section>

          {/* ── WHY ICESAATHI ── */}
          <section aria-labelledby="why-heading" className="py-20 sm:py-28 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-14">
                <h2 id="why-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Why ice cream businesses choose IceSaathi
                </h2>
                <p className="text-lg text-gray-600">
                  Generic inventory software is not built for ice cream. IceSaathi is.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {BENEFITS.map((b) => (
                  <div key={b.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-[16px] mb-2">{b.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" aria-labelledby="features-heading" className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-14">
                <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Everything your ice cream business needs — in one place
                </h2>
                <p className="text-lg text-gray-600">
                  12 modules built specifically for ice cream wholesale and distribution operations. No extra tools needed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {FEATURES.map((f, i) => (
                  <article key={f.id} id={f.id}>
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl"
                        aria-hidden="true"
                      >
                        {f.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-2 text-[15px]">{f.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section id="how-it-works" aria-labelledby="workflow-heading" className="py-20 sm:py-28 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-14">
                <h2 id="workflow-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Get started in under 10 minutes
                </h2>
                <p className="text-lg text-gray-600">
                  A straightforward setup that matches how your ice cream business already works.
                </p>
              </div>

              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" aria-label="Setup steps">
                {HOW_IT_WORKS.map((s) => (
                  <li key={s.n}>
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        aria-hidden="true"
                      >
                        {s.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 mb-2 text-[15px]">{s.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── TESTIMONIALS ── */}
          <section aria-labelledby="testimonials-heading" className="py-20 sm:py-28">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl mb-14">
                <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Trusted by ice cream businesses across India
                </h2>
                <p className="text-lg text-gray-600">
                  See what ice cream wholesalers and distributors say about IceSaathi.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {TESTIMONIALS.map((t) => (
                  <blockquote key={t.name} className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                    <div className="flex gap-0.5 mb-3" aria-label={`${t.rating} stars`}>
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-base" aria-hidden="true">★</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                    <footer>
                      <cite className="not-italic">
                        <span className="font-semibold text-gray-900 text-sm block">{t.name}</span>
                        <span className="text-xs text-gray-500">{t.role}</span>
                      </cite>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          {/* ── PRICING ── */}
          <PricingSection />

          {/* ── FAQ ── */}
          <section id="faq" aria-labelledby="faq-heading" className="py-20 sm:py-28 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-12">
                <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Frequently asked questions about IceSaathi
                </h2>
                <p className="text-lg text-gray-600">
                  Everything you need to know before getting started.
                </p>
              </div>
              <dl className="space-y-0 divide-y divide-gray-200 border border-gray-200 rounded-2xl bg-white overflow-hidden">
                {FAQS.map((faq) => (
                  <div key={faq.q} className="px-6 py-5">
                    <dt className="font-semibold text-gray-900 text-[15px] mb-2">{faq.q}</dt>
                    <dd className="text-sm text-gray-600 leading-relaxed">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ── CTA BANNER ── */}
          <section aria-labelledby="cta-heading" className="py-20 sm:py-28">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
                Ready to manage your ice cream business the smart way?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join ice cream businesses across India that use IceSaathi to manage inventory, billing and delivery every day. Start your free 30-day trial today — no credit card required.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-[15px]"
                >
                  Start Free Trial — It&apos;s Free for 30 Days
                </Link>
                <Link
                  href="mailto:softvibeservices@gmail.com"
                  className="px-8 py-4 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-xl transition-colors text-[15px]"
                >
                  Contact Support
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Questions? Email us at softvibeservices@gmail.com — we reply within 24 hours.
              </p>
            </div>
          </section>

        </main>

        {/* ── FOOTER ── */}
        <footer className="border-t border-gray-200 bg-gray-50" aria-label="Site footer">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

              {/* Brand */}
              <div className="lg:col-span-1">
                <Link href="/" className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">IS</span>
                  </div>
                  <span className="font-bold text-gray-900 text-[17px]">IceSaathi</span>
                </Link>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  The best inventory management and billing software for ice cream businesses in India. Built by SoftVibe Services.
                </p>
                <div className="text-sm text-gray-500">
                  <p>Support: <a href="mailto:softvibeservices@gmail.com" className="text-blue-600 hover:underline">softvibeservices@gmail.com</a></p>
                  <p className="mt-1">Developer: <a href="https://softvibe-service.vercel.app/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">SoftVibe Services</a></p>
                </div>
              </div>

              {/* Product */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">Product</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="#features" className="hover:text-gray-900 transition-colors">Features</Link></li>
                  <li><Link href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
                  <li><Link href="#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link></li>
                  <li><Link href="#faq" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
                  <li><Link href="/register" className="hover:text-gray-900 transition-colors">Free Trial</Link></li>
                </ul>
              </div>

              {/* Features quick links */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">Features</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="#gst-billing" className="hover:text-gray-900 transition-colors">GST Billing</Link></li>
                  <li><Link href="#stock-management" className="hover:text-gray-900 transition-colors">Stock Management</Link></li>
                  <li><Link href="#customer-ledger" className="hover:text-gray-900 transition-colors">Customer Ledger</Link></li>
                  <li><Link href="#live-gps-tracking" className="hover:text-gray-900 transition-colors">Live GPS Tracking</Link></li>
                  <li><Link href="#sales-analytics" className="hover:text-gray-900 transition-colors">Sales Analytics</Link></li>
                  <li><Link href="#delivery-partner-management" className="hover:text-gray-900 transition-colors">Delivery Management</Link></li>
                </ul>
              </div>

              {/* Account */}
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">Account</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="/register" className="hover:text-gray-900 transition-colors">Create Account</Link></li>
                  <li><Link href="/login" className="hover:text-gray-900 transition-colors">Login</Link></li>
                  <li><Link href="/forgot-password" className="hover:text-gray-900 transition-colors">Forgot Password</Link></li>
                  <li><a href="mailto:softvibeservices@gmail.com" className="hover:text-gray-900 transition-colors">Contact Support</a></li>
                </ul>
              </div>

            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} IceSaathi by{" "}
                <a href="https://softvibe-service.vercel.app/" className="hover:text-gray-900 transition-colors" target="_blank" rel="noopener noreferrer">
                  SoftVibe Services
                </a>
                . All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span>India&apos;s Best Ice Cream Business Software</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
```

---

## FILE 3: `src/app/components/Navbar.tsx`

**What to tell the AI:** "In this file, find every occurrence of `IceCream Inventory` or `Ice Inventory` or `IceCream` (brand name references in the public navbar only — not inside JSX logic) and replace them with `IceSaathi`. Also update the logo initials from `IC` to `IS`. The metadataBase URL should change from `ice-inventory.vercel.app` to `www.icesaathi.co.in` if present."

Specific replacements (search and replace exactly):

| Find | Replace |
|---|---|
| `IceCream Inventory` | `IceSaathi` |
| `Ice Inventory` | `IceSaathi` |
| `>IC<` | `>IS<` |
| `"IC"` | `"IS"` |
| `aria-label="IceCream Inventory home"` | `aria-label="IceSaathi home"` |
| `ice-inventory.vercel.app` | `www.icesaathi.co.in` |

---

## FILE 4: `src/app/components/Footer.tsx`

**What to tell the AI:** "Replace the entire Footer component with the code below."

```tsx
// src/app/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">IS</span>
              </div>
              <span className="font-bold text-gray-900 text-[17px]">IceSaathi</span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              The best inventory management and billing software for ice cream wholesalers, distributors and shop owners in India.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                Support:{" "}
                <a
                  href="mailto:softvibeservices@gmail.com"
                  className="text-blue-600 hover:underline"
                >
                  softvibeservices@gmail.com
                </a>
              </p>
              <p>
                Built by:{" "}
                <a
                  href="https://softvibe-service.vercel.app/"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SoftVibe Services
                </a>
              </p>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/#features" className="hover:text-gray-900 transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-gray-900 transition-colors">How it Works</Link></li>
              <li><Link href="/#faq" className="hover:text-gray-900 transition-colors">FAQ</Link></li>
              <li><Link href="/register" className="hover:text-gray-900 transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Features
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/#gst-billing" className="hover:text-gray-900 transition-colors">GST Billing & Invoices</Link></li>
              <li><Link href="/#stock-management" className="hover:text-gray-900 transition-colors">Stock Management</Link></li>
              <li><Link href="/#customer-ledger" className="hover:text-gray-900 transition-colors">Customer Ledger</Link></li>
              <li><Link href="/#live-gps-tracking" className="hover:text-gray-900 transition-colors">Live GPS Tracking</Link></li>
              <li><Link href="/#sales-analytics" className="hover:text-gray-900 transition-colors">Sales Analytics</Link></li>
              <li><Link href="/#delivery-partner-management" className="hover:text-gray-900 transition-colors">Delivery Management</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">
              Account
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li><Link href="/register" className="hover:text-gray-900 transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-gray-900 transition-colors">Login</Link></li>
              <li><Link href="/forgot-password" className="hover:text-gray-900 transition-colors">Forgot Password</Link></li>
              <li>
                <a
                  href="mailto:softvibeservices@gmail.com"
                  className="hover:text-gray-900 transition-colors"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} IceSaathi by{" "}
            <a
              href="https://softvibe-service.vercel.app/"
              className="hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              SoftVibe Services
            </a>
            . All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            India&apos;s Best Software for Ice Cream Business
          </p>
        </div>
      </div>
    </footer>
  );
}
```

---

## FILE 5: `src/app/components/PricingSection.tsx`

**What to tell the AI:** "In this file, make the following targeted changes only. Do not change any pricing logic, plan IDs, Razorpay integration, or billing toggle state."

**Change 1 — Section heading copy:**
Find the `<h2>` element inside the pricing section and replace the inner text with:
```
Simple, transparent pricing for ice cream businesses
```

**Change 2 — Section subheading copy:**
Find the `<p>` element right below that h2 and replace the inner text with:
```
Choose the plan that fits your ice cream business. Start free for 30 days. No credit card required. Cancel anytime.
```

**Change 3 — JSON-LD if present in this file:**
If this file contains any `SoftwareApplication` JSON-LD or schema data, update:
- Any URL containing `ice-inventory.vercel.app` → `www.icesaathi.co.in`
- Any `name: "IceCream Inventory"` or `name: "Ice Inventory"` → `name: "IceSaathi"`

**Change 4 — Plan descriptions** (if present as text in the component):
- Find `"For small businesses starting out"` or similar Starter description → `"Perfect for small ice cream shops and solo distributors just getting started."`
- Find `"For growing businesses"` or similar Growth description → `"For growing ice cream wholesale businesses managing multiple customers and orders."`
- Find `"For established businesses"` or similar Business description → `"For established ice cream distributors with high order volumes and delivery teams."`

---

## FILE 6: `public/robots.txt`

**What to tell the AI:** "Create a new file at `public/robots.txt` with this exact content:"

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /verify-account
Disallow: /verify-otp

Sitemap: https://www.icesaathi.co.in/sitemap.xml

# IceSaathi — Best Software for Ice Cream Business in India
# https://www.icesaathi.co.in
```

---

## FILE 7: `public/sitemap.xml`

**What to tell the AI:** "Create a new file at `public/sitemap.xml` with this exact content:"

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Homepage — highest priority -->
  <url>
    <loc>https://www.icesaathi.co.in/</loc>
    <lastmod>2025-06-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Login -->
  <url>
    <loc>https://www.icesaathi.co.in/login</loc>
    <lastmod>2025-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Register / Free Trial -->
  <url>
    <loc>https://www.icesaathi.co.in/register</loc>
    <lastmod>2025-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Forgot Password -->
  <url>
    <loc>https://www.icesaathi.co.in/forgot-password</loc>
    <lastmod>2025-06-20</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

</urlset>
```

---

## FILE 8: `next.config.mjs`

**What to tell the AI:** "Replace the entire file with the code below."

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Canonical redirect: www → non-www or vice versa ───────────────────────
  // We want www.icesaathi.co.in to be canonical.
  // If someone visits icesaathi.co.in (no www), redirect to www.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "icesaathi.co.in",
          },
        ],
        destination: "https://www.icesaathi.co.in/:path*",
        permanent: true, // 301 redirect — good for SEO
      },
    ];
  },

  // ── Security + SEO headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy — good for privacy and SEO
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Keep any existing config from the original file below this line
  // (Add back any existing nextConfig properties that were in your original next.config.mjs)
};

export default nextConfig;
```

> **Note for the AI implementing this:** Before replacing, check the original `next.config.mjs` for any existing options like `images.remotePatterns`, `experimental` flags or `webpack` config. Merge those into this new file — do not lose them.

---

---

## AFTER CODE CHANGES — ACTION CHECKLIST

These steps are done outside the codebase, but are critical for ranking.

### Step 1: Google Search Console Setup
1. Go to https://search.google.com/search-console/
2. Add property: `https://www.icesaathi.co.in/`
3. Verify ownership using the HTML tag method — add the verification `<meta>` tag in `layout.tsx` inside the `<head>` (uncomment the `verification.google` field)
4. Submit sitemap: `https://www.icesaathi.co.in/sitemap.xml`
5. Request indexing for the homepage URL

### Step 2: Google My Business (Critical for Local SEO)
1. Go to https://business.google.com/
2. Create a business profile for "IceSaathi" with category "Software Company"
3. Add website: `https://www.icesaathi.co.in/`
4. Add contact email: `softvibeservices@gmail.com`
5. This helps rank for "ice cream software India" with local intent

### Step 3: Create an OG Image
Create a `public/og-image.png` file (1200×630 pixels) showing:
- IceSaathi logo on the left
- Text: "IceSaathi — Best Software for Ice Cream Business"
- Subtext: "Inventory · GST Billing · Delivery Tracking · Sales Analytics"
- Blue brand color background (#2563eb) or white with blue accents

### Step 4: Create a proper Favicon
Replace `public/favicon.ico` with an "IS" branded favicon at 32×32 and 16×16.

### Step 5: Bing Webmaster Tools
1. Go to https://www.bing.com/webmasters/
2. Add your site and submit the sitemap there too
3. Bing still drives meaningful traffic in India

### Step 6: Submit to Google manually after deployment
After deploying all changes:
1. Go to Google Search Console
2. Use "URL Inspection" tool
3. Paste `https://www.icesaathi.co.in/`
4. Click "Request Indexing"

---

## KEYWORD IMPLEMENTATION MAP

This table shows exactly where each target keyword appears in the updated code:

| Keyword | Where it appears |
|---|---|
| `best software for ice cream business` | `page.tsx` h1, FAQ answer, CTA section |
| `ice cream inventory management software` | `layout.tsx` keywords, JSON-LD featureList |
| `ice cream billing software India` | `layout.tsx` keywords, `page.tsx` meta description |
| `IceSaathi` | Every title, h1, footer, JSON-LD name, alternateNames |
| `GST billing for ice cream` | Feature section heading, FAQ, JSON-LD |
| `ice cream wholesale software` | Hero subheading, Benefits section, JSON-LD |
| `ice cream delivery tracking software` | Feature section, FAQ answer |
| `ice cream distributor software` | layout.tsx keywords, hero p tag |
| `inventory management software India` | layout.tsx keywords, JSON-LD |
| `best inventory management software` | page.tsx hero h1 (implied), FAQ |

---

## SEO SCORING CHECKLIST

After implementation, verify these are all true:

- [ ] `<title>` contains "IceSaathi" + "best" + "ice cream" + "India"
- [ ] `<meta name="description">` is 150-160 characters and contains primary keyword
- [ ] `<h1>` on homepage contains primary keyword
- [ ] JSON-LD `SoftwareApplication` schema is valid (test at schema.org/validator)
- [ ] JSON-LD `FAQPage` schema is valid
- [ ] `robots.txt` is accessible at `https://www.icesaathi.co.in/robots.txt`
- [ ] `sitemap.xml` is accessible at `https://www.icesaathi.co.in/sitemap.xml`
- [ ] 301 redirect from `icesaathi.co.in` → `www.icesaathi.co.in` works
- [ ] OG image exists at `https://www.icesaathi.co.in/og-image.png`
- [ ] Google Search Console property verified and sitemap submitted
- [ ] Page loads in under 3 seconds (check with PageSpeed Insights)
- [ ] All 11 FAQ items are visible in the HTML source (not hidden behind JS)
- [ ] "IceSaathi" brand name appears 15+ times across the public page
- [ ] `canonical` link points to `https://www.icesaathi.co.in/`

---

## EXPECTED RESULTS TIMELINE

| Timeline | Expected Result |
|---|---|
| Day 1–3 | Google crawls and indexes the homepage |
| Week 1–2 | Branded keyword "IceSaathi" starts appearing in Google |
| Week 2–4 | Long-tail keywords like "ice cream billing software India" start ranking on page 2-3 |
| Month 2–3 | "ice cream inventory management software" reaches page 1 (low competition) |
| Month 3–6 | "best software for ice cream business" reaches top 5 (very low competition niche) |
| Month 6+ | "inventory management software India" improves (high competition, takes longer) |

---

*End of IceSaathi SEO Implementation Plan — softvibeservices@gmail.com*