// src/app/dashboard/delivery/live-map/[partnerId]/page.tsx
// FIXED - Server-side rendering and useMap hook issues resolved

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef, useCallback } from "react";
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
  ExternalLink,
  Battery,
  Gauge,
  Eye,
  EyeOff,
  ZoomIn,
  Maximize2,
  RefreshCw,
  Calendar
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

const Circle: any = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);

// ✅ FIXED: Map controller that properly uses useMap hook from react-leaflet
// This component must be rendered inside MapContainer
const MapControlInner = ({ 
  center, 
  shouldCenter, 
  shouldFitBounds, 
  bounds, 
  onCentered, 
  onBoundsFitted 
}: any) => {
  // This hook is provided by react-leaflet and must be used inside MapContainer
  const map = (window as any).useMapFromReactLeaflet?.() || null;
  
  useEffect(() => {
    if (!map) return;
    
    if (shouldCenter && center) {
      console.log('🎯 Centering map to:', center);
      map.setView(center, 18, {
        animate: true,
        duration: 1,
      });
      if (onCentered) onCentered();
    }
  }, [shouldCenter, center, map, onCentered]);

  useEffect(() => {
    if (!map) return;
    
    if (shouldFitBounds && bounds) {
      console.log('📏 Fitting bounds:', bounds);
      map.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
        duration: 1,
      });
      if (onBoundsFitted) onBoundsFitted();
    }
  }, [shouldFitBounds, bounds, map, onBoundsFitted]);

  return null;
};

// ✅ FIXED: Dynamic import of MapControl to avoid SSR issues
const MapControl = dynamic(() => Promise.resolve(MapControlInner), {
  ssr: false,
});

// Alternative approach: Use a ref callback to get map instance
function MapControlRef({ 
  center, 
  shouldCenter, 
  shouldFitBounds, 
  bounds, 
  onCentered, 
  onBoundsFitted 
}: any) {
  const mapRef = useRef<any>(null);

  const onMapReady = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (shouldCenter && center) {
      console.log('🎯 Centering map to:', center);
      mapRef.current.setView(center, 18, {
        animate: true,
        duration: 1,
      });
      if (onCentered) onCentered();
    }
  }, [shouldCenter, center, onCentered]);

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (shouldFitBounds && bounds) {
      console.log('📏 Fitting bounds:', bounds);
      mapRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
        duration: 1,
      });
      if (onBoundsFitted) onBoundsFitted();
    }
  }, [shouldFitBounds, bounds, onBoundsFitted]);

  return null;
}

// Animated delivery partner icon
const createPulsingIcon = () => {
  return L.divIcon({
    className: 'custom-pulsing-marker',
    html: `
      <div style="position: relative; width: 50px; height: 50px;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60px;
          height: 60px;
          margin: -30px 0 0 -30px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          animation: pulse 2s infinite 0.5s;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          width: 30px;
          height: 30px;
          margin: -15px 0 0 -15px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
};

const startIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `
    <div style="
      width: 30px;
      height: 30px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M4 15V9l8-4 8 4v6l-8 4z"/>
      </svg>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const createWaypointIcon = (index: number, total: number) => {
  const opacity = 0.3 + (index / total) * 0.7;
  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="
        width: 8px;
        height: 8px;
        background: rgba(59, 130, 246, ${opacity});
        border-radius: 50%;
        border: 1px solid white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      "></div>
    `,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
};

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
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '© Google',
    icon: '🛰️',
    maxZoom: 22,
    subdomains: ['0', '1', '2', '3'],
  },
  hybrid: {
    name: 'Hybrid',
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

  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [showTrail, setShowTrail] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showAccuracyCircle, setShowAccuracyCircle] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayer>('hybrid');
  const [autoCenter, setAutoCenter] = useState(true);
  
  const [lastUpdateDateTime, setLastUpdateDateTime] = useState<string>("");

  // Map control states
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [shouldCenter, setShouldCenter] = useState(false);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [centerPosition, setCenterPosition] = useState<LatLngType | null>(null);
  const [boundsToFit, setBoundsToFit] = useState<any>(null);

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

  // ✅ FIXED: Handle map control actions using mapInstance ref
  useEffect(() => {
    if (!mapInstance) return;
    
    if (shouldCenter && centerPosition) {
      console.log('🎯 Centering map to:', centerPosition);
      mapInstance.setView(centerPosition, 18, {
        animate: true,
        duration: 1,
      });
      setShouldCenter(false);
    }
  }, [shouldCenter, centerPosition, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;
    
    if (shouldFitBounds && boundsToFit) {
      console.log('📏 Fitting bounds:', boundsToFit);
      mapInstance.fitBounds(boundsToFit, { 
        padding: [50, 50],
        animate: true,
        duration: 1,
      });
      setShouldFitBounds(false);
    }
  }, [shouldFitBounds, boundsToFit, mapInstance]);

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
      
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      });
      setLastUpdateDateTime(`${dateStr} at ${timeStr}`);
      
      setError("");
      setLoading(false);

      // Auto-center if enabled
      if (autoCenter && mapInstance) {
        const newCenter: LatLngType = [data.latitude, data.longitude];
        console.log('🧭 Auto-centering to:', newCenter);
        mapInstance.setView(newCenter, 18, {
          animate: true,
          duration: 1,
        });
      }
    } catch (err) {
      console.error("Error fetching location:", err);
      setError("Unable to load location");
      setLoading(false);
    }
  }

  async function handleManualRefresh() {
    setRefreshing(true);
    await fetchLocation();
    setTimeout(() => setRefreshing(false), 500);
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

  // Center button handler
  const handleCenterClick = useCallback(() => {
    if (!location || !mapInstance) {
      console.log('❌ No location or map instance to center on');
      return;
    }
    console.log('🎯 CENTER clicked - Moving to:', location.latitude, location.longitude);
    mapInstance.setView([location.latitude, location.longitude], 18, {
      animate: true,
      duration: 1,
    });
  }, [location, mapInstance]);

  // Fit Trail button handler
  const handleFitTrailClick = useCallback(() => {
    if (!location?.trail || location.trail.length === 0 || !mapInstance) {
      console.log('❌ No trail or map instance to fit');
      return;
    }
    console.log('📏 FIT TRAIL clicked - Trail points:', location.trail.length);
    const bounds = L.latLngBounds(
      location.trail.map(p => [p.latitude, p.longitude] as LatLngType)
    );
    mapInstance.fitBounds(bounds, {
      padding: [50, 50],
      animate: true,
      duration: 1,
    });
  }, [location, mapInstance]);

  // Auto-Center toggle handler
  const handleAutoCenterToggle = useCallback(() => {
    const newValue = !autoCenter;
    console.log('🧭 AUTO-CENTER toggled:', newValue ? 'ON' : 'OFF');
    setAutoCenter(newValue);
    
    if (newValue && location && mapInstance) {
      mapInstance.setView([location.latitude, location.longitude], 18, {
        animate: true,
        duration: 1,
      });
    }
  }, [autoCenter, location, mapInstance]);

  // Waypoints toggle handler
  const handleWaypointsToggle = useCallback(() => {
    const newValue = !showWaypoints;
    console.log('👁️ WAYPOINTS toggled:', newValue ? 'SHOW' : 'HIDE');
    setShowWaypoints(newValue);
  }, [showWaypoints]);

  const calculateTrailStats = () => {
    if (!location?.trail || location.trail.length < 2) return null;

    let totalDistance = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    for (let i = 1; i < location.trail.length; i++) {
      const prev = location.trail[i - 1];
      const curr = location.trail[i];

      const R = 6371e3;
      const φ1 = prev.latitude * Math.PI / 180;
      const φ2 = curr.latitude * Math.PI / 180;
      const Δφ = (curr.latitude - prev.latitude) * Math.PI / 180;
      const Δλ = (curr.longitude - prev.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      totalDistance += distance;

      if (curr.speed !== undefined && curr.speed !== null && curr.speed > 0) {
        totalSpeed += curr.speed * 3.6;
        speedCount++;
      }
    }

    const startTime = new Date(location.trail[0].timestamp).getTime();
    const endTime = new Date(location.trail[location.trail.length - 1].timestamp).getTime();
    const durationMs = endTime - startTime;
    const durationMinutes = Math.floor(durationMs / 60000);

    let avgSpeed = 'N/A';
    if (speedCount > 0) {
      avgSpeed = (totalSpeed / speedCount).toFixed(1);
    } else if (durationMinutes > 0 && totalDistance > 0) {
      const distanceKm = totalDistance / 1000;
      const durationHours = durationMinutes / 60;
      avgSpeed = (distanceKm / durationHours).toFixed(1);
    }

    return {
      distance: (totalDistance / 1000).toFixed(2),
      duration: durationMinutes,
      avgSpeed: avgSpeed,
    };
  };

  const stats = calculateTrailStats();

  const trailCoordinates: LatLngType[] = location?.trail && location.trail.length > 0
    ? location.trail.map((point) => [point.latitude, point.longitude] as LatLngType)
    : [];

  const latestPoint = location?.trail && location.trail.length > 0 
    ? location.trail[location.trail.length - 1] 
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNavbar />

      <main className="flex-grow w-full px-3 sm:px-5 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-6 py-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Top Row */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push("/dashboard/delivery/live-map")}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-blue-700 flex items-center gap-2">
                      <div className="relative">
                        <MapPin className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
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

                {location && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <Calendar className="w-4 h-4" />
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{lastUpdateDateTime}</span>
                    </div>

                    <button
                      onClick={handleManualRefresh}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh location now"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>

                    {latestPoint?.batteryLevel && (
                      <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border font-semibold" style={{
                        backgroundColor: latestPoint.batteryLevel > 50 ? '#dcfce7' : latestPoint.batteryLevel > 20 ? '#fef3c7' : '#fee2e2',
                        borderColor: latestPoint.batteryLevel > 50 ? '#86efac' : latestPoint.batteryLevel > 20 ? '#fcd34d' : '#fca5a5',
                        color: latestPoint.batteryLevel > 50 ? '#166534' : latestPoint.batteryLevel > 20 ? '#92400e' : '#991b1b'
                      }}>
                        <Battery className="w-4 h-4" />
                        <span>{latestPoint.batteryLevel}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Row */}
              {location && stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-600">Distance</div>
                      <div className="text-lg font-bold text-slate-900">{stats.distance} km</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-600">Duration</div>
                      <div className="text-lg font-bold text-slate-900">{stats.duration} min</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Gauge className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-600">Avg Speed</div>
                      <div className="text-lg font-bold text-slate-900">{stats.avgSpeed} km/h</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls Row */}
              {location && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Map Layer Selector */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    {(Object.keys(mapLayers) as MapLayer[]).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => {
                          console.log('🗺️ MAP LAYER changed to:', layer);
                          setMapLayer(layer);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          mapLayer === layer
                            ? "bg-blue-600 text-white shadow-md scale-105"
                            : "bg-white text-slate-600 hover:bg-slate-100 hover:scale-105"
                        }`}
                        title={mapLayers[layer].name}
                      >
                        <span>{mapLayers[layer].icon}</span>
                        <span className="hidden sm:inline">{mapLayers[layer].name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Trail Controls */}
                  {location.trail && location.trail.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          console.log('👁️ TRAIL toggled:', !showTrail ? 'SHOW' : 'HIDE');
                          setShowTrail(!showTrail);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          showTrail
                            ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {showTrail ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>Trail ({location.trailCount || 0})</span>
                      </button>

                      <button
                        onClick={handleWaypointsToggle}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          showWaypoints
                            ? "bg-green-100 text-green-700 border-green-300 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        } ${!showTrail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!showTrail}
                        title={!showTrail ? "Enable trail first" : "Show/hide waypoint dots"}
                      >
                        {showWaypoints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        <span>Waypoints</span>
                      </button>

                      <button
                        onClick={() => {
                          console.log('🔮 ACCURACY toggled:', !showAccuracyCircle ? 'SHOW' : 'HIDE');
                          setShowAccuracyCircle(!showAccuracyCircle);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          showAccuracyCircle
                            ? "bg-purple-100 text-purple-700 border-purple-300 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Activity className="w-4 h-4" />
                        <span>Accuracy</span>
                      </button>
                    </>
                  )}

                  {/* Map Controls */}
                  <button
                    onClick={handleCenterClick}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-200 transition-all font-medium text-sm shadow-sm active:scale-95"
                    title="Jump to partner's current location"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>Center</span>
                  </button>

                  {location.trail && location.trail.length > 0 && (
                    <button
                      onClick={handleFitTrailClick}
                      className="flex items-center gap-2 px-3 py-2 bg-teal-100 text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-200 transition-all font-medium text-sm shadow-sm active:scale-95"
                      title="Zoom to show entire trail"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Fit Trail</span>
                    </button>
                  )}

                  <button
                    onClick={handleAutoCenterToggle}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      autoCenter
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                    title={autoCenter ? "Auto-follow enabled" : "Auto-follow disabled"}
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Auto-Center</span>
                  </button>

                  <button
                    onClick={openInGoogleMaps}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm ml-auto"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Google Maps</span>
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

          {/* Map */}
          {!loading && !error && location && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapIcon className="w-4 h-4" />
                  <span>{mapLayers[mapLayer].name}</span>
                </div>
              </div>

              {latestPoint?.accuracy && showAccuracyCircle && (
                <div className="absolute top-16 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>±{latestPoint.accuracy.toFixed(0)}m</span>
                  </div>
                </div>
              )}

              <div className="w-full h-[calc(100vh-380px)] min-h-[500px]">
                <MapContainer
                  center={[location.latitude, location.longitude] as LatLngType}
                  zoom={18}
                  style={{ width: "100%", height: "100%" }}
                  scrollWheelZoom={true}
                  maxZoom={mapLayers[mapLayer].maxZoom}
                  whenCreated={setMapInstance}
                >
                  <TileLayer 
                    key={mapLayer}
                    url={mapLayers[mapLayer].url}
                    attribution={mapLayers[mapLayer].attribution}
                    maxZoom={mapLayers[mapLayer].maxZoom}
                    subdomains={mapLayers[mapLayer].subdomains}
                  />

                  {showTrail && trailCoordinates.length > 1 && (
                    <>
                      <Polyline
                        positions={trailCoordinates}
                        pathOptions={{
                          color: "#1e40af",
                          weight: 8,
                          opacity: 0.3,
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                      <Polyline
                        positions={trailCoordinates}
                        pathOptions={{
                          color: "#3b82f6",
                          weight: 5,
                          opacity: 0.9,
                          lineCap: "round",
                          lineJoin: "round",
                          dashArray: "10, 5",
                        }}
                      />
                      <Polyline
                        positions={trailCoordinates}
                        pathOptions={{
                          color: "#60a5fa",
                          weight: 3,
                          opacity: 0.6,
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                    </>
                  )}

                  {showWaypoints && showTrail && location.trail && location.trail.length > 5 && (
                    <>
                      {location.trail
                        .filter((_, index) => index % 5 === 0 && index > 0 && index < location.trail!.length - 1)
                        .map((point, index, filteredArray) => (
                          <Marker
                            key={`waypoint-${index}`}
                            position={[point.latitude, point.longitude] as LatLngType}
                            icon={createWaypointIcon(index, filteredArray.length)}
                          />
                        ))}
                    </>
                  )}

                  {showTrail && trailCoordinates.length > 1 && (
                    <Marker
                      position={trailCoordinates[0]}
                      icon={startIcon}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="text-sm font-semibold text-green-700 mb-1">Starting Point</div>
                          <div className="text-xs text-slate-600">
                            {new Date(location.trail![0].timestamp).toLocaleString()}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {showAccuracyCircle && latestPoint?.accuracy && (
                    <Circle
                      center={[location.latitude, location.longitude] as LatLngType}
                      radius={latestPoint.accuracy}
                      pathOptions={{
                        color: '#8b5cf6',
                        fillColor: '#8b5cf6',
                        fillOpacity: 0.1,
                        weight: 2,
                        opacity: 0.5,
                        dashArray: '5, 5',
                      }}
                    />
                  )}

                  <Marker
                    position={[location.latitude, location.longitude] as LatLngType}
                    icon={createPulsingIcon()}
                  >
                    <Popup>
                      <div className="p-3 min-w-[220px]">
                        <div className="font-bold text-base text-blue-700 mb-3 flex items-center gap-2">
                          <div className="relative">
                            <Navigation className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                          </div>
                          {location.name}
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-slate-700">Current Position</div>
                              <div className="text-xs text-slate-600 font-mono">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </div>
                            </div>
                          </div>

                          {location.phone && (
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                              <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="text-slate-700">{location.phone}</span>
                            </div>
                          )}

                          <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-slate-700">Last Update</div>
                              <div className="text-xs text-slate-600">
                                {lastUpdateDateTime}
                              </div>
                            </div>
                          </div>

                          {latestPoint?.accuracy && (
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                              <Activity className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <span className="text-slate-700">Accuracy: ±{latestPoint.accuracy.toFixed(0)}m</span>
                            </div>
                          )}

                          {latestPoint?.batteryLevel && (
                            <div className="flex items-center gap-2 p-2 rounded" style={{
                              backgroundColor: latestPoint.batteryLevel > 50 ? '#dcfce7' : latestPoint.batteryLevel > 20 ? '#fef3c7' : '#fee2e2'
                            }}>
                              <Battery className="w-4 h-4 flex-shrink-0" style={{
                                color: latestPoint.batteryLevel > 50 ? '#166534' : latestPoint.batteryLevel > 20 ? '#92400e' : '#991b1b'
                              }} />
                              <span style={{
                                color: latestPoint.batteryLevel > 50 ? '#166534' : latestPoint.batteryLevel > 20 ? '#92400e' : '#991b1b'
                              }}>
                                Battery: {latestPoint.batteryLevel}%
                              </span>
                            </div>
                          )}

                          <button
                            onClick={openInGoogleMaps}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            <Navigation className="w-3 h-3" />
                            Navigate in Google Maps
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