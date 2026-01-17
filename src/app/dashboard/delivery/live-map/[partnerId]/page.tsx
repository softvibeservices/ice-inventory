// src/app/dashboard/delivery/live-map/[partnerId]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { ArrowLeft, MapPin, Phone, Clock, AlertCircle } from "lucide-react";

// Fix leaflet type conflicts
type LatLngType = [number, number];

// Dynamic imports for Leaflet components
const MapContainer: any = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayer: any = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

const Marker: any = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);

const Popup: any = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// Leaflet partner icon
const partnerIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface LocationData {
  partnerId: string;
  name: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export default function LiveMapPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params?.partnerId as string;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchLocation() {
    if (!partnerId) return;

    try {
      const res = await fetch(
        `/api/delivery/live-location?partnerId=${partnerId}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setLocation(data);
      setError("");
      setLoading(false);
    } catch (err) {
      console.error("Error fetching location:", err);
      setError("Unable to load location");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
    // Update location every 3 seconds
    const interval = setInterval(fetchLocation, 3000);
    return () => clearInterval(interval);
  }, [partnerId]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full px-3 sm:px-5 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-6 py-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard/delivery/live-map")}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-blue-700 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Live Tracking {location?.name ? `— ${location.name}` : ""}
                  </h2>
                  {location?.phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4" />
                      {location.phone}
                    </p>
                  )}
                </div>
              </div>

              {location?.updatedAt && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span>
                    Updated: {new Date(location.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-slate-600">Loading live location...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Unable to Load Location
                </h3>
                <p className="text-sm text-red-700 mb-6">{error}</p>
                <button
                  onClick={() => router.push("/dashboard/delivery/live-map")}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Back to Partners
                </button>
              </div>
            </div>
          )}

          {/* Map */}
          {!loading && !error && location && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-full h-[calc(100vh-280px)] min-h-[400px]">
                <MapContainer
                  center={[location.latitude, location.longitude] as LatLngType}
                  zoom={15}
                  style={{ width: "100%", height: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  <Marker
                    position={[location.latitude, location.longitude] as LatLngType}
                    icon={partnerIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <div className="font-semibold text-base text-blue-700 mb-2">
                          {location.name}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span>Lat: {location.latitude.toFixed(6)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span>Lng: {location.longitude.toFixed(6)}</span>
                          </div>

                          {location.phone && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Phone className="w-4 h-4 text-slate-500" />
                              <span>{location.phone}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(location.updatedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Map Info Footer */}
              <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live tracking active</span>
                  </div>
                  <div className="text-slate-500">
                    Location updates every 3 seconds
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}