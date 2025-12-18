// icecream-inventory/src/app/layout.tsx

import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "IceCream Inventory",
  description: "Inventory Management System for Ice Cream Wholesale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2000,
            style: {
              background: "#333",
              color: "#fff",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
