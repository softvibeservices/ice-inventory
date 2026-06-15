// src/app/dashboard/stocks/layout.tsx
// Shared shell for all three Stocks routes: /stocks  /stocks/restock  /stocks/history
//
// WHY A LAYOUT?
// Each tab is a separate Next.js route. Without a layout, every tab click
// causes the full page (DashboardNavbar + tab strip + Footer) to unmount and
// remount — producing a hard visual jerk.
// With a layout, React keeps this shell mounted; only {children} swaps, giving
// a smooth, flicker-free transition.
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import StocksTabStrip from "./StocksTabStrip";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
      <DashboardNavbar />

      <main className="flex-grow page-wrapper">
        {/* Tab strip stays mounted across all three sub-routes */}
        <StocksTabStrip />

        {/* Page content fades in smoothly on every route change */}
        <div className="stocks-content-area">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
