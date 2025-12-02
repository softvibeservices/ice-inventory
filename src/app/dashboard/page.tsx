

// icecream-inventory/src/app/dashboard/page.tsx
"use client";
import Footer from "../components/Footer";
import DashboardNavbar from "../components/DashboardNavbar";

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Dashboard Navbar */}
      <DashboardNavbar />

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center text-gray-600">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-blue-700">Welcome to your Dashboard</h1>
          <p className="text-gray-500">
            Choose an option from above to manage products or stock.
          </p>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
