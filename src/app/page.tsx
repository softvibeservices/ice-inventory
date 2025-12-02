// icecream-inventory\src\app\page.tsx




import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-grow bg-gradient-to-r from-blue-100 to-blue-200 flex flex-col items-center justify-center text-center px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-6">
          Welcome to IceCream Inventory System 🍨
        </h1>
        <p className="text-lg md:text-xl text-gray-700 max-w-2xl mb-8">
          Manage your ice cream stock, track expiry dates, get real-time alerts,
          and streamline your wholesale distribution process with ease.
        </p>

        {/* Example Image */}
        <div className="mb-8">
          <Image
            src="/logo.png" // Place your relevant image in public/logo.png
            alt="Ice Cream"
            width={300}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* Facilities / Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-2 text-gray-800" >📦 Inventory Tracking</h3>
            <p className="text-gray-600">
              Monitor stock levels in real-time and avoid shortages.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-2 text-gray-800">⏰ Expiry Alerts</h3>
            <p className="text-gray-600">
              Get notified before your ice cream batches expire.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-2 text-gray-800">📊 Reports</h3>
            <p className="text-gray-600">
              Generate daily, weekly, and monthly stock reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
