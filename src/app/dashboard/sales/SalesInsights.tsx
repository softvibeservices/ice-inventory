// src/app/dashboard/sales/SalesInsights.tsx

"use client";

import { useMemo, useState } from "react";
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
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Wallet,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  IndianRupee,
  AlertCircle,
} from "lucide-react";

// ===== TYPE DEFINITIONS =====
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

// ===== COLOR SYSTEM =====
const COLORS = {
  primary: "#3b82f6", // blue
  success: "#10b981", // green
  warning: "#f59e0b", // amber/orange
  danger: "#ef4444", // red
  purple: "#8b5cf6",
  teal: "#14b8a6",
  pink: "#ec4899",
  indigo: "#6366f1",
  cyan: "#06b6d4",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.teal,
  COLORS.pink,
  COLORS.indigo,
  COLORS.cyan,
];

// ===== UTILITY FUNCTIONS =====
function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatINRDetailed(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  return (
    displayMap[unit.toLowerCase()] ||
    unit.charAt(0).toUpperCase() + unit.slice(1)
  );
}

function formatQuantity(value: number, unit: string): string {
  const roundedValue = Math.round(value);
  const unitFormatMap: Record<string, string> = {
    ml: "ml",
    l: "L",
    litre: "L",
    litres: "L",
    gm: "gm",
    g: "gm",
    kg: "kg",
    piece: "pc",
    pieces: "pc",
    box: "box",
    boxes: "box",
  };
  const formattedUnit = unitFormatMap[unit.toLowerCase()] || unit;
  return `${roundedValue} ${formattedUnit}`;
}

// ===== CUSTOM TOOLTIP COMPONENTS =====
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: any[];
  label?: string;
  type?: "currency" | "number" | "quantity";
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  type = "currency",
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
          </div>
          <span className="font-semibold text-gray-800">
            {type === "currency"
              ? formatINR(entry.value)
              : type === "number"
              ? entry.value.toLocaleString("en-IN")
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function SalesInsights({
  daily,
  quantities,
  paymentBreakdown,
  customers,
  loading,
}: SalesInsightsProps) {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  // ===== DATA PROCESSING =====

  // 1. Sales Over Time (Reversed: oldest → newest for chronological flow)
  const salesOverTimeData = useMemo(() => {
    return [...daily]
      .reverse()
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: formatDateLong(d.date),
        sales: d.totalSales,
        cash: d.cashReceived,
        bank: d.bankReceived,
      }));
  }, [daily]);

  // 2. Orders Count Trend
  const ordersCountData = useMemo(() => {
    return [...daily]
      .reverse()
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: formatDateLong(d.date),
        orders: d.totalOrders,
      }));
  }, [daily]);

  // 3. Quantity by Unit (Pie Chart)
  const quantityByUnitData = useMemo(() => {
    return Object.entries(quantities)
      .filter(([_, value]) => value > 0)
      .map(([unit, value]) => ({
        name: getUnitDisplayName(unit),
        value: Math.round(value),
        unit,
        formatted: formatQuantity(value, unit),
      }))
      .sort((a, b) => b.value - a.value);
  }, [quantities]);

  // 4. Payment Split (Pie Chart)
  const paymentSplitData = useMemo(() => {
    const data = [
      {
        name: "Cash",
        value: paymentBreakdown.cash,
        color: COLORS.success,
        percentage: 0,
      },
      {
        name: "Bank/UPI",
        value: paymentBreakdown.bank,
        color: COLORS.primary,
        percentage: 0,
      },
      {
        name: "Outstanding",
        value: paymentBreakdown.outstandingDebt,
        color: COLORS.danger,
        percentage: 0,
      },
    ].filter((item) => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map((item) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : "0",
    }));
  }, [paymentBreakdown]);

  // 5. Top Customers by Outstanding
  const topCustomersData = useMemo(() => {
    return [...customers]
      .map((c) => ({
        name: c.name.length > 20 ? c.name.substring(0, 20) + "..." : c.name,
        fullName: c.name,
        shopName: c.shopName,
        outstanding: c.debit - c.credit,
        debit: c.debit,
        credit: c.credit,
        totalSales: c.totalSales,
      }))
      .filter((c) => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);
  }, [customers]);

  // 6. Daily Payment Methods Breakdown (Stacked Bar)
  const dailyPaymentData = useMemo(() => {
    return [...daily]
      .reverse()
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: formatDateLong(d.date),
        Cash: d.cashReceived,
        "Bank/UPI": d.bankReceived,
      }));
  }, [daily]);

  // 7. Top Units Sold (Bar Chart)
  const topUnitsData = useMemo(() => {
    return quantityByUnitData.slice(0, 5);
  }, [quantityByUnitData]);

  // 8. Summary Statistics
  const summaryStats = useMemo(() => {
    const totalSales = daily.reduce((sum, d) => sum + d.totalSales, 0);
    const totalOrders = daily.reduce((sum, d) => sum + d.totalOrders, 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalCash = daily.reduce((sum, d) => sum + d.cashReceived, 0);
    const totalBank = daily.reduce((sum, d) => sum + d.bankReceived, 0);
    const totalPayments = totalCash + totalBank;

    return {
      totalSales,
      totalOrders,
      avgOrderValue,
      totalCash,
      totalBank,
      totalPayments,
      outstandingDebt: paymentBreakdown.outstandingDebt,
    };
  }, [daily, paymentBreakdown.outstandingDebt]);

  // ===== CUSTOM PIE LABEL =====
  const renderCustomPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Hide labels for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // ===== LOADING STATE =====
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

  // ===== EMPTY STATE =====
  if (daily.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
        <Package className="w-20 h-20 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Sales Data Available
        </h3>
        <p className="text-gray-500 text-sm text-center max-w-md">
          No sales data found in the selected date range. Try adjusting your
          filters or create some orders to see insights here.
        </p>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Data Insights Overview</p>
          <p className="text-xs text-blue-700">
            All charts and statistics are calculated from{" "}
            <span className="font-semibold">settled and delivered orders only</span>.
            Unsettled, pending, or discarded orders are excluded from all
            calculations.
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-700" />
            </div>
            <span className="text-xs text-green-700 font-semibold bg-green-200 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">
            Total Sales
          </p>
          <p className="text-2xl font-bold text-green-800">
            {formatINR(summaryStats.totalSales)}
          </p>
          <p className="text-xs text-green-600 mt-2">
            From {summaryStats.totalOrders} orders
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-xs text-blue-700 font-semibold bg-blue-200 px-2 py-1 rounded-full">
              Avg
            </span>
          </div>
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-1">
            Avg Order Value
          </p>
          <p className="text-2xl font-bold text-blue-800">
            {formatINR(summaryStats.avgOrderValue)}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Per order delivered
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-700" />
            </div>
            <span className="text-xs text-purple-700 font-semibold bg-purple-200 px-2 py-1 rounded-full">
              Received
            </span>
          </div>
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">
            Payments Collected
          </p>
          <p className="text-2xl font-bold text-purple-800">
            {formatINR(summaryStats.totalPayments)}
          </p>
          <p className="text-xs text-purple-600 mt-2 flex items-center gap-2">
            <span>Cash: {formatINR(summaryStats.totalCash)}</span>
            <span className="text-purple-400">|</span>
            <span>Bank: {formatINR(summaryStats.totalBank)}</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-700" />
            </div>
            <span className="text-xs text-red-700 font-semibold bg-red-200 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <p className="text-xs text-red-700 font-semibold uppercase tracking-wide mb-1">
            Outstanding Debt
          </p>
          <p className="text-2xl font-bold text-red-800">
            {formatINR(summaryStats.outstandingDebt)}
          </p>
          <p className="text-xs text-red-600 mt-2">
            From {topCustomersData.length} customers
          </p>
        </div>
      </div>

      {/* Row 1: Sales Trend + Orders Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Sales Trend
              </h3>
            </div>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesOverTimeData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(value) => {
                  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                  return `₹${value}`;
                }}
              />
              <Tooltip content={<CustomTooltip type="currency" />} />
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke={COLORS.success}
                strokeWidth={3}
                fill="url(#salesGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Count Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Orders Trend
              </h3>
            </div>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersCountData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip content={<CustomTooltip type="number" />} />
              <Bar
                dataKey="orders"
                name="Orders"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Payment Methods Over Time */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-800">
              Payment Methods Over Time
            </h3>
          </div>
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dailyPaymentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(value) => {
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }}
            />
            <Tooltip content={<CustomTooltip type="currency" />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="circle"
            />
            <Bar
              dataKey="Cash"
              stackId="payment"
              fill={COLORS.success}
              radius={[0, 0, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              dataKey="Bank/UPI"
              stackId="payment"
              fill={COLORS.primary}
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Quantity Breakdown + Payment Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quantity Sold by Unit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Quantity Sold by Unit
              </h3>
            </div>
            <PieChartIcon className="w-4 h-4 text-gray-400" />
          </div>
          {quantityByUnitData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No quantity data available
            </div>
          ) : (
            <div className="flex flex-col">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={quantityByUnitData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomPieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {quantityByUnitData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-semibold text-gray-800 mb-1">
                            {data.name}
                          </p>
                          <p className="text-gray-600">{data.formatted}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 mt-4 px-4">
                {quantityByUnitData.slice(0, 6).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-gray-700 truncate">
                      {item.name}: <span className="font-semibold">{item.formatted}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Split */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Payment Distribution
              </h3>
            </div>
            <PieChartIcon className="w-4 h-4 text-gray-400" />
          </div>
          {paymentSplitData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No payment data available
            </div>
          ) : (
            <div className="flex flex-col">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={paymentSplitData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomPieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {paymentSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-semibold text-gray-800 mb-1">
                            {data.name}
                          </p>
                          <p className="text-gray-600">
                            {formatINRDetailed(data.value)} ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="grid grid-cols-1 gap-3 mt-4 px-4">
                {paymentSplitData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs border-l-4 pl-3 py-1"
                    style={{ borderColor: item.color }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {formatINR(item.value)}
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        {item.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Top Units Sold + Top Customers by Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Units Sold */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Top 5 Units Sold
              </h3>
            </div>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          {topUnitsData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No unit data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topUnitsData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={80}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold text-gray-800 mb-1">
                          {data.name}
                        </p>
                        <p className="text-gray-600">{data.formatted}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Quantity"
                  fill={COLORS.teal}
                  radius={[0, 8, 8, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Customers by Outstanding */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Top 10 Outstanding Customers
              </h3>
            </div>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          {topCustomersData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No outstanding debts
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={topCustomersData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => {
                    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                    return `₹${value}`;
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={100}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold text-gray-800 mb-1">
                          {data.fullName}
                        </p>
                        <p className="text-gray-500 text-[10px] mb-2">
                          {data.shopName}
                        </p>
                        <div className="space-y-1">
                          <p className="text-gray-600">
                            Outstanding:{" "}
                            <span className="font-semibold text-red-600">
                              {formatINR(data.outstanding)}
                            </span>
                          </p>
                          <p className="text-gray-600">
                            Total Sales:{" "}
                            <span className="font-semibold">
                              {formatINR(data.totalSales)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="outstanding"
                  name="Outstanding"
                  fill={COLORS.danger}
                  radius={[0, 8, 8, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Additional Insights Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <h3 className="text-base font-semibold text-indigo-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Collection Rate</p>
            <p className="text-xl font-bold text-indigo-700">
              {summaryStats.totalSales > 0
                ? (
                    (summaryStats.totalPayments / summaryStats.totalSales) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Of total sales collected
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Cash vs Digital</p>
            <p className="text-xl font-bold text-indigo-700">
              {summaryStats.totalPayments > 0
                ? (
                    (summaryStats.totalCash / summaryStats.totalPayments) *
                    100
                  ).toFixed(0)
                : 0}
              % :{" "}
              {summaryStats.totalPayments > 0
                ? (
                    (summaryStats.totalBank / summaryStats.totalPayments) *
                    100
                  ).toFixed(0)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Payment split ratio</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Debt Ratio</p>
            <p className="text-xl font-bold text-indigo-700">
              {summaryStats.totalSales > 0
                ? (
                    (summaryStats.outstandingDebt / summaryStats.totalSales) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              Of sales still outstanding
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}