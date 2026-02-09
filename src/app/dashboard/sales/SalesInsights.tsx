// src/app/dashboard/sales/SalesInsights.tsx

"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Package, Users, Wallet } from "lucide-react";

type QuantityTotals = Record<string, number>;

type DailyStat = {
  date: string;
  totalSales: number;
  totalOrders: number;
  quantities: QuantityTotals;
  cashReceived: number;
  bankReceived: number;
};

type PaymentBreakdown = {
  cash: number;
  bank: number;
  outstandingDebt: number;
};

type CustomerItem = {
  _id: string;
  name: string;
  shopName: string;
  debit: number;
  credit: number;
  totalSales: number;
};

interface SalesInsightsProps {
  daily: DailyStat[];
  quantities: QuantityTotals;
  paymentBreakdown: PaymentBreakdown;
  customers: CustomerItem[];
  loading?: boolean;
}

const COLORS = {
  primary: "#3b82f6", // blue
  success: "#10b981", // green
  warning: "#f59e0b", // orange
  danger: "#ef4444", // red
  purple: "#8b5cf6",
  teal: "#14b8a6",
  pink: "#ec4899",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.teal,
  COLORS.pink,
  COLORS.danger,
];

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getUnitDisplayName(unit: string): string {
  const displayMap: Record<string, string> = {
    l: "Litre",
    litre: "Litre",
    litres: "Litre",
    gm: "Gram",
    g: "Gram",
    kg: "Kilogram",
    ml: "Millilitre",
    piece: "Piece",
    pieces: "Piece",
    box: "Box",
    boxes: "Box",
  };
  return displayMap[unit.toLowerCase()] || unit.charAt(0).toUpperCase() + unit.slice(1);
}

export default function SalesInsights({
  daily,
  quantities,
  paymentBreakdown,
  customers,
  loading,
}: SalesInsightsProps) {
  // Prepare data for Sales Over Time chart (reversed to show oldest → newest)
  const salesOverTimeData = [...daily]
    .reverse()
    .map((d) => ({
      date: formatDate(d.date),
      sales: d.totalSales,
      orders: d.totalOrders,
    }));

  // Prepare data for Orders Count Trend
  const ordersCountData = [...daily]
    .reverse()
    .map((d) => ({
      date: formatDate(d.date),
      orders: d.totalOrders,
    }));

  // Prepare data for Quantity by Unit (Pie Chart)
  const quantityByUnitData = Object.entries(quantities)
    .filter(([_, value]) => value > 0)
    .map(([unit, value]) => ({
      name: getUnitDisplayName(unit),
      value: Math.round(value),
      unit,
    }))
    .sort((a, b) => b.value - a.value);

  // Prepare data for Payment Split (Pie Chart)
  const paymentSplitData = [
    { name: "Cash", value: paymentBreakdown.cash, color: COLORS.success },
    { name: "Bank/UPI", value: paymentBreakdown.bank, color: COLORS.primary },
    {
      name: "Outstanding Debt",
      value: paymentBreakdown.outstandingDebt,
      color: COLORS.danger,
    },
  ].filter((item) => item.value > 0);

  // Prepare data for Top Customers by Outstanding
  const topCustomersData = [...customers]
    .map((c) => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
      shopName: c.shopName,
      outstanding: c.debit - c.credit,
      debit: c.debit,
      credit: c.credit,
    }))
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 10); // Top 10

  // ✅ FIXED: Custom label renderer with proper type checking
  const renderCustomLabel = ({ name, percent }: any) => {
    if (percent === undefined || percent === null) return '';
    return `${name} (${(percent * 100).toFixed(0)}%)`;
  };

  // Empty state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (daily.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-500 text-sm">
            No sales data found in the selected date range.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Sales Over Time + Orders Count */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-800">Sales Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesOverTimeData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [formatINR(value), "Sales"]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={COLORS.success}
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Count Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">Orders Count Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersCountData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [value, "Orders"]}
              />
              <Bar dataKey="orders" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Quantity by Unit + Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quantity by Unit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-800">
              Quantity Sold by Unit
            </h3>
          </div>
          {quantityByUnitData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              No quantity data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={quantityByUnitData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {quantityByUnitData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [value, "Quantity"]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment Split */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-semibold text-gray-800">Payment Split</h3>
          </div>
          {paymentSplitData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              No payment data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentSplitData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentSplitData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [formatINR(value), "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Top Customers by Outstanding */}
      {topCustomersData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-red-600" />
            <h3 className="text-base font-semibold text-gray-800">
              Top Customers by Outstanding (Debit)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topCustomersData}
              layout="vertical"
              margin={{ left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [formatINR(value), "Outstanding"]}
              />
              <Bar dataKey="outstanding" fill={COLORS.danger} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
                Total Cash Received
              </p>
              <p className="text-2xl font-bold text-green-800 mt-1">
                {formatINR(paymentBreakdown.cash)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">
                Total Bank/UPI
              </p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {formatINR(paymentBreakdown.bank)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-semibold uppercase tracking-wide">
                Outstanding Debt
              </p>
              <p className="text-2xl font-bold text-red-800 mt-1">
                {formatINR(paymentBreakdown.outstandingDebt)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}