// src/app/dashboard/delivery/live-map/page.tsx
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { MapPin, Phone, User, AlertCircle } from "lucide-react";

interface Partner {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
}

export default function LiveMapHome() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed._id) {
          setUserId(String(parsed._id));
        }
      } catch {
        setError("Failed to load user data");
      }
    }
  }, []);

  // Load partners
  async function loadPartners() {
    if (!userId) return;
    
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
const res = await fetch(`/api/delivery/list?status=approved`, {
  headers: { "Authorization": `Bearer ${token}` },
});
      
      if (!res.ok) {
        throw new Error("Failed to load partners");
      }
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setPartners(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error loading partners:", err);
      setError(err.message || "Failed to load partners");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) {
      loadPartners();
    }
  }, [userId]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Live Partner Tracking
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-600">
            Select any delivery partner to view their live location on the map.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-600">Loading partners...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && partners.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <MapPin className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              No Approved Partners
            </h3>
            <p className="text-sm text-yellow-700">
              You don't have any approved delivery partners yet.
            </p>
          </div>
        )}

        {/* Partners Grid */}
        {!loading && !error && partners.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <div
                key={partner._id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                onClick={() => {
                  // Open map in modal instead of new page
                  window.location.href = `/dashboard/delivery/live-map/${partner._id}`;
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                        {partner.name}
                      </h3>
                      <span className="text-xs text-green-600 font-medium">
                        ● Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{partner.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>View Live Location</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button className="w-full py-2 px-4 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    Track Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}