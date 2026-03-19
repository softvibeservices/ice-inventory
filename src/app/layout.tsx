// src/app/layout.tsx

import "./globals.css";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";

const BASE_URL = "https://ice-inventory.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "IceCream Inventory — Ice Cream Wholesale Management Software",
    template: "%s | IceCream Inventory",
  },
  description:
    "IceCream Inventory is a complete inventory, billing, delivery and analytics platform for ice cream wholesalers. Manage products, customers, orders, GST invoices, stock levels, delivery partners and live GPS tracking from one dashboard.",
  keywords: [
    "ice cream inventory management",
    "ice cream wholesale software",
    "ice cream billing software",
    "ice cream stock management",
    "wholesale inventory system",
    "GST billing software ice cream",
    "ice cream delivery tracking",
    "ice cream business software",
    "ice cream order management",
    "ice cream ERP",
    "frozen food inventory software",
    "ice cream wholesaler app",
  ],
  authors: [{ name: "IceCream Inventory", url: BASE_URL }],
  creator: "IceCream Inventory",
  publisher: "IceCream Inventory",
  category: "Business Software",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
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
    siteName: "IceCream Inventory",
    title: "IceCream Inventory — Ice Cream Wholesale Management Software",
    description:
      "Complete inventory, billing, delivery and analytics platform for ice cream wholesalers. GST invoices, live GPS tracking, stock alerts, customer ledger and sales insights — in one system.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IceCream Inventory Management System",
      },
    ],
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    title: "IceCream Inventory — Ice Cream Wholesale Management Software",
    description:
      "Inventory, billing, delivery and analytics platform for ice cream wholesalers. GST billing, live GPS tracking, stock alerts and more.",
    images: ["/og-image.png"],
  },

  applicationName: "IceCream Inventory",
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
        name: "IceCream Inventory",
        url: BASE_URL,
        description:
          "IceCream Inventory is a complete web-based management platform for ice cream wholesalers. It covers product management, customer records, order processing, GST billing, stock tracking, delivery partner management and live GPS tracking.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en",
        featureList: [
          "Product Management with dynamic categories and units",
          "Customer Management with credit and debit ledger",
          "Order Lifecycle Management with settlement history",
          "GST Bill Generation with PDF export",
          "Stock Management with low-stock alerts",
          "Restock History Tracking with bulk CSV and Excel import",
          "Sales Analytics and Insights Dashboard",
          "Customer Ledger with transaction history",
          "Delivery Partner Management with OTP authentication",
          "Live GPS Delivery Tracking via Leaflet maps",
          "Manager Role and Permissions",
          "Sticky Notes for quick order dispatch",
          "Bulk Product Import via CSV and Excel",
          "Cloudinary image storage for logo, QR code and signature",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "IceCream Inventory",
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
        name: "IceCream Inventory",
        description:
          "Ice cream wholesale inventory, billing and delivery management software",
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE_URL}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "What is IceCream Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "IceCream Inventory is a complete web-based management platform for ice cream wholesalers and retailers. It covers product management, customer records, order processing, GST billing, stock tracking, delivery partner management and live GPS tracking in a single system.",
            },
          },
          {
            "@type": "Question",
            name: "Does IceCream Inventory support GST billing?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. IceCream Inventory generates GST-compliant PDF invoices with your business logo, QR code, digital signature, seller GSTIN, composition line and full itemised billing details.",
            },
          },
          {
            "@type": "Question",
            name: "Can I track delivery partners in real time?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Delivery partners broadcast their GPS coordinates from a dedicated mobile-friendly interface. Admins view the live location on an interactive Leaflet map, updated in real time.",
            },
          },
          {
            "@type": "Question",
            name: "Is bulk import supported for products and restock?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Products can be imported in bulk from CSV or Excel files. Restock quantities can also be uploaded in bulk with automatic product name matching.",
            },
          },
          {
            "@type": "Question",
            name: "How is authentication handled in IceCream Inventory?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "User registration requires OTP email verification via Gmail SMTP. Delivery partner login is OTP-based with JWT tokens. Password changes require a separate OTP step. There is no third-party authentication dependency.",
            },
          },
          {
            "@type": "Question",
            name: "Can I create manager or staff accounts?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Admins can create manager sub-accounts. Managers share the dashboard with role-scoped access and have their own OTP-secured password management.",
            },
          },
          {
            "@type": "Question",
            name: "What can be exported as PDF?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "GST invoices, customer reports, restock history reports and stock history summaries can all be exported as formatted PDFs directly from the dashboard.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="theme-color" content="#020b1a" />
      </head>
      <body
        className="h-full min-h-screen bg-[#020b1a] text-white antialiased overflow-x-hidden"
      >
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: "#0f172a",
              color: "#e5e7eb",
              borderRadius: "6px",
              fontSize: "13px",
            },
          }}
        />
        <div
          id="app-root"
          className="min-h-screen flex flex-col relative overflow-x-hidden"
        >
          {children}
        </div>
      </body>
    </html>
  );
}