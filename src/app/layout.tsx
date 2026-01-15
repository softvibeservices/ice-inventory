// icecream-inventory/src/app/layout.tsx


// icecream-inventory/src/app/layout.tsx

import "./globals.css";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IceCream Inventory",
  description: "Inventory Management System for Ice Cream Wholesale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full scroll-smooth"
      suppressHydrationWarning
    >
      <body
        className="
          h-full
          min-h-screen
          bg-[#050b18]
          text-white
          antialiased
          overflow-x-hidden
        "
      >
        {/* 🔔 Toasts (isolated, no layout shift) */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: "#0f172a", // slate-900
              color: "#e5e7eb",      // slate-200
              borderRadius: "10px",
              fontSize: "14px",
            },
          }}
        />

        {/* 🌐 App Root */}
        <div
          id="app-root"
          className="
            min-h-screen
            flex
            flex-col
            relative
            overflow-x-hidden
          "
        >
          {children}
        </div>
      </body>
    </html>
  );
}
