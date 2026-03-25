// src/app/dashboard/DeliveryPartnerOverview.tsx
"use client";

import { useState, useEffect } from "react";
import { Truck, CheckCircle, Clock, XCircle, MapPin, Package } from "lucide-react";

interface DeliveryPartner {
  _id: string;
  name: string;
  contact: string;
  email: string;
  status: "pending" | "approved" | "rejected" | "blocked";
  totalDeliveries?: number;
  completedDeliveries?: number;
  pendingDeliveries?: number;
  rejectedDeliveries?: number;
  createdAt: string;
}

interface DeliveryStats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
  totalDeliveries: number;
  completedDeliveries: number;
  pendingOrders: number;
  topPerformers: DeliveryPartner[];
}

export default function DeliveryPartnerOverview() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryPartnerStats();
  }, []);

  const fetchDeliveryPartnerStats = async () => {
    setLoading(true);
    try {
      // Fetch delivery partners
      const partnersResponse = await fetch("/api/delivery/list");
      
      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json();
        const partners: DeliveryPartner[] = partnersData.deliveryPartners || [];

        // Fetch delivery orders to calculate stats
        const ordersResponse = await fetch("/api/delivery/orders");
        let deliveryOrders: any[] = [];
        
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          deliveryOrders = ordersData.orders || [];
        }

        // Calculate stats for each partner
        const partnersWithStats = partners.map((partner) => {
          const partnerOrders = deliveryOrders.filter(
            (order) => order.deliveryPartnerId === partner._id
          );
          
          return {
            ...partner,
            totalDeliveries: partnerOrders.length,
            completedDeliveries: partnerOrders.filter((o) => o.status === "delivered").length,
            pendingDeliveries: partnerOrders.filter((o) => o.status === "pending" || o.status === "approved").length,
            rejectedDeliveries: partnerOrders.filter((o) => o.status === "rejected").length,
          };
        });

        // Get top performers (most completed deliveries)
        const topPerformers = partnersWithStats
          .filter((p) => p.status === "approved")
          .sort((a, b) => (b.completedDeliveries || 0) - (a.completedDeliveries || 0))
          .slice(0, 5);

        const totalDeliveries = partnersWithStats.reduce(
          (sum, p) => sum + (p.totalDeliveries || 0),
          0
        );
        const completedDeliveries = partnersWithStats.reduce(
          (sum, p) => sum + (p.completedDeliveries || 0),
          0
        );
        const pendingOrders = partnersWithStats.reduce(
          (sum, p) => sum + (p.pendingDeliveries || 0),
          0
        );

        setStats({
          total: partners.length,
          active: partners.filter((p) => p.status === "approved").length,
          pending: partners.filter((p) => p.status === "pending").length,
          blocked: partners.filter((p) => p.status === "blocked").length,
          totalDeliveries,
          completedDeliveries,
          pendingOrders,
          topPerformers,
        });
      }
    } catch (error) {
      console.error("Error fetching delivery partner stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "blocked":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-center text-gray-500">Failed to load delivery partner data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Truck className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Delivery Partner Overview</h2>
          <p className="text-sm text-gray-500">Performance and status tracking</p>
        </div>
      </div>

      {/* Partner Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Total Partners</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Active</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.active}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Pending</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-700">Blocked</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.blocked}</div>
        </div>
      </div>

      {/* Delivery Statistics */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Total Deliveries</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{stats.totalDeliveries}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-700">Completed</span>
          </div>
          <div className="text-xl font-bold text-green-600">{stats.completedDeliveries}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-gray-700">In Progress</span>
          </div>
          <div className="text-xl font-bold text-orange-600">{stats.pendingOrders}</div>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-600" />
          Top Performers
        </h3>
        <div className="space-y-2">
          {stats.topPerformers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No active delivery partners yet</p>
            </div>
          ) : (
            stats.topPerformers.map((partner, index) => (
              <div
                key={partner._id}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {/* Rank and Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm ${
                      index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-md"
                        : index === 1
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md"
                        : index === 2
                        ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{partner.name}</p>
                    <p className="text-xs text-gray-500">{partner.contact}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {partner.completedDeliveries || 0}
                    </div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-orange-600">
                      {partner.pendingDeliveries || 0}
                    </div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(
                      partner.status
                    )}`}
                  >
                    {partner.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Success Rate */}
      {stats.totalDeliveries > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Overall Success Rate</span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600"
                  style={{
                    width: `${(stats.completedDeliveries / stats.totalDeliveries) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm font-semibold text-green-600">
                {((stats.completedDeliveries / stats.totalDeliveries) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}