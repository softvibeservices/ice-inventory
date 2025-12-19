"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import DashboardNavbar from "@/app/components/DashboardNavbar";

// fix leaflet type conflicts
type LatLngType = [number, number];

// dynamic imports
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

// leaflet icon
const partnerIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

export default async function LiveMapPage(props: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = await props.params;

  const [location, setLocation] = useState<any>(null);
  const [error, setError] = useState("");

  async function fetchLocation() {
    try {
      const res = await fetch(
        `/api/delivery/live-location?partnerId=${partnerId}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setLocation(data);
    } catch {
      setError("Unable to load location");
    }
  }

  useEffect(() => {
    fetchLocation();
    const interval = setInterval(fetchLocation, 3000);
    return () => clearInterval(interval);
  }, []);

  const content = (() => {
    if (!location && !error) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center text-gray-500">
          Loading live location...
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-red-600">
          <div className="text-lg mb-4 font-medium">⚠ {error}</div>
          <Link
            href="/dashboard/delivery/live-map"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to partners
          </Link>
        </div>
      );
    }

    const centerPosition: LatLngType = [
      location.latitude,
      location.longitude,
    ];

    return (
      <div className="mt-4 mx-6 rounded-xl overflow-hidden shadow-lg border border-gray-300">
        <div className="w-full h-[80vh] rounded-xl overflow-hidden">
          <MapContainer
            center={centerPosition}
            zoom={15}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <Marker position={centerPosition} icon={partnerIcon}>
              <Popup>
                <div className="font-semibold text-lg text-blue-700">
                  {location.name}
                </div>

                <div>📍 Lat: {location.latitude.toFixed(5)}</div>
                <div>📍 Lng: {location.longitude.toFixed(5)}</div>

                <div className="text-sm mt-2">📱 {location.phone}</div>

                <div className="mt-2 text-xs text-gray-500">
                  Updated {new Date(location.updatedAt).toLocaleTimeString()}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    );
  })();

  return (
    <>
      <DashboardNavbar />

      <main className="min-h-screen bg-gray-50 px-6 py-4">
        <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center rounded-lg">
          <div>
            <h2 className="text-xl font-bold text-blue-700">
              Live Tracking — {location?.name || ""}
            </h2>
            <p className="text-gray-600 text-sm">{location?.phone || ""}</p>
          </div>

          <Link
            href="/dashboard/delivery/live-map"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
          >
            ← Back
          </Link>
        </div>

        {content}
      </main>
    </>
  );
}
