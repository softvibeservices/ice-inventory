// src/app/dashboard/orders/DeliveryStatusBadge.tsx
"use client";

type DeliveryStatusBadgeProps = {
  status?: string | null;
};

export default function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const s = status ?? "Pending";
  const label = s;
  const base = "inline-flex items-center gap-2 text-xs font-semibold px-2 py-0.5 rounded-full";

  if (label === "Delivered") {
    return <span className={`${base} bg-green-100 text-green-800`}>✅ Delivered</span>;
  }
  if (label === "On the Way" || label === "On the way") {
    return <span className={`${base} bg-yellow-100 text-amber-800`}>🚚 On the Way</span>;
  }
  // Pending / default
  return <span className={`${base} bg-slate-100 text-slate-800`}>⏳ Pending</span>;
}
