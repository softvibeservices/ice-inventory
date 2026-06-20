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