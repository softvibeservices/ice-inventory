// src/app/dashboard/delivery/live-map/[partnerId]/page.tsx
// FIXED VERSION - Better map providers with higher zoom support

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import DashboardNavbar from "@/app/components/DashboardNavbar";
import Footer from "@/app/components/Footer";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Clock, 
  AlertCircle, 
  Activity, 
  Map as MapIcon,
  Navigation,
  ExternalLink 
} from "lucide-react";

type LatLngType = [number, number];

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

const Polyline: any = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);

const partnerIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  batteryLevel?: number;
}

interface LocationData {
  partnerId: string;
  name: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  updatedAt: string;
  trail?: LocationPoint[];
  trailCount?: number;
}

// ✅ FIXED: Better map providers with higher zoom support
type MapLayer = 'street' | 'satellite' | 'hybrid' | 'dark';

interface MapLayerConfig {
  name: string;
  url: string;
  attribution: string;
  icon: string;
  maxZoom: number;
  subdomains?: string[];
}

const mapLayers: Record<MapLayer, MapLayerConfig> = {
  street: {
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    icon: '🗺️',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
  satellite: {
    name: 'Satellite',
    // ✅ Using Google Satellite (better coverage + higher zoom)
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google',
    icon: '🛰️',
    maxZoom: 22, // Google supports up to zoom 22
    subdomains: ['0', '1', '2', '3'],
  },
  hybrid: {
    name: 'Hybrid',
    // ✅ Google Hybrid (Satellite + Street labels)
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '© Google',
    icon: '🌍',
    maxZoom: 22,
    subdomains: ['0', '1', '2', '3'],
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
    icon: '🌙',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c', 'd'],
  },
};

export default function LiveMapPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params?.partnerId as string;
  const mapRef = useRef<any>(null);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showTrail, setShowTrail] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayer>('hybrid'); // ✅ Default to hybrid (best for delivery)

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      setError("User authentication required. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      if (!userData._id) {
        setError("User ID not found. Please log in again.");
        setLoading(false);
        return;
      }
      setUserId(userData._id);
    } catch (err) {
      console.error("Error parsing user data:", err);
      setError("Invalid user data. Please log in again.");
      setLoading(false);
    }
  }, []);

  async function fetchLocation() {
    if (!partnerId || !userId) {
      if (!userId) {
        setError("User authentication required");
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/delivery/live-location?partnerId=${partnerId}&userId=${userId}&includeTrail=true&trailMinutes=180`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (res.status === 403) {
        setError("Access denied: You do not have permission to view this partner's location.");
        setLoading(false);
        return;
      }

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
    if (userId) {
      fetchLocation();
      const interval = setInterval(fetchLocation, 5000);
      return () => clearInterval(interval);
    }
  }, [partnerId, userId]);

  const openInGoogleMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const trailCoordinates: LatLngType[] = location?.trail && location.trail.length > 0
    ? location.trail.map((point) => [point.latitude, point.longitude] as LatLngType)
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full px-3 sm:px-5 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-6 py-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Top Row */}
              <div className="flex items-center justify-between">
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
                      {new Date(location.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Controls Row */}
              {location && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Map Layer Selector */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                    {(Object.keys(mapLayers) as MapLayer[]).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => setMapLayer(layer)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          mapLayer === layer
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                        title={mapLayers[layer].name}
                      >
                        <span>{mapLayers[layer].icon}</span>
                        <span className="hidden sm:inline">{mapLayers[layer].name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trail Toggle */}
                  {location.trail && location.trail.length > 0 && (
                    <button
                      onClick={() => setShowTrail(!showTrail)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showTrail
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>Trail ({location.trailCount || 0})</span>
                    </button>
                  )}

                  {/* Open in Google Maps Button */}
                  <button
                    onClick={openInGoogleMaps}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-slate-600">Loading live location...</p>
              </div>
            </div>
          )}

          {/* Error */}
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

          {/* Map with Multiple Layers */}
          {!loading && !error && location && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              {/* Layer Info Badge */}
              <div className="absolute top-4 right-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapIcon className="w-4 h-4" />
                  <span>{mapLayers[mapLayer].name}</span>
                  <span className="text-xs text-slate-500">
                    (Zoom up to {mapLayers[mapLayer].maxZoom})
                  </span>
                </div>
              </div>

              <div className="w-full h-[calc(100vh-280px)] min-h-[500px]">
                <MapContainer
                  ref={mapRef}
                  center={[location.latitude, location.longitude] as LatLngType}
                  zoom={18}
                  style={{ width: "100%", height: "100%" }}
                  scrollWheelZoom={true}
                  maxZoom={mapLayers[mapLayer].maxZoom}
                >
                  {/* ✅ Dynamic Tile Layer with proper configuration */}
                  <TileLayer 
                    key={mapLayer}
                    url={mapLayers[mapLayer].url}
                    attribution={mapLayers[mapLayer].attribution}
                    maxZoom={mapLayers[mapLayer].maxZoom}
                    subdomains={mapLayers[mapLayer].subdomains}
                  />

                  {/* Movement Trail */}
                  {showTrail && trailCoordinates.length > 1 && (
                    <>
                      <Polyline
                        positions={trailCoordinates}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 4,
                          opacity: 0.8,
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                      {/* Start marker */}
                      <Marker
                        position={trailCoordinates[0]}
                        icon={L.icon({
                          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
                          iconSize: [25, 41],
                          iconAnchor: [12, 41],
                          popupAnchor: [1, -34],
                        })}
                      >
                        <Popup>
                          <div className="p-1">
                            <div className="text-sm font-semibold text-green-700">Start Point</div>
                            <div className="text-xs text-slate-600">
                              {new Date(location.trail![0].timestamp).toLocaleString()}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}

                  {/* Current Location Marker */}
                  <Marker
                    position={[location.latitude, location.longitude] as LatLngType}
                    icon={partnerIcon}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="font-bold text-base text-blue-700 mb-3 flex items-center gap-2">
                          <Navigation className="w-4 h-4" />
                          {location.name}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">Location</div>
                              <div className="text-xs text-slate-600">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </div>
                            </div>
                          </div>

                          {location.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span>{location.phone}</span>
                            </div>
                          )}

                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">Last Update</div>
                              <div className="text-xs text-slate-600">
                                {new Date(location.updatedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Google Maps Link in Popup */}
                          <button
                            onClick={openInGoogleMaps}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            <Navigation className="w-3 h-3" />
                            Open in Google Maps
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}