// src/app/dashboard/CustomerOverview.tsx
"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp, TrendingDown, DollarSign, ShoppingBag } from "lucide-react";

interface CustomerStats {
  totalCustomers: number;
  regularCustomers: number; // 10+ orders
  frequentBuyers: number; // 5-9 orders
  occasionalBuyers: number; // 2-4 orders
  oneTimeBuyers: number; // 1 order
  topSpenders: Array<{
    name: string;
    contact: string;
    totalSpent: number;
    orderCount: number;
  }>;
  recentCustomers: Array<{
    name: string;
    contact: string;
    createdAt: string;
  }>;
}

export default function CustomerOverview() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomerStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        processCustomerData(data);
      }
    } catch (error) {
      console.error("Error fetching customer stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const processCustomerData = (customers: any[]) => {
    const regularCustomers = customers.filter((c) => c.orderCount >= 10);
    const frequentBuyers = customers.filter((c) => c.orderCount >= 5 && c.orderCount < 10);
    const occasionalBuyers = customers.filter((c) => c.orderCount >= 2 && c.orderCount < 5);
    const oneTimeBuyers = customers.filter((c) => c.orderCount === 1);

    const topSpenders = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        contact: c.contact,
        totalSpent: c.totalSpent || 0,
        orderCount: c.orderCount || 0,
      }));

    const recentCustomers = customers
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((c) => ({
        name: c.name,
        contact: c.contact,
        createdAt: c.createdAt,
      }));

    setStats({
      totalCustomers: customers.length,
      regularCustomers: regularCustomers.length,
      frequentBuyers: frequentBuyers.length,
      occasionalBuyers: occasionalBuyers.length,
      oneTimeBuyers: oneTimeBuyers.length,
      topSpenders,
      recentCustomers,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
        <p className="text-center text-gray-500">Failed to load customer data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Overview</h2>
          <p className="text-sm text-gray-500">Customer segmentation and insights</p>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Regular</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.regularCustomers}</div>
          <div className="text-xs text-green-600 mt-1">10+ orders</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Frequent</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{stats.frequentBuyers}</div>
          <div className="text-xs text-blue-600 mt-1">5-9 orders</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Occasional</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.occasionalBuyers}</div>
          <div className="text-xs text-yellow-600 mt-1">2-4 orders</div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">One-time</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.oneTimeBuyers}</div>
          <div className="text-xs text-gray-600 mt-1">1 order</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Spenders */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Top Spenders
          </h3>
          <div className="space-y-2">
            {stats.topSpenders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No data available</p>
            ) : (
              stats.topSpenders.map((customer, index) => (
                <div
                  key={customer.contact}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white"
                          : index === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"
                          : index === 2
                          ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Recent Customers
          </h3>
          <div className="space-y-2">
            {stats.recentCustomers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent customers</p>
            ) : (
              stats.recentCustomers.map((customer) => (
                <div
                  key={customer.contact}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.contact}</p>
                  </div>
                  <div className="ml-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                      {formatDate(customer.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Customers</span>
          <span className="text-lg font-bold text-blue-600">{stats.totalCustomers}</span>
        </div>
      </div>
    </div>
  );
}