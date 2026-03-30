// src/app/layout.tsx

import "./globals.css";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";

const BASE_URL = "https://ice-inventory.vercel.app";
const BRAND_NAME = "Ice Inventory";
const OG_IMAGE = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Ice Inventory — Inventory, Billing & Delivery Software for Ice Cream Businesses",
    template: `%s | ${BRAND_NAME}`,
  },

  description:
    "Ice Inventory is inventory, billing, stock tracking and delivery management software for ice cream wholesalers, distributors and shop owners. Manage products, GST invoices, customer ledger, orders, delivery partners and analytics from one dashboard.",

  keywords: [
    "ice inventory",
    "ice cream inventory software",
    "ice cream billing software",
    "ice cream wholesale management software",
    "ice cream distributor software",
    "stock tracking software for ice cream business",
    "GST billing software for ice cream shop",
    "ice cream order management software",
    "ice cream delivery management software",
    "inventory software for frozen food business",
    "customer ledger software for distributors",
    "ice cream business software India",
    "ice cream ERP",
    "inventory and billing software for ice cream shop",
  ],

  authors: [{ name: BRAND_NAME, url: BASE_URL }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  category: "Business Software",

  alternates: {
    canonical: "/",
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
      "Ice Inventory — Inventory, Billing & Delivery Software for Ice Cream Businesses",
    description:
      "Manage stock, billing, GST invoices, customer ledger, delivery workflow and analytics for your ice cream business in one modern dashboard.",
    locale: "en_IN",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Ice Inventory software dashboard preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Ice Inventory — Inventory, Billing & Delivery Software for Ice Cream Businesses",
    description:
      "Inventory, billing, GST invoices, stock tracking, customer ledger and delivery management software for ice cream businesses.",
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
        name: BRAND_NAME,
        url: BASE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-IN",
        description:
          "Ice Inventory is a web-based inventory, billing, stock tracking and delivery management platform built for ice cream wholesalers, distributors and retail business owners.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          category: "Free Trial",
        },
        featureList: [
          "Inventory management for ice cream products",
          "GST invoice generation",
          "Customer ledger and payment tracking",
          "Order and billing management",
          "Stock tracking and low stock alerts",
          "Delivery partner workflow",
          "Live delivery tracking",
          "Manager role access",
          "Sales analytics dashboard",
          "Bulk import for products and stock",
          "PDF exports for invoices and reports",
          "Business settings with GST and invoice configuration",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: BRAND_NAME,
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/logo.png`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: BRAND_NAME,
        description:
          "Inventory, billing, stock tracking and delivery management software for ice cream businesses.",
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage: "en-IN",
      },
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/#webpage`,
        url: BASE_URL,
        name: `${BRAND_NAME} Homepage`,
        isPartOf: { "@id": `${BASE_URL}/#website` },
        about: { "@id": `${BASE_URL}/#software` },
        description:
          "Homepage of Ice Inventory, a software platform for inventory, billing, delivery and stock management in the ice cream business industry.",
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Ice Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ice Inventory is inventory, billing, stock tracking and delivery management software for ice cream wholesalers, distributors and shop owners. It helps businesses manage products, invoices, customers, stock, orders and delivery operations from one dashboard.",
            },
          },
          {
            "@type": "Question",
            name: "Does Ice Inventory support GST billing?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Ice Inventory supports GST-ready billing and invoice generation for ice cream businesses, including customer billing records and downloadable invoice documents.",
            },
          },
          {
            "@type": "Question",
            name: "Can I manage delivery partners with Ice Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Ice Inventory includes delivery workflow support, delivery partner management and order tracking for businesses that handle dispatch and order delivery operations.",
            },
          },
          {
            "@type": "Question",
            name: "Who should use Ice Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ice Inventory is built for ice cream wholesalers, distributors, retailers and business owners who need software for stock tracking, billing, customer records, GST invoices and delivery operations.",
            },
          },
          {
            "@type": "Question",
            name: "Can I track stock and inventory with Ice Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Ice Inventory helps businesses manage products, stock levels, restocks, low stock alerts and inventory records in one place.",
            },
          },
          {
            "@type": "Question",
            name: "Does Ice Inventory support customer ledger management?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Ice Inventory includes customer ledger and payment tracking features so businesses can manage balances, settlement history and invoice records efficiently.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Hidden semantic SEO / AEO support */}
        <meta
          name="theme-color"
          content="#ffffff"
        />
        <meta
          name="apple-mobile-web-app-title"
          content={BRAND_NAME}
        />
        <meta
          name="application-name"
          content={BRAND_NAME}
        />
        <meta
          name="mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body className="h-full min-h-screen bg-white text-gray-900 antialiased">
        {/* Hidden semantic content for crawlers / AEO */}
        <div className="sr-only" aria-hidden="true">
          <h1>Ice Inventory</h1>
          <p>
            Ice Inventory is inventory, billing, stock tracking and delivery
            management software for ice cream wholesalers, distributors and
            retail business owners.
          </p>
          <p>
            The platform helps businesses manage products, GST billing,
            invoices, stock levels, customer ledger, orders, delivery partners
            and analytics from one dashboard.
          </p>
          <p>
            Ice Inventory is designed for ice cream business operations in
            India and supports inventory workflows, billing workflows and
            delivery management workflows.
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