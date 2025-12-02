// icecream-inventory\src\app\layout.tsx



import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
