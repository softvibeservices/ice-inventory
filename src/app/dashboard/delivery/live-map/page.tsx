"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";

export default function LiveMapHome() {
  const [partners, setPartners] = useState<any[]>([]);

  async function loadPartners() {
    const res = await fetch("/api/delivery/list");
    const data = await res.json();
    setPartners(data);
  }

  useEffect(() => {
    loadPartners();
  }, []);

  return (
    <>
      {/* NAVBAR */}
      <DashboardNavbar />

      {/* PAGE CONTENT */}
      <main className="min-h-screen bg-gray-50 px-6 py-6">

        <h1 className="text-2xl font-bold mb-6 text-blue-700">
          📍 Live Partner Tracking
        </h1>

        <p className="text-gray-600 mb-6">
          Select any delivery partner to view their live location on map.
        </p>

        {partners.length === 0 && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md text-center">
            No approved partners found
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <Link
              key={p._id}
              href={`/dashboard/delivery/live-map/${p._id}`}
              className="
                block p-4 rounded-lg shadow-sm border 
                hover:shadow-md hover:bg-blue-50 
                bg-white transition cursor-pointer
              "
            >
              <div className="font-semibold text-lg text-blue-700">
                {p.name}
              </div>

              <div className="text-gray-600 text-sm mt-1">{p.phone}</div>
            </Link>
          ))}
        </div>
      </main>

    </>
  );
}
