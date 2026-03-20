// src/app/dashboard/sales/SalesInsights.tsx
"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Users,
  Wallet,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  IndianRupee,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Package,
  ShoppingCart,
  Target,
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

type ProductSalesRow = {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  date: string;
  totalQuantity: number;
  orderCount: number;
  totalRevenue: number;
};

type ProductSalesSummary = {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
};

type ProductSalesResponse = {
  rows: ProductSalesRow[];
  summary: ProductSalesSummary[];
};

interface SalesInsightsProps {
  daily: DailyStat[];
  quantities: QuantityTotals;
  paymentBreakdown: PaymentBreakdown;
  customers: CustomerItem[];
  productSales: ProductSalesResponse | null;
  loading?: boolean;
}

// ===== COLOR SYSTEM =====
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  teal: "#14b8a6",
  pink: "#ec4899",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  emerald: "#059669",
  orange: "#f97316",
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
  COLORS.emerald,
  COLORS.orange,
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

// ===== CUSTOM TOOLTIP COMPONENTS =====
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: any[];
  label?: string;
  type?: "currency" | "number";
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
              : entry.value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
};

// Pie chart label renderer
const renderCustomPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ===== MAIN COMPONENT =====
export default function SalesInsights({
  daily,
  quantities,
  paymentBreakdown,
  customers,
  productSales,
  loading,
}: SalesInsightsProps) {
  // ===== DATA PROCESSING =====

  // 1. Sales Over Time
  const salesOverTimeData = useMemo(() => {
    return [...daily]
      .reverse()
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: formatDateLong(d.date),
        sales: d.totalSales,
        orders: d.totalOrders,
      }));
  }, [daily]);

  // 2. Daily Payment Methods
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

  // 3. Payment Split
  const paymentSplitData = useMemo(() => {
    const { cash, bank, outstandingDebt } = paymentBreakdown;
    const total = cash + bank + outstandingDebt;

    if (total === 0) return [];

    const data = [];
    if (cash > 0) {
      data.push({
        name: "Cash",
        value: cash,
        color: COLORS.success,
        percentage: ((cash / total) * 100).toFixed(1),
      });
    }
    if (bank > 0) {
      data.push({
        name: "Bank/UPI",
        value: bank,
        color: COLORS.primary,
        percentage: ((bank / total) * 100).toFixed(1),
      });
    }
    if (outstandingDebt > 0) {
      data.push({
        name: "Outstanding",
        value: outstandingDebt,
        color: COLORS.danger,
        percentage: ((outstandingDebt / total) * 100).toFixed(1),
      });
    }

    return data;
  }, [paymentBreakdown]);

  // 4. Top Customers by Outstanding
  const topCustomersData = useMemo(() => {
    return customers
      .map((c) => ({
        name: c.name.length > 12 ? c.name.substring(0, 12) + "..." : c.name,
        fullName: c.name,
        shopName: c.shopName,
        outstanding: c.debit - c.credit,
        totalSales: c.totalSales,
      }))
      .filter((c) => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10);
  }, [customers]);

  // 5. Top Products by Quantity
  const topProductsData = useMemo(() => {
    if (!productSales?.summary) return [];
    
    return productSales.summary
      .slice(0, 10)
      .map((p) => ({
        name: p.productName.length > 15 ? p.productName.substring(0, 15) + "..." : p.productName,
        fullName: p.productName,
        quantity: p.totalQuantity,
        orders: p.orderCount,
        unit: p.unit,
      }));
  }, [productSales]);

  // 6. Category-wise Product Distribution
  const categoryDistribution = useMemo(() => {
    if (!productSales?.summary) return [];

    const categoryMap = new Map<string, number>();
    
    productSales.summary.forEach((p) => {
      const cat = p.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + p.totalQuantity);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [productSales]);

  // 7. Sales Trend Analysis
  const salesTrendAnalysis = useMemo(() => {
    if (daily.length < 2) return null;

    const sortedDaily = [...daily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const midpoint = Math.floor(sortedDaily.length / 2);
    const firstHalf = sortedDaily.slice(0, midpoint);
    const secondHalf = sortedDaily.slice(midpoint);

    const firstHalfAvg =
      firstHalf.reduce((sum, d) => sum + d.totalSales, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, d) => sum + d.totalSales, 0) / secondHalf.length;

    const percentChange =
      firstHalfAvg > 0
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0;

    return {
      firstHalfAvg,
      secondHalfAvg,
      percentChange,
      isIncreasing: secondHalfAvg > firstHalfAvg,
    };
  }, [daily]);

  // 8. Summary Stats
  const summaryStats = useMemo(() => {
    const totalSales = daily.reduce((sum, d) => sum + d.totalSales, 0);
    const totalOrders = daily.reduce((sum, d) => sum + d.totalOrders, 0);
    const totalCash = daily.reduce((sum, d) => sum + d.cashReceived, 0);
    const totalBank = daily.reduce((sum, d) => sum + d.bankReceived, 0);
    const totalPayments = totalCash + totalBank;
    const outstandingDebt = paymentBreakdown.outstandingDebt;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return {
      totalSales,
      totalOrders,
      totalCash,
      totalBank,
      totalPayments,
      outstandingDebt,
      avgOrderValue,
    };
  }, [daily, paymentBreakdown]);

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  // ===== EMPTY STATE =====
  if (daily.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          No Data Available
        </h3>
        <p className="text-sm text-yellow-700">
          There is no sales data in the selected date range.
        </p>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Average Order Value */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase">
              Avg Order Value
            </span>
            <IndianRupee className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatINR(summaryStats.avgOrderValue)}
          </p>
          <p className="text-xs text-blue-600 mt-1">Per delivered order</p>
        </div>

        {/* Collection Rate */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase">
              Collection Rate
            </span>
            <Percent className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {summaryStats.totalSales > 0
              ? (
                  (summaryStats.totalPayments / summaryStats.totalSales) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
          <p className="text-xs text-green-600 mt-1">Sales collected</p>
        </div>

        {/* Sales Trend */}
        {salesTrendAnalysis && (
          <div
            className={`bg-gradient-to-br rounded-xl p-4 border ${
              salesTrendAnalysis.isIncreasing
                ? "from-emerald-50 to-teal-50 border-emerald-200"
                : "from-orange-50 to-red-50 border-orange-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs font-semibold uppercase ${
                  salesTrendAnalysis.isIncreasing
                    ? "text-emerald-700"
                    : "text-orange-700"
                }`}
              >
                Sales Trend
              </span>
              {salesTrendAnalysis.isIncreasing ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-orange-600" />
              )}
            </div>
            <p
              className={`text-2xl font-bold ${
                salesTrendAnalysis.isIncreasing
                  ? "text-emerald-900"
                  : "text-orange-900"
              }`}
            >
              {salesTrendAnalysis.isIncreasing ? "+" : ""}
              {salesTrendAnalysis.percentChange.toFixed(1)}%
            </p>
            <p
              className={`text-xs mt-1 ${
                salesTrendAnalysis.isIncreasing
                  ? "text-emerald-600"
                  : "text-orange-600"
              }`}
            >
              Period comparison
            </p>
          </div>
        )}

        {/* Products Sold */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-purple-700 uppercase">
              Products Sold
            </span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {productSales?.summary?.length || 0}
          </p>
          <p className="text-xs text-purple-600 mt-1">Unique products</p>
        </div>
      </div>

      {/* Row 1: Sales & Orders Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Sales & Orders Trend
              </h3>
            </div>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                yAxisId="left"
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
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip content={<CustomTooltip type="currency" />} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke={COLORS.success}
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke={COLORS.primary}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Payment Methods
              </h3>
            </div>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
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
              <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
              <Bar
                dataKey="Cash"
                stackId="payment"
                fill={COLORS.success}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="Bank/UPI"
                stackId="payment"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Top 10 Products by Quantity
              </h3>
            </div>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </div>
          {topProductsData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No product sales data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={topProductsData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
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
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={100}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold text-gray-800 mb-1">
                          {data.fullName}
                        </p>
                        <p className="text-gray-600">
                          Quantity: <span className="font-semibold">{data.quantity.toLocaleString()}</span> {getUnitDisplayName(data.unit)}
                        </p>
                        <p className="text-gray-600">
                          Orders: <span className="font-semibold">{data.orders}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="quantity"
                  name="Quantity"
                  fill={COLORS.emerald}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Sales by Category
              </h3>
            </div>
            <PieChartIcon className="w-4 h-4 text-gray-400" />
          </div>
          {categoryDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-gray-400 text-sm">
              No category data
            </div>
          ) : (
            <div className="flex flex-col">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomPieLabel}
                    outerRadius={110}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-semibold text-gray-800">{data.name}</p>
                          <p className="text-gray-600">
                            Quantity: {data.value.toLocaleString()}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Financial Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
              No payment data
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
                    dataKey="value"
                  >
                    {paymentSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
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
              <div className="grid grid-cols-1 gap-3 mt-4">
                {paymentSplitData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs border-l-4 pl-3 py-1"
                    style={{ borderColor: item.color }}
                  >
                    <span className="text-gray-700 font-medium">{item.name}</span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {formatINR(item.value)}
                      </p>
                      <p className="text-gray-500 text-[10px]">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Outstanding Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-semibold text-gray-800">
                Top Outstanding Customers
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
                  width={90}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
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
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <h3 className="text-base font-semibold text-indigo-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Key Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Collection Efficiency</p>
            <p className="text-xl font-bold text-indigo-700">
              {summaryStats.totalSales > 0
                ? (
                    (summaryStats.totalPayments / summaryStats.totalSales) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Sales collected</p>
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
              %:{" "}
              {summaryStats.totalPayments > 0
                ? (
                    (summaryStats.totalBank / summaryStats.totalPayments) *
                    100
                  ).toFixed(0)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Payment split</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Outstanding Rate</p>
            <p className="text-xl font-bold text-indigo-700">
              {summaryStats.totalSales > 0
                ? (
                    (summaryStats.outstandingDebt / summaryStats.totalSales) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Sales pending</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-500 mb-1">Product Diversity</p>
            <p className="text-xl font-bold text-indigo-700">
              {productSales?.summary?.length || 0}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Unique products sold</p>
          </div>
        </div>
      </div>
    </div>
  );
}