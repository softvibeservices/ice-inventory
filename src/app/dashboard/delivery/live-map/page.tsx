// src/app/dashboard/delivery/live-map/page.tsx
// PHASE 8: Check hasLiveTracking feature flag.
// If false (Launch plan / free_trial), replace the entire page content with an
// upgrade prompt instead of showing the partner list. All original logic is
// preserved — we only add the gate at the top of the render tree.
"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { MapPin, Phone, User, AlertCircle, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";

interface Partner {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FeatureGateScreen
//  Shown when the user's plan does not include live tracking.
// ─────────────────────────────────────────────────────────────────────────────
function FeatureGateScreen() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-6 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-blue-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Live Tracking Not Available
          </h1>

          <p className="text-slate-600 text-sm leading-6 mb-6">
            Real-time delivery partner tracking is available on the{" "}
            <strong>Scale</strong> and <strong>Business</strong> plans.
            Upgrade your subscription to track your delivery team on a live map.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Live Tracking includes:
            </p>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-500 shrink-0" />
                Real-time GPS tracking of all delivery partners
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-500 shrink-0" />
                Animated live map with partner locations
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-500 shrink-0" />
                Order delivery status updates in real time
              </li>
            </ul>
          </div>

          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            View Plans
            <ArrowRight size={15} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LiveMapHome — original component (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function LiveMapContent() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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
    } catch (err: unknown) {
      console.error("Error loading partners:", err);
      setError(err instanceof Error ? err.message : "Failed to load partners");
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
              You don&apos;t have any approved delivery partners yet.
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

// ─────────────────────────────────────────────────────────────────────────────
//  Default export — gates access on hasLiveTracking feature flag
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveMapHome() {
  const { subscription, loading } = useSubscription();

  // While subscription is loading, show a neutral loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <DashboardNavbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // ── PHASE 8: Feature gate ─────────────────────────────────────────────────
  //  hasLiveTracking is true only on Scale and Business plans.
  //  Launch and free_trial get the upgrade prompt instead.
  const hasLiveTracking = subscription?.effectiveLimits.hasLiveTracking ?? false;
  if (!hasLiveTracking) {
    return <FeatureGateScreen />;
  }
  // ─────────────────────────────────────────────────────────────────────────

  return <LiveMapContent />;
}