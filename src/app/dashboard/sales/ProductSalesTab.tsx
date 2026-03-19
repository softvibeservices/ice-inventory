// src/app/dashboard/sales/ProductSalesTab.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import type {
  ProductSalesRow,
  ProductSalesSummaryItem,
  ProductSalesResponse,
  ProductSalesGroupBy,
} from "@/types/product-sales.types";
import {
  Package,
  TrendingUp,
  BarChart2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Calendar,
  RefreshCw,
  Filter,
  X,
  Star,
  Award,
  Layers,
  SortAsc,
  SortDesc,
  CalendarDays,
  CalendarRange,
  Check,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ProductSalesTabProps {
  userId: string;
  from: string;
  to: string;
}

type SummarySortField  = "productName" | "category" | "totalQuantity" | "orderCount";
type SummarySortDir    = "asc" | "desc";
type TimelineSortField = "productName" | "category" | "total";

type RangePreset =
  | "today" | "yesterday"
  | "thisWeek" | "lastWeek"
  | "thisMonth" | "lastMonth"
  | "last3Months" | "last6Months"
  | "thisYear" | "lastYear"
  | "allTime" | "custom";

// ─────────────────────────────────────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPresetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();

  switch (preset) {
    case "today":       return { from: toYMD(now), to: toYMD(now) };
    case "yesterday": {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      return { from: toYMD(d), to: toYMD(d) };
    }
    case "thisWeek": {
      const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: toYMD(mon), to: toYMD(now) };
    }
    case "lastWeek": {
      const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: toYMD(mon), to: toYMD(sun) };
    }
    case "thisMonth":   return { from: toYMD(new Date(y, m, 1)), to: toYMD(now) };
    case "lastMonth": {
      return { from: toYMD(new Date(y, m - 1, 1)), to: toYMD(new Date(y, m, 0)) };
    }
    case "last3Months": {
      const d = new Date(now); d.setDate(d.getDate() - 89);
      return { from: toYMD(d), to: toYMD(now) };
    }
    case "last6Months": {
      const d = new Date(now); d.setDate(d.getDate() - 179);
      return { from: toYMD(d), to: toYMD(now) };
    }
    case "thisYear":    return { from: toYMD(new Date(y, 0, 1)), to: toYMD(now) };
    case "lastYear":    return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:            return { from: "", to: "" };
  }
}

function formatDateLabel(d: string): string {
  if (d.length === 7) {
    const [y, mo] = d.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatDateLabelShort(d: string): string {
  if (d.length === 7) {
    const [y, mo] = d.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function describeRange(from: string, to: string, preset: RangePreset): string {
  const LABELS: Record<RangePreset, string> = {
    today: "Today", yesterday: "Yesterday",
    thisWeek: "This Week", lastWeek: "Last Week",
    thisMonth: "This Month", lastMonth: "Last Month",
    last3Months: "Last 3 Months", last6Months: "Last 6 Months",
    thisYear: "This Year", lastYear: "Last Year",
    allTime: "All Time", custom: "Custom",
  };
  if (preset !== "custom" && preset !== "allTime") return LABELS[preset];
  if (preset === "allTime") return "All Time";
  if (from && to) return `${formatDateLabel(from)} – ${formatDateLabel(to)}`;
  if (from) return `From ${formatDateLabel(from)}`;
  if (to)   return `Until ${formatDateLabel(to)}`;
  return "All Time";
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

function MiniCalendar({
  value, onChange, label, min, max,
}: { value: string; onChange: (v: string) => void; label: string; min?: string; max?: string }) {
  const today = new Date();
  const init  = value ? new Date(value + "T00:00:00") : new Date();
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS   = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  const first  = new Date(vy, vm, 1).getDay();
  const dim    = new Date(vy, vm + 1, 0).getDate();
  const offset = (first + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selD = value ? +value.split("-")[2] : -1;
  const selM = value ? +value.split("-")[1] - 1 : -1;
  const selY = value ? +value.split("-")[0] : -1;

  const isSel = (d: number) => d === selD && vm === selM && vy === selY;
  const isTod = (d: number) => d === today.getDate() && vm === today.getMonth() && vy === today.getFullYear();
  const isDis = (d: number) => {
    const ymd = `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return (!!min && ymd < min) || (!!max && ymd > max);
  };

  const prev = () => vm === 0 ? (setVy(y => y - 1), setVm(11)) : setVm(m => m - 1);
  const next = () => vm === 11 ? (setVy(y => y + 1), setVm(0)) : setVm(m => m + 1);

  const pick = (d: number) => {
    if (isDis(d)) return;
    onChange(`${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  };

  return (
    <div className="w-64 bg-white rounded-xl border border-gray-200 shadow-2xl p-3 select-none">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{label}</p>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-bold text-gray-800">{MONTHS[vm]} {vy}</span>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const sel = isSel(day), tod = isTod(day), dis = isDis(day);
          return (
            <button key={i} onClick={() => pick(day)} disabled={dis}
              className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold transition-all
                ${sel  ? "bg-blue-600 text-white shadow-sm" : ""}
                ${!sel && tod ? "ring-2 ring-blue-300 text-blue-700" : ""}
                ${!sel && !dis ? "hover:bg-blue-50 text-gray-700 cursor-pointer" : ""}
                ${dis ? "text-gray-300 cursor-not-allowed" : ""}`}
            >{day}</button>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between px-1">
        <button onClick={() => { setVy(today.getFullYear()); setVm(today.getMonth()); }} className="text-[11px] text-blue-600 hover:underline font-semibold">Jump to today</button>
        {value && <button onClick={() => onChange("")} className="text-[11px] text-gray-400 hover:text-red-500 font-semibold">Clear</button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE RANGE PICKER
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS: { key: RangePreset; label: string; group: string }[] = [
  { key: "today",       label: "Today",        group: "Days"   },
  { key: "yesterday",   label: "Yesterday",    group: "Days"   },
  { key: "thisWeek",    label: "This Week",    group: "Weeks"  },
  { key: "lastWeek",    label: "Last Week",    group: "Weeks"  },
  { key: "thisMonth",   label: "This Month",   group: "Months" },
  { key: "lastMonth",   label: "Last Month",   group: "Months" },
  { key: "last3Months", label: "Last 3 Months",group: "Months" },
  { key: "last6Months", label: "Last 6 Months",group: "Months" },
  { key: "thisYear",    label: "This Year",    group: "Years"  },
  { key: "lastYear",    label: "Last Year",    group: "Years"  },
  { key: "allTime",     label: "All Time",     group: "Other"  },
];

function DateRangePicker({
  from, to, preset, onRangeChange,
}: { from: string; to: string; preset: RangePreset; onRangeChange: (f: string, t: string, p: RangePreset) => void }) {
  const [open,        setOpen]        = useState(false);
  const [showFromCal, setShowFromCal] = useState(false);
  const [showToCal,   setShowToCal]   = useState(false);
  const [lf, setLf] = useState(from);
  const [lt, setLt] = useState(to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setLf(from); }, [from]);
  useEffect(() => { setLt(to);   }, [to]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowFromCal(false); setShowToCal(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (key: RangePreset) => {
    const r = getPresetRange(key);
    onRangeChange(r.from, r.to, key);
    setOpen(false);
  };

  const apply = () => {
    onRangeChange(lf, lt, "custom");
    setOpen(false); setShowFromCal(false); setShowToCal(false);
  };

  const groups = [...new Set(PRESETS.map(p => p.group))];
  const label  = describeRange(from, to, preset);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setShowFromCal(false); setShowToCal(false); }}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm
          ${open ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
      >
        <CalendarRange className="w-4 h-4 flex-shrink-0" />
        <span className="max-w-[200px] truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden w-[680px] max-w-[95vw]">
          <div className="flex">

            {/* LEFT: Presets list */}
            <div className="w-52 flex-shrink-0 border-r border-gray-100 py-3">
              <p className="px-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Select</p>
              {groups.map(g => (
                <div key={g}>
                  <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{g}</p>
                  {PRESETS.filter(p => p.group === g).map(p => (
                    <button key={p.key} onClick={() => pick(p.key)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors
                        ${preset === p.key ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {p.label}
                      {preset === p.key && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* RIGHT: Custom + shortcuts */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[520px]">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Range</p>

              <div className="grid grid-cols-2 gap-3">
                {/* FROM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">From</label>
                  <div className="relative">
                    <input type="date" value={lf} max={lt || undefined}
                      onChange={e => { setLf(e.target.value); setShowFromCal(false); }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-700"
                    />
                    <button onClick={() => { setShowFromCal(v => !v); setShowToCal(false); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      <CalendarDays className="w-4 h-4" />
                    </button>
                  </div>
                  {showFromCal && (
                    <div className="absolute z-[60] mt-1">
                      <MiniCalendar value={lf} onChange={v => { setLf(v); setShowFromCal(false); }} label="Select Start Date" max={lt || undefined} />
                    </div>
                  )}
                </div>
                {/* TO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">To</label>
                  <div className="relative">
                    <input type="date" value={lt} min={lf || undefined}
                      onChange={e => { setLt(e.target.value); setShowToCal(false); }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-700"
                    />
                    <button onClick={() => { setShowToCal(v => !v); setShowFromCal(false); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      <CalendarDays className="w-4 h-4" />
                    </button>
                  </div>
                  {showToCal && (
                    <div className="absolute z-[60] mt-1 right-4">
                      <MiniCalendar value={lt} onChange={v => { setLt(v); setShowToCal(false); }} label="Select End Date" min={lf || undefined} />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {(lf || lt) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
                  <span className="font-semibold">Range: </span>
                  {lf ? formatDateLabel(lf) : "Any start"} → {lt ? formatDateLabel(lt) : "Any end"}
                </div>
              )}

              {/* Apply / Clear */}
              <div className="flex gap-2">
                <button onClick={apply} disabled={!lf && !lt}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition">
                  <Check className="w-4 h-4" />Apply Range
                </button>
                <button onClick={() => { setLf(""); setLt(""); onRangeChange("", "", "allTime"); setOpen(false); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition">
                  Clear
                </button>
              </div>

              {/* Month Jump */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Jump to Month</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => {
                    const now   = new Date();
                    const yr    = now.getMonth() >= i ? now.getFullYear() : now.getFullYear() - 1;
                    const mo    = i + 1;
                    const mfrom = `${yr}-${String(mo).padStart(2, "0")}-01`;
                    const mto   = `${yr}-${String(mo).padStart(2, "0")}-${String(new Date(yr, mo, 0).getDate()).padStart(2, "0")}`;
                    const lbl   = new Date(yr, i).toLocaleDateString("en-IN", { month: "short" });
                    const isCur = i === now.getMonth() && yr === now.getFullYear();
                    return (
                      <button key={i} onClick={() => { onRangeChange(mfrom, mto, "custom"); setOpen(false); }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition
                          ${isCur ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                                  : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50 hover:border-gray-200"}`}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Year Jump */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Jump to Year</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2].map(off => {
                    const yr   = new Date().getFullYear() - off;
                    const yfr  = `${yr}-01-01`;
                    const yto  = off === 0 ? toYMD(new Date()) : `${yr}-12-31`;
                    return (
                      <button key={yr} onClick={() => { onRangeChange(yfr, yto, "custom"); setOpen(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                          ${off === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                     : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PALETTE
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = [
  { bg:"bg-violet-100", text:"text-violet-800", dot:"bg-violet-500",  bar:"bg-violet-400"  },
  { bg:"bg-sky-100",    text:"text-sky-800",    dot:"bg-sky-500",      bar:"bg-sky-400"     },
  { bg:"bg-emerald-100",text:"text-emerald-800",dot:"bg-emerald-500",  bar:"bg-emerald-400" },
  { bg:"bg-amber-100",  text:"text-amber-800",  dot:"bg-amber-500",    bar:"bg-amber-400"   },
  { bg:"bg-rose-100",   text:"text-rose-800",   dot:"bg-rose-500",     bar:"bg-rose-400"    },
  { bg:"bg-cyan-100",   text:"text-cyan-800",   dot:"bg-cyan-500",     bar:"bg-cyan-400"    },
  { bg:"bg-orange-100", text:"text-orange-800", dot:"bg-orange-500",   bar:"bg-orange-400"  },
  { bg:"bg-pink-100",   text:"text-pink-800",   dot:"bg-pink-500",     bar:"bg-pink-400"    },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductSalesTab({ userId, from: pFrom, to: pTo }: ProductSalesTabProps) {

  // ── INTERNAL DATE RANGE (fully independent) ─────────────────────────────────
  const [internalFrom, setInternalFrom] = useState<string>("");
  const [internalTo,   setInternalTo]   = useState<string>("");
  const [rangePreset,  setRangePreset]  = useState<RangePreset>("thisMonth");

  useEffect(() => {
    if (!pFrom && !pTo) {
      const r = getPresetRange("thisMonth");
      setInternalFrom(r.from);
      setInternalTo(r.to);
    } else {
      setInternalFrom(pFrom);
      setInternalTo(pTo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (from: string, to: string, preset: RangePreset) => {
    setInternalFrom(from);
    setInternalTo(to);
    setRangePreset(preset);
  };

  // ── DATA ────────────────────────────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState<ProductSalesGroupBy>("date");
  const [data,    setData]    = useState<ProductSalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── FILTERS ─────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm,       setSearchTerm]        = useState("");
  const [showCatDrop,      setShowCatDrop]        = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── VIEW ────────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"summary" | "timeline">("summary");

  // ── SORT — SUMMARY ──────────────────────────────────────────────────────────
  const [ssField, setSsField] = useState<SummarySortField>("totalQuantity");
  const [ssDir,   setSsDir]   = useState<SummarySortDir>("desc");

  // ── SORT — TIMELINE ─────────────────────────────────────────────────────────
  const [tsField, setTsField] = useState<TimelineSortField>("total");
  const [tsDir,   setTsDir]   = useState<SummarySortDir>("desc");

  // ── EXPANDED ────────────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── FETCH ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    if (!userId) return;
    const p = new URLSearchParams({ userId, groupBy });
    if (internalFrom) p.set("from", internalFrom);
    if (internalTo)   p.set("to",   internalTo);
    setLoading(true); setError(null);
    fetch(`/api/sales/product-sales?${p}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: ProductSalesResponse) => setData(d))
      .catch(() => setError("Failed to load product sales data"))
      .finally(() => setLoading(false));
  }, [userId, internalFrom, internalTo, groupBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── DERIVED ─────────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.summary.map(s => s.category || "Uncategorized"))].sort();
  }, [data]);

  const filteredSummary = useMemo((): ProductSalesSummaryItem[] => {
    if (!data) return [];
    return data.summary.filter(s => {
      const mc = selectedCategory === "all" || (s.category || "Uncategorized") === selectedCategory;
      const ms = !searchTerm || s.productName.toLowerCase().includes(searchTerm.toLowerCase()) || (s.category || "").toLowerCase().includes(searchTerm.toLowerCase());
      return mc && ms;
    });
  }, [data, selectedCategory, searchTerm]);

  const sortedSummary = useMemo((): ProductSalesSummaryItem[] => {
    return [...filteredSummary].sort((a, b) => {
      let c = 0;
      if (ssField === "productName")  c = a.productName.localeCompare(b.productName);
      if (ssField === "category")     c = (a.category || "").localeCompare(b.category || "");
      if (ssField === "totalQuantity") c = a.totalQuantity - b.totalQuantity;
      if (ssField === "orderCount")   c = a.orderCount - b.orderCount;
      return ssDir === "asc" ? c : -c;
    });
  }, [filteredSummary, ssField, ssDir]);

  const filteredRows = useMemo((): ProductSalesRow[] => {
    if (!data) return [];
    const ids = new Set(filteredSummary.map(s => String(s.productId)));
    return data.rows.filter(r => ids.has(String(r.productId)));
  }, [data, filteredSummary]);

  const dates = useMemo(() => [...new Set(filteredRows.map(r => r.date))].sort().reverse(), [filteredRows]);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    filteredRows.forEach(r => {
      const pid = String(r.productId);
      if (!m[pid]) m[pid] = {};
      m[pid][r.date] = r.totalQuantity;
    });
    return m;
  }, [filteredRows]);

  const timelineProducts = useMemo((): ProductSalesSummaryItem[] => {
    return [...filteredSummary].sort((a, b) => {
      const ta = Object.values(matrix[String(a.productId)] || {}).reduce((s, v) => s + v, 0);
      const tb = Object.values(matrix[String(b.productId)] || {}).reduce((s, v) => s + v, 0);
      let c = 0;
      if (tsField === "productName") c = a.productName.localeCompare(b.productName);
      if (tsField === "category")    c = (a.category || "").localeCompare(b.category || "");
      if (tsField === "total")       c = ta - tb;
      return tsDir === "asc" ? c : -c;
    });
  }, [filteredSummary, matrix, tsField, tsDir]);

  const stats = useMemo(() => {
    const totalQty    = filteredSummary.reduce((s, p) => s + p.totalQuantity, 0);
    const totalOrders = filteredSummary.reduce((s, p) => s + p.orderCount, 0);
    const top         = [...filteredSummary].sort((a, b) => b.totalQuantity - a.totalQuantity)[0] || null;
    const cats        = new Set(filteredSummary.map(s => s.category || "Uncategorized")).size;
    return { totalQty, totalOrders, top, cats };
  }, [filteredSummary]);

  const maxQty = useMemo(() => Math.max(...sortedSummary.map(s => s.totalQuantity), 1), [sortedSummary]);

  const catColorMap = useMemo(() => {
    const m: Record<string, typeof COLORS[0]> = {};
    categories.forEach((c, i) => { m[c] = COLORS[i % COLORS.length]; });
    return m;
  }, [categories]);
  const gc = (cat?: string) => catColorMap[cat || "Uncategorized"] || COLORS[0];

  const togSs = (f: SummarySortField) => { if (ssField === f) setSsDir(d => d === "asc" ? "desc" : "asc"); else { setSsField(f); setSsDir("desc"); } };
  const togTs = (f: TimelineSortField) => { if (tsField === f) setTsDir(d => d === "asc" ? "desc" : "asc"); else { setTsField(f); setTsDir("desc"); } };

  const clearFilters = () => { setSelectedCategory("all"); setSearchTerm(""); };
  const hasFilters   = selectedCategory !== "all" || searchTerm.trim() !== "";

  function SI({ field, active, dir }: { field: string; active: string; dir: SummarySortDir }) {
    if (field !== active) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return dir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading product sales...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR
  // ─────────────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-700 font-semibold">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition">
          <RefreshCw className="w-4 h-4" />Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* INFO BANNER */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Package className="w-4 h-4 text-emerald-700" />
        </div>
        <p className="text-xs text-emerald-900">
          <span className="font-bold">Product Sales Tracking — </span>
          Products are counted as sold <span className="font-bold">only when delivery status = Delivered</span>.
          The sold date is the exact date the order was marked delivered. Unsettled, pending, or discarded orders are excluded.
        </p>
      </div>

      {/* ── DATE RANGE + CONTROLS TOOLBAR ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 space-y-3">

        {/* Row 1: Date picker + Group By + View Mode + Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={internalFrom} to={internalTo} preset={rangePreset} onRangeChange={handleRangeChange} />

          <div className="h-7 w-px bg-gray-200 hidden sm:block" />

          {/* Group By */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            <span className="text-[11px] font-semibold text-gray-400 px-2 hidden sm:inline">Group:</span>
            {(["date","month"] as ProductSalesGroupBy[]).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  groupBy === g ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Calendar className="w-3 h-3" />{g === "date" ? "By Day" : "By Month"}
              </button>
            ))}
          </div>

          <div className="h-7 w-px bg-gray-200 hidden sm:block" />

          {/* View Mode */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            <button onClick={() => setViewMode("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "summary" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <List className="w-3.5 h-3.5" />Summary
            </button>
            <button onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "timeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Grid3X3 className="w-3.5 h-3.5" />Timeline
            </button>
          </div>

          <button onClick={fetchData} disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition border border-gray-200">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </button>
        </div>

        {/* Row 2: Search + Category filter + pills */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Search */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Search product or category..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <div ref={catRef} className="relative">
            <button onClick={() => setShowCatDrop(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                selectedCategory !== "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              <Filter className="w-3.5 h-3.5" />
              {selectedCategory === "all" ? "All Categories" : selectedCategory}
              {showCatDrop ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showCatDrop && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[190px]">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</span>
                  {selectedCategory !== "all" && (
                    <button onClick={() => { setSelectedCategory("all"); setShowCatDrop(false); }} className="text-[11px] text-blue-600 hover:underline">Clear</button>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {[{ value: "all", label: "All Categories" }, ...categories.map(c => ({ value: c, label: c }))].map(({ value, label }) => {
                    const col = value !== "all" ? gc(value) : null;
                    return (
                      <button key={value} onClick={() => { setSelectedCategory(value); setShowCatDrop(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition hover:bg-gray-50 ${
                          selectedCategory === value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}>
                        {col && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />}
                        {label}
                        {value !== "all" && (
                          <span className="ml-auto text-[10px] text-gray-400">
                            {data?.summary.filter(s => (s.category || "Uncategorized") === value).length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active filter pills */}
          {hasFilters && (
            <>
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-semibold">
                  {selectedCategory}<button onClick={() => setSelectedCategory("all")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-[11px] font-semibold">
                  "{searchTerm}"<button onClick={() => setSearchTerm("")}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-dashed border-gray-300 transition">
                <X className="w-3.5 h-3.5" />Clear all
              </button>
              <span className="text-[11px] text-gray-400">{filteredSummary.length} of {data?.summary.length || 0} products</span>
            </>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:"Total Qty Sold",    val: stats.totalQty.toLocaleString("en-IN"),    sub: `${filteredSummary.length} product${filteredSummary.length !== 1 ? "s" : ""}`, icon:<TrendingUp className="w-4 h-4 text-blue-600" />, iconBg:"bg-blue-50" },
            { label:"Delivered Orders",  val: stats.totalOrders.toLocaleString("en-IN"), sub: `across ${dates.length || "—"} ${groupBy === "month" ? "month(s)" : "day(s)"}`, icon:<BarChart2 className="w-4 h-4 text-emerald-600" />, iconBg:"bg-emerald-50" },
            { label:"Categories",        val: String(stats.cats),                        sub: "product categories", icon:<Layers className="w-4 h-4 text-violet-600" />, iconBg:"bg-violet-50" },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
                <div className={`w-7 h-7 ${card.iconBg} rounded-lg flex items-center justify-center`}>{card.icon}</div>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.val}</p>
              <p className="text-[11px] text-gray-400">{card.sub}</p>
            </div>
          ))}
          {/* Top product card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Top Product</span>
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center"><Award className="w-4 h-4 text-amber-500" /></div>
            </div>
            {stats.top ? (
              <>
                <p className="text-sm font-bold text-gray-900 leading-tight truncate" title={stats.top.productName}>{stats.top.productName}</p>
                <p className="text-[11px] text-gray-400">{stats.top.totalQuantity.toLocaleString("en-IN")} {stats.top.unit} sold</p>
              </>
            ) : <p className="text-sm text-gray-400">—</p>}
          </div>
        </div>
      )}

      {/* EMPTY — no data at all */}
      {data && data.summary.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">No product sales in this range</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Products are counted as sold only when delivery status is <span className="font-semibold text-emerald-600">Delivered</span>. Try selecting a different date range.
            </p>
          </div>
          <button onClick={() => handleRangeChange("", "", "allTime")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition">
            <CalendarRange className="w-4 h-4" />View All Time
          </button>
        </div>
      )}

      {/* EMPTY — filter mismatch */}
      {filteredSummary.length === 0 && data && data.summary.length > 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center space-y-3">
          <Search className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">No products match your filters</p>
          <button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition">
            <X className="w-3.5 h-3.5" />Clear filters
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUMMARY TABLE
      ══════════════════════════════════════════════════════════════════ */}
      {viewMode === "summary" && filteredSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Product Sales Summary
                <span className="ml-2 text-sm text-gray-400 font-normal">({sortedSummary.length} products)</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Click column headers to sort • Quantities = delivered orders only</p>
            </div>
            {/* Mobile sort */}
            <div className="sm:hidden">
              <select value={`${ssField}-${ssDir}`}
                onChange={e => { const [f, d] = e.target.value.split("-") as [SummarySortField, SummarySortDir]; setSsField(f); setSsDir(d); }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700">
                <option value="totalQuantity-desc">Qty: High → Low</option>
                <option value="totalQuantity-asc">Qty: Low → High</option>
                <option value="orderCount-desc">Orders: High → Low</option>
                <option value="orderCount-asc">Orders: Low → High</option>
                <option value="productName-asc">Name: A → Z</option>
                <option value="productName-desc">Name: Z → A</option>
                <option value="category-asc">Category: A → Z</option>
                <option value="category-desc">Category: Z → A</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 hidden sm:table-header-group">
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none" onClick={() => togSs("productName")}>
                    <span className="flex items-center gap-1.5">Product <SI field="productName" active={ssField} dir={ssDir} /></span>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none hidden md:table-cell" onClick={() => togSs("category")}>
                    <span className="flex items-center gap-1.5">Category <SI field="category" active={ssField} dir={ssDir} /></span>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Unit</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none" onClick={() => togSs("totalQuantity")}>
                    <span className="flex items-center gap-1.5">Qty Sold <SI field="totalQuantity" active={ssField} dir={ssDir} /></span>
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none" onClick={() => togSs("orderCount")}>
                    <span className="flex items-center justify-end gap-1.5">Deliveries <SI field="orderCount" active={ssField} dir={ssDir} /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedSummary.map((s, i) => {
                  const col    = gc(s.category);
                  const barPct = Math.round((s.totalQuantity / maxQty) * 100);
                  const isTop  = i === 0 && ssField === "totalQuantity" && ssDir === "desc";
                  return (
                    <tr key={String(s.productId)} className={`group transition-colors ${isTop ? "bg-amber-50/50 hover:bg-amber-50" : "hover:bg-blue-50/30"}`}>
                      <td className="px-5 py-3.5">
                        {isTop
                          ? <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /></span>
                          : <span className="text-xs text-gray-400 font-medium">{i + 1}</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-gray-900 text-sm leading-tight">{s.productName}</div>
                        <div className="flex items-center gap-2 mt-1 md:hidden">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${col.bg} ${col.text}`}>{s.category || "—"}</span>
                          <span className="text-[10px] text-gray-400">{s.unit}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${col.bg} ${col.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />{s.category || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 hidden lg:table-cell">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">{s.unit}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <span className="font-bold text-gray-900 text-sm tabular-nums">{s.totalQuantity.toLocaleString("en-IN")}</span>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${col.bar}`} style={{ width: `${barPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full tabular-nums">{s.orderCount}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-gray-400">{sortedSummary.length} product{sortedSummary.length !== 1 ? "s" : ""}{hasFilters ? ` (filtered from ${data?.summary.length})` : ""}</span>
            <span className="text-[11px] text-gray-500 font-semibold">
              Total: <span className="text-gray-800">{stats.totalQty.toLocaleString("en-IN")} units sold</span>{" · "}
              <span className="text-gray-800">{stats.totalOrders} deliveries</span>
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TIMELINE TABLE
      ══════════════════════════════════════════════════════════════════ */}
      {viewMode === "timeline" && filteredSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                Product Sales Timeline — <span className="text-blue-600 font-semibold">{groupBy === "month" ? "Monthly" : "Daily"} Breakdown</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Click a row to expand • Totals in last column</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-gray-500 font-semibold">Sort:</span>
              {(["total","productName","category"] as TimelineSortField[]).map(f => {
                const lbl = { total:"Total Qty", productName:"Name", category:"Category" }[f];
                return (
                  <button key={f} onClick={() => togTs(f)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      tsField === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    {lbl}
                    {tsField === f && (tsDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                  </button>
                );
              })}
              <button onClick={() => setTsDir(d => d === "asc" ? "desc" : "asc")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition">
                {tsDir === "desc" ? <><SortDesc className="w-3.5 h-3.5" /> Desc</> : <><SortAsc className="w-3.5 h-3.5" /> Asc</>}
              </button>
            </div>
          </div>

          {dates.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">No timeline data for this range.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-max min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-20 bg-gray-50 text-left px-5 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[200px] whitespace-nowrap">Product</th>
                    <th className="sticky left-[200px] z-20 bg-gray-50 text-left px-3 py-3 text-xs font-semibold text-gray-600 border-r border-gray-200 min-w-[110px] whitespace-nowrap hidden md:table-cell">Category</th>
                    {dates.map(d => (
                      <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap min-w-[80px]">
                        {formatDateLabelShort(d)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 whitespace-nowrap border-l border-gray-200 bg-blue-50 sticky right-0 z-20 min-w-[80px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {timelineProducts.map(s => {
                    const pid      = String(s.productId);
                    const rowData  = matrix[pid] || {};
                    const rowTotal = Object.values(rowData).reduce((a, b) => a + b, 0);
                    const col      = gc(s.category);
                    const isExp    = expandedId === pid;
                    const rowMax   = Math.max(...Object.values(rowData), 1);

                    return (
                      <>
                        <tr key={pid} onClick={() => setExpandedId(isExp ? null : pid)}
                          className="group hover:bg-blue-50/40 transition-colors cursor-pointer">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/40 px-5 py-3.5 border-r border-gray-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-1 h-8 rounded-full flex-shrink-0 ${col.dot}`} />
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 text-sm leading-tight truncate max-w-[150px]">{s.productName}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5 md:hidden">{s.category || "—"} · {s.unit}</div>
                              </div>
                              {isExp ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                            </div>
                          </td>
                          <td className="sticky left-[200px] z-10 bg-white group-hover:bg-blue-50/40 px-3 py-3.5 border-r border-gray-100 whitespace-nowrap hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${col.bg} ${col.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />{s.category || "—"}
                              </span>
                              <span className="text-[10px] text-gray-400">{s.unit}</span>
                            </div>
                          </td>
                          {dates.map(d => {
                            const qty     = rowData[d] || 0;
                            const cellPct = qty > 0 ? Math.round((qty / rowMax) * 100) : 0;
                            return (
                              <td key={d} className="px-3 py-3.5 text-center align-middle">
                                {qty > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-bold text-gray-900 tabular-nums text-sm">{qty.toLocaleString("en-IN")}</span>
                                    <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full opacity-70 ${col.bar}`} style={{ width: `${cellPct}%` }} />
                                    </div>
                                  </div>
                                ) : <span className="text-gray-200">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3.5 text-center font-bold text-blue-700 border-l border-gray-200 bg-blue-50 sticky right-0 z-10 whitespace-nowrap tabular-nums">
                            {rowTotal.toLocaleString("en-IN")}
                          </td>
                        </tr>

                        {/* Expanded row */}
                        {isExp && (
                          <tr key={`${pid}-exp`}>
                            <td colSpan={dates.length + 3} className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                              <p className="text-xs font-semibold text-gray-500 mb-2">📅 Breakdown for <span className="text-gray-800">{s.productName}</span></p>
                              <div className="flex flex-wrap gap-2">
                                {dates.filter(d => (rowData[d] || 0) > 0).map(d => (
                                  <div key={d} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${col.bg} ${col.text}`}>
                                    <Calendar className="w-3 h-3 opacity-70" />
                                    <span className="text-gray-600">{formatDateLabel(d)}:</span>
                                    <span className="font-bold">{(rowData[d] || 0).toLocaleString("en-IN")}</span>
                                  </div>
                                ))}
                                {dates.every(d => (rowData[d] || 0) === 0) && <span className="text-gray-400 text-xs">No sales in selected range</span>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td className="sticky left-0 z-20 bg-gray-100 px-5 py-3 text-xs font-bold text-gray-700 border-r border-gray-200 whitespace-nowrap">TOTAL</td>
                    <td className="sticky left-[200px] z-20 bg-gray-100 px-3 py-3 border-r border-gray-200 hidden md:table-cell" />
                    {dates.map(d => {
                      const ct = timelineProducts.reduce((s, p) => s + (matrix[String(p.productId)]?.[d] || 0), 0);
                      return (
                        <td key={d} className="px-3 py-3 text-center text-xs font-bold text-gray-800 tabular-nums">
                          {ct > 0 ? ct.toLocaleString("en-IN") : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-xs font-bold text-blue-800 border-l border-gray-300 bg-blue-100 sticky right-0 z-20 tabular-nums">
                      {timelineProducts.reduce((sum, s) => {
                        const pid = String(s.productId);
                        return sum + Object.values(matrix[pid] || {}).reduce((a, b) => a + b, 0);
                      }, 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}