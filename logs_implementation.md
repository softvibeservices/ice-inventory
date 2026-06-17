# ICE SAATHI — Professional Activity Log System
## `implementation_logs.md`
### Entity-Centric Audit Trail: Track One Thing Properly, Not Random Events

---

## THE CORE PROBLEM (Plain English)

Right now your logs are **scattered orphans**. A bill gets generated → one log entry. That same bill gets edited → a different, disconnected log entry. A delivery partner picks up the order → another isolated log entry. There is no thread connecting these events. You can't look at **Bill #260501** and see its full story in one place.

What you actually want is:

> **"Show me everything that ever happened to this bill / this order."**
> - Bill #260501 was **generated** by Rahul (Manager) on 01-Jun-2025 at 10:32 AM
> - Bill #260501 was **edited** by Priya (Admin) on 01-Jun-2025 at 2:15 PM — Items changed, total: ₹1,200 → ₹1,050
> - Order linked to Bill #260501 went **Pending → On the Way** — accepted by Delivery Partner: Arjun at 3:00 PM
> - Order delivered by Arjun at 5:45 PM

This document describes exactly how to build that — in phases, with zero guesswork about which files to touch.

---

## WHAT IS CHANGING AND WHAT IS NOT

### Changing
- `IActivityLogMeta` — 5 new optional fields added
- `ActivityAction` enum — 6 new actions added
- `ActivityLogSchema` — 2 new indexed fields (`entityId`, `entityType`)
- `src/lib/createLog.ts` — `entityId` + `entityType` params added
- `src/app/api/activity-logs/route.ts` — `entityId` filter support added
- `src/app/api/bills/route.ts` — POST and PUT log calls upgraded
- `src/app/api/orders/route.ts` — PATCH (delivery status change, settle, discard) log calls upgraded
- `src/app/api/delivery/update-order-status/route.ts` — log calls upgraded
- `src/app/api/orders/revert-delivery/route.ts` — log call added (currently missing)
- `src/app/dashboard/ActivityLog.tsx` — UI upgraded: entity timeline drawer, `entityId` filter
- `src/types/activityLog.type.ts` — new fields synced

### NOT Changing
- MongoDB collection name (`ActivityLog`)
- TTL (90 days) — unchanged
- Auth flows, session handling, JWT — untouched
- Bill creation / editing business logic — untouched
- Order creation / settlement logic — untouched
- All admin / subscription / payment routes — untouched
- All product / customer / stock routes — untouched
- Any frontend page outside `ActivityLog.tsx` — untouched
- `globals.css`, `DashboardNavbar.tsx`, all UI pages — untouched

---

## DIAGNOSTIC: WHY CURRENT LOGS FAIL

| Current Behaviour | The Problem |
|---|---|
| `BILL_GENERATED` log has `orderId` in metadata | But `orderId` is a string like `"ORD-abc123"` — you can't efficiently query all logs for a specific document |
| `ORDER_EDITED` log has `orderId` in metadata | No way to know it was the **same bill** that was edited |
| `DELIVERY_ORDER_ACCEPTED` stores `orderId` | Not cross-linked to the bill that triggered the delivery |
| `ORDER_DELIVERY_STATUS_CHANGED` has `oldStatus`/`newStatus` | But only the manager-side change — the delivery partner's side uses a **separate action** with no link |
| Bill edit log fires `ACTION.ORDER_EDITED`, not `BILL_EDITED` | Conceptually wrong — the bill was edited, not just the order |
| No `BILL_EDITED` action exists | Gap in the enum |
| No `ORDER_DISCARDED` fires when delivery is reverted | The revert-delivery route has **zero activity log calls** |

---

## DATA MODEL CHANGES (Applied in Phase 1)

### New Fields on `IActivityLog`

```
entityId:   string   // MongoDB _id of the primary document (Bill._id, Order._id, etc.)
entityType: string   // "bill" | "order" | "product" | "customer" | "stock_entry" | "sticky_note"
```

These two fields are the spine of the whole system. Every log entry will carry them. Then querying "all events for Bill with _id X" becomes a single indexed DB call instead of an expensive regex search on metadata.

### New Fields on `IActivityLogMeta`

```
billId?:          string   // Bill._id as string (for bill events)
previousTotal?:   number   // bill total before edit (for BILL_EDITED)
newTotal?:        number   // bill total after edit (for BILL_EDITED)  
deliveryPartnerName?: string  // human name of delivery partner (for delivery logs)
itemCount?:       number   // already exists — reconfirmed here
```

### New Actions in `ActivityAction`

| New Action | When Fired | Route |
|---|---|---|
| `BILL_EDITED` | Bill PUT (edit existing bill) | `src/app/api/bills/route.ts` → PUT |
| `ORDER_DELIVERY_REVERTED` | Delivery reverted back to Pending | `src/app/api/orders/revert-delivery/route.ts` |
| `ORDER_DISCARDED` | Order discarded | currently `ORDER_DISCARDED` exists — verify it fires |
| `DELIVERY_STATUS_PENDING_TO_ON_THE_WAY` | Partner accepts order | already `DELIVERY_ORDER_ACCEPTED` — rename is optional |
| `DELIVERY_STATUS_ON_THE_WAY_TO_DELIVERED` | Partner delivers | already `DELIVERY_ORDER_DELIVERED` — rename is optional |
| `BILL_PRINT_VIEWED` | Future phase — skip for now | — |

**Minimum new actions needed:** `BILL_EDITED`, `ORDER_DELIVERY_REVERTED`. The rest already exist.

---

## PHASE 1 — Model + Schema + Enum
**Goal:** Add `entityId` / `entityType` to the ActivityLog schema and the new actions to the enum.
**Risk:** Low. Schema additions are backward-compatible. Old logs without these fields simply return `undefined` for them.

### Files Affected in Phase 1

| File | What Changes |
|---|---|
| `src/models/ActivityLog.ts` | Add `entityId`, `entityType` to schema + interface; add `BILL_EDITED`, `ORDER_DELIVERY_REVERTED` to `ActivityAction` |
| `src/types/activityLog.type.ts` | Sync new fields to `IActivityLogEntry` frontend type |

---

### Phase 1 — Step-by-Step Code Changes

#### 1A. `src/models/ActivityLog.ts`

**Add to `ActivityAction` const (inside the `BILL` block):**
```ts
// ── Manager · Bill ───────────────────────────────────────────────────────────
BILL_GENERATED:                "BILL_GENERATED",      // already exists
BILL_EDITED:                   "BILL_EDITED",         // ← NEW
```

**Add to `ActivityAction` const (inside the ORDER block):**
```ts
ORDER_DELIVERY_REVERTED:       "ORDER_DELIVERY_REVERTED",  // ← NEW
```

**Add to `IActivityLogMeta` interface:**
```ts
billId?:              string;   // Bill._id (for bill-centric events)
previousTotal?:       number;   // total before edit
newTotal?:            number;   // total after edit
deliveryPartnerName?: string;   // partner's human name for delivery logs
```

**Add to `IActivityLog` document interface (after `metadata`):**
```ts
entityId?:   string;  // _id of the primary entity (Bill, Order, Product, etc.)
entityType?: "bill" | "order" | "product" | "customer" | "stock_entry" | "sticky_note";
```

**Add to `ActivityLogSchema` (after the `metadata` field definition):**
```ts
entityId: {
  type:  String,
  index: true,          // enables GET /api/activity-logs?entityId=xxx
},
entityType: {
  type: String,
  enum: ["bill", "order", "product", "customer", "stock_entry", "sticky_note"],
},
```

**Add compound index (after the existing indexes):**
```ts
ActivityLogSchema.index({ adminId: 1, entityId: 1, createdAt: -1 });
```

---

#### 1B. `src/types/activityLog.type.ts`

**Add to `IActivityLogEntry`:**
```ts
entityId?:   string;
entityType?: "bill" | "order" | "product" | "customer" | "stock_entry" | "sticky_note";
```

**Add to `IActivityLogMeta`:**
```ts
billId?:              string;
previousTotal?:       number;
newTotal?:            number;
deliveryPartnerName?: string;
```

**Add to `IActivityLogQuery`:**
```ts
entityId?: string;   // filter all logs for one entity
```

---

## PHASE 2 — `createLog` Helper Upgrade
**Goal:** Accept `entityId` and `entityType` in the `createLog` call so every log writer can pass them through.
**Risk:** Zero. Optional params — all existing callers still compile without passing them.

### Files Affected in Phase 2

| File | What Changes |
|---|---|
| `src/lib/createLog.ts` | Add `entityId?` and `entityType?` to the input params type; pass them to `ActivityLog.create()` |

---

### Phase 2 — Step-by-Step Code Changes

#### 2A. `src/lib/createLog.ts`

The function currently accepts an object with at minimum:
`{ adminId, actorId, actorModel, actorName, actorRole, action, category, message, metadata }`

**Add two optional fields to the parameter type:**
```ts
entityId?:   string;
entityType?: "bill" | "order" | "product" | "customer" | "stock_entry" | "sticky_note";
```

**Pass them to `ActivityLog.create()`:**
```ts
await ActivityLog.create({
  adminId,
  actorId,
  actorModel,
  actorName,
  actorRole,
  action,
  category,
  message,
  metadata: metadata ?? {},
  entityId:   entityId   ?? undefined,
  entityType: entityType ?? undefined,
});
```

No other logic change. The helper stays identical in all other respects.

---

## PHASE 3 — API Route Log Upgrades
**Goal:** Every API route that writes a log now passes `entityId` + `entityType` and uses the correct action.

This is the most important phase. It ensures every action on a bill or order is stamped with the document's `_id` so they can all be fetched together later.

### Files Affected in Phase 3

| File | What Log Calls Change |
|---|---|
| `src/app/api/bills/route.ts` | POST: pass `entityId: bill._id`, `entityType: "bill"`; PUT: change action to `BILL_EDITED`, pass before/after totals |
| `src/app/api/orders/route.ts` | All PATCH actions: pass `entityId: order._id`, `entityType: "order"` |
| `src/app/api/delivery/update-order-status/route.ts` | Pass `entityId: orderId`, `entityType: "order"`, `deliveryPartnerName` |
| `src/app/api/orders/revert-delivery/route.ts` | **Add missing log call** with `ORDER_DELIVERY_REVERTED` |

---

### Phase 3 — Step-by-Step Code Changes

#### 3A. `src/app/api/bills/route.ts` — POST handler

**Current log call (around line 10200):**
```ts
await createLog({
  ...actor,
  action: ActivityAction.BILL_GENERATED,
  metadata: {
    billSerialNumber: bill.serialNumber,
    billTotal:        bill.grandTotal,
    customerName:     bill.billingCustomer?.name,
    orderId:          order.orderId,
  },
});
```

**Replace with:**
```ts
await createLog({
  ...actor,
  action: ActivityAction.BILL_GENERATED,
  entityId:   bill._id.toString(),          // ← NEW: primary entity = the bill
  entityType: "bill",                        // ← NEW
  metadata: {
    billId:          bill._id.toString(),    // ← NEW: redundant but searchable
    billSerialNumber: bill.serialNumber,
    billTotal:        bill.grandTotal,
    customerName:     bill.billingCustomer?.name,
    customerId:       bill.billingCustomer?.customerId?.toString(),
    orderId:          order.orderId,
    itemCount:        bill.items?.length ?? 0,
  },
});
```

---

#### 3B. `src/app/api/bills/route.ts` — PUT handler

**Current log call (around line 10469):**
```ts
await createLog({
  ...actor,
  action: ActivityAction.ORDER_EDITED,      // ← WRONG: this edited a BILL
  metadata: {
    orderId:          existingOrder.orderId,
    customerName:     existingBill.billingCustomer?.name,
    billSerialNumber: existingBill.serialNumber,
    orderTotal:       existingOrder.total,
  },
});
```

**Replace with:**
```ts
await createLog({
  ...actor,
  action: ActivityAction.BILL_EDITED,       // ← CORRECT action
  entityId:   existingBill._id.toString(),  // ← NEW: entity = the bill
  entityType: "bill",                        // ← NEW
  metadata: {
    billId:           existingBill._id.toString(),
    billSerialNumber: existingBill.serialNumber,
    customerName:     existingBill.billingCustomer?.name,
    customerId:       existingBill.billingCustomer?.customerId?.toString(),
    orderId:          existingOrder.orderId,
    previousTotal:    oldTotal,              // ← NEW: capture before-value (oldTotal already computed above in the route)
    newTotal:         serverGrandTotal,      // ← NEW: capture after-value
    itemCount:        existingBill.items?.length ?? 0,
  },
});
```

> `oldTotal` is already available in the PUT handler as `const oldTotal = existingBill.grandTotal || 0;`. No new variable needed.

---

#### 3C. `src/app/api/orders/route.ts` — PATCH: `changeDeliveryStatus` action

**Current log call (around line 15301):**
```ts
await createLog({
  ...actor,
  action: ActivityAction.ORDER_DELIVERY_STATUS_CHANGED,
  metadata: {
    orderId:           order.orderId,
    oldDeliveryStatus: oldStatus,
    newDeliveryStatus: deliveryStatus,
    customerName:      order.customerName,
  },
});
```

**Replace with:**
```ts
await createLog({
  ...actor,
  action: ActivityAction.ORDER_DELIVERY_STATUS_CHANGED,
  entityId:   order._id.toString(),     // ← NEW
  entityType: "order",                   // ← NEW
  metadata: {
    orderId:           order.orderId,
    oldDeliveryStatus: oldStatus,
    newDeliveryStatus: deliveryStatus,
    customerName:      order.customerName,
    customerId:        order.customerId?.toString(),
  },
});
```

---

#### 3D. `src/app/api/orders/route.ts` — PATCH: `settle` action

**Current log call (around line 15542):**
```ts
await createLog({
  ...actor,
  action: method === "Cash"
    ? ActivityAction.ORDER_SETTLED_CASH
    : ActivityAction.ORDER_SETTLED_BANK_UPI,
  metadata: {
    orderId:          order.orderId,
    amountPaid:       payAmount,
    settlementMethod: method,
    orderTotal:       billTotal,
    customerName:     order.customerName,
  },
});
```

**Replace with:**
```ts
await createLog({
  ...actor,
  action: method === "Cash"
    ? ActivityAction.ORDER_SETTLED_CASH
    : ActivityAction.ORDER_SETTLED_BANK_UPI,
  entityId:   order._id.toString(),   // ← NEW
  entityType: "order",                 // ← NEW
  metadata: {
    orderId:          order.orderId,
    amountPaid:       payAmount,
    settlementMethod: method,
    orderTotal:       billTotal,
    customerName:     order.customerName,
    customerId:       order.customerId?.toString(),
    remainingBalance: Math.max(0, billTotal - totalPaid),
  },
});
```

---

#### 3E. `src/app/api/orders/route.ts` — PATCH: `settleDebt` action

**Current log call (around line 15651):**
```ts
await createLog({
  ...actor,
  action: ActivityAction.ORDER_DEBT_SETTLED,
  metadata: {
    orderId:          order.orderId,
    amountPaid:       payAmount,
    settlementMethod: method,
    remainingBalance: Math.max(0, billTotal - newTotalPaid),
    customerName:     order.customerName,
  },
});
```

**Replace with:**
```ts
await createLog({
  ...actor,
  action: ActivityAction.ORDER_DEBT_SETTLED,
  entityId:   order._id.toString(),     // ← NEW
  entityType: "order",                   // ← NEW
  metadata: {
    orderId:          order.orderId,
    amountPaid:       payAmount,
    settlementMethod: method,
    remainingBalance: Math.max(0, billTotal - newTotalPaid),
    customerName:     order.customerName,
    customerId:       order.customerId?.toString(),
  },
});
```

---

#### 3F. `src/app/api/delivery/update-order-status/route.ts`

**Current log calls (around lines 13488–13516):**

The route already has two log calls (one for `On the Way`, one for `Delivered`) plus an optional note log. All need `entityId` / `entityType` added, plus the delivery partner name.

The partner's name is already available in `actor.actorName` from `getDeliveryActor(partnerId)`.

**Replace the entire log block (keeping the logic, adding fields):**
```ts
const actor = await getDeliveryActor(partnerId);
if (actor) {
  if (status === "On the Way") {
    await createLog({
      ...actor,
      action: ActivityAction.DELIVERY_ORDER_ACCEPTED,
      entityId:   orderId.toString(),                               // ← NEW
      entityType: "order",                                           // ← NEW
      metadata: {
        orderId:              existingOrder.orderId ?? existingOrder._id.toString(),
        customerName:         existingOrder.customerName,
        deliveryPartnerName:  actor.actorName,                      // ← NEW: partner's name in metadata
      },
    });
  } else if (status === "Delivered") {
    await createLog({
      ...actor,
      action: ActivityAction.DELIVERY_ORDER_DELIVERED,
      entityId:   orderId.toString(),                               // ← NEW
      entityType: "order",                                           // ← NEW
      metadata: {
        orderId:              existingOrder.orderId ?? existingOrder._id.toString(),
        customerName:         existingOrder.customerName,
        deliveryPartnerName:  actor.actorName,                      // ← NEW
      },
    });
  }

  if (note) {
    await createLog({
      ...actor,
      action: ActivityAction.DELIVERY_NOTE_ADDED,
      entityId:   orderId.toString(),                               // ← NEW
      entityType: "order",                                           // ← NEW
      metadata: {
        orderId:      existingOrder.orderId ?? existingOrder._id.toString(),
        deliveryNote: note,
      },
    });
  }
}
```

---

#### 3G. `src/app/api/orders/revert-delivery/route.ts` — ADD MISSING LOG (currently zero logs)

This route currently has **no activity log call at all**. A delivery revert is a significant event and must be recorded.

After the `order.save()` call and before the `return NextResponse.json(...)`, add:

```ts
// ── Activity Log — currently missing, this is the fix ────────────────────────
try {
  const { createLog, getManagerActor } = await import("@/lib/createLog");
  const { ActivityAction }             = await import("@/models/ActivityLog");
  const actor = await getManagerActor(auth);
  if (actor) {
    await createLog({
      ...actor,
      action:     ActivityAction.ORDER_DELIVERY_REVERTED,  // new action from Phase 1
      entityId:   order._id.toString(),
      entityType: "order",
      metadata: {
        orderId:      order.orderId,
        customerName: order.customerName,
        reason:       "Delivery reverted to Pending by manager/admin",
      },
    });
  }
} catch (logErr) {
  // Log failures must never break the main response
  console.error("[revert-delivery] activity log failed:", logErr);
}
// ─────────────────────────────────────────────────────────────────────────────
```

> Use dynamic imports here because the revert-delivery route currently does not import createLog. Dynamic import keeps the diff small and avoids needing to change the import block at the top of the file.

---

## PHASE 4 — API Query Upgrade (`GET /api/activity-logs`)
**Goal:** Allow the frontend to fetch all logs for a specific entity by passing `?entityId=<id>`. This is the query that powers the "Bill Timeline" drawer.

### Files Affected in Phase 4

| File | What Changes |
|---|---|
| `src/app/api/activity-logs/route.ts` | Parse `entityId` query param and add to filter |

---

### Phase 4 — Step-by-Step Code Changes

#### 4A. `src/app/api/activity-logs/route.ts`

In the "Parse query params" section, after the `endDate` parsing (around line 7980), add:

```ts
const entityId = searchParams.get("entityId");
if (entityId) filter.entityId = entityId;
```

No other changes. The existing pagination, sort, and auth logic are unchanged.

> **Note:** The entityId filter must go AFTER the manager role restriction. Managers already have `filter.actorRole = "delivery_partner"` forced on them. The entityId filter narrows within that — this is intentional and correct. A manager querying `?entityId=xxx` will only see delivery partner actions on that entity, not manager actions.

---

## PHASE 5 — Frontend UI Upgrade (`ActivityLog.tsx`)
**Goal:** Add an "Entity Timeline" mode to the activity log panel. When an admin clicks on any log row that has an `entityId`, a drawer opens showing ALL events for that document (bill or order) in chronological order with visual connectors.

### Files Affected in Phase 5

| File | What Changes |
|---|---|
| `src/app/dashboard/ActivityLog.tsx` | Add `entityId` to state/query; `entityType` display; "View Timeline" button on rows; `EntityTimeline` drawer component |

---

### Phase 5 — Step-by-Step Code Changes

#### 5A. New state in `ActivityLogPanel`

```ts
// Entity timeline drawer
const [timelineEntityId,   setTimelineEntityId]   = useState<string | null>(null);
const [timelineLogs,       setTimelineLogs]        = useState<IActivityLogEntry[]>([]);
const [timelineLoading,    setTimelineLoading]     = useState(false);
const [timelineEntityType, setTimelineEntityType]  = useState<string>("");
```

#### 5B. New fetch function: `fetchEntityTimeline`

```ts
const fetchEntityTimeline = useCallback(async (entityId: string) => {
  setTimelineLoading(true);
  try {
    const params = new URLSearchParams({ entityId, limit: "50" });
    const res = await fetch(`/api/activity-logs?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch entity logs");
    const data: IActivityLogsResponse = await res.json();
    // Sort ascending for timeline (oldest first)
    setTimelineLogs([...data.logs].reverse());
  } catch {
    setTimelineLogs([]);
  } finally {
    setTimelineLoading(false);
  }
}, []);
```

#### 5C. Updated `LogRow` — add "Timeline" button

On each `LogRow`, if `log.entityId` is present, show a small "View timeline" link button. When clicked:
```ts
onClick={() => {
  setTimelineEntityId(log.entityId!);
  setTimelineEntityType(log.entityType ?? "");
  fetchEntityTimeline(log.entityId!);
}}
```

#### 5D. New `EntityTimeline` drawer component (inline, no new file)

This is a slide-in panel rendered at the bottom of `ActivityLogPanel`'s JSX:

```tsx
{timelineEntityId && (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
       onClick={() => setTimelineEntityId(null)}>
    <div className="relative bg-white w-full sm:max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-xl
                    overflow-y-auto shadow-2xl p-0"
         onClick={(e) => e.stopPropagation()}>

      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {timelineEntityType === "bill" ? "Bill Timeline" : "Order Timeline"}
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{timelineEntityId}</p>
        </div>
        <button onClick={() => setTimelineEntityId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline body */}
      <div className="px-5 py-4">
        {timelineLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : timelineLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No events found.</p>
        ) : (
          <ol className="relative border-l-2 border-slate-100 ml-2 space-y-5">
            {timelineLogs.map((log, idx) => {
              const cfg = CATEGORY_CONFIG[log.category];
              return (
                <li key={log._id} className="ml-4">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white
                                    flex items-center justify-center ${cfg.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  </span>

                  {/* Event card */}
                  <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-sm text-slate-800 leading-snug">{log.message}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={log.category} />
                      <span className="text-[11px] text-slate-400">
                        {formatExactTime(log.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ActorAvatar name={log.actorName} role={log.actorRole} />
                      <span className="text-xs text-slate-600 font-medium">{log.actorName}</span>
                      <RoleBadge role={log.actorRole} />
                    </div>
                    {/* Show key metadata inline */}
                    {log.metadata?.previousTotal !== undefined && log.metadata?.newTotal !== undefined && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Total: ₹{Number(log.metadata.previousTotal).toLocaleString("en-IN")}
                        {" → "}
                        ₹{Number(log.metadata.newTotal).toLocaleString("en-IN")}
                      </p>
                    )}
                    {log.metadata?.deliveryPartnerName && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Delivery by: {String(log.metadata.deliveryPartnerName)}
                      </p>
                    )}
                  </div>

                  {/* Connector label between events */}
                  {idx < timelineLogs.length - 1 && (
                    <p className="text-[10px] text-slate-300 ml-0.5 mt-1">↓</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  </div>
)}
```

#### 5E. Updated `LogRow` — show "View timeline →" link

Add this inside the `<div className="min-w-0">` block of `LogRow`, after `<ChangedFieldsPill>`:

```tsx
{log.entityId && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setTimelineEntityId(log.entityId!);
      setTimelineEntityType(log.entityType ?? "");
      fetchEntityTimeline(log.entityId!);
    }}
    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600
               hover:text-blue-800 hover:underline"
  >
    View full timeline →
  </button>
)}
```

> `setTimelineEntityId` and `fetchEntityTimeline` need to be lifted out of the parent component and passed as props to `LogRow`, or `LogRow` can be converted to a closure inside `ActivityLogPanel` where those state setters are in scope. The second approach is simpler — just move the `LogRow` function body inside `ActivityLogPanel` or pass props explicitly.

---

## PHASE 6 — Message Quality (Log Descriptions)
**Goal:** The `message` field in every log should be a clear, human-readable sentence — not a debug string. This phase defines the exact message format for each action.

**No new files.** This phase is about what string gets passed to `createLog({ message: "..." })` in each route.

### Files Affected in Phase 6

All the same routes from Phase 3, plus any other route calling `createLog`.

---

### Phase 6 — Message Format Standards

These messages are written in your `createLog` call as the `message` field. The `actor.message` default (if one exists in `createLog.ts`) should be overridden here with these specific strings.

| Action | Message Template |
|---|---|
| `BILL_GENERATED` | `"Bill #{{serialNumber}} generated for {{customerName}} — ₹{{total}}"` |
| `BILL_EDITED` | `"Bill #{{serialNumber}} edited — total changed from ₹{{previousTotal}} to ₹{{newTotal}}"` |
| `ORDER_CREATED` | `"Order created for {{customerName}} — ₹{{total}}"` |
| `ORDER_EDITED` | `"Order {{orderId}} edited for {{customerName}}"` |
| `ORDER_DISCARDED` | `"Order {{orderId}} discarded"` |
| `ORDER_SETTLED_CASH` | `"Order {{orderId}} settled via Cash — ₹{{amountPaid}} received"` |
| `ORDER_SETTLED_BANK_UPI` | `"Order {{orderId}} settled via Bank/UPI — ₹{{amountPaid}} received"` |
| `ORDER_DEBT_SETTLED` | `"Order {{orderId}} debt cleared via {{settlementMethod}} — ₹{{amountPaid}} paid"` |
| `ORDER_DELIVERY_STATUS_CHANGED` | `"Order {{orderId}} delivery: {{oldStatus}} → {{newStatus}}"` |
| `ORDER_DELIVERY_REVERTED` | `"Order {{orderId}} delivery reverted to Pending"` |
| `DELIVERY_ORDER_ACCEPTED` | `"Order {{orderId}} picked up — delivery started for {{customerName}}"` |
| `DELIVERY_ORDER_DELIVERED` | `"Order {{orderId}} delivered to {{customerName}}"` |
| `DELIVERY_NOTE_ADDED` | `"Note added to order {{orderId}}: {{note}}"` |
| `PRODUCT_EDITED` | `"Product '{{productName}}' details updated"` |
| `PRODUCT_DELETED` | `"Product '{{productName}}' deleted from inventory"` |
| `PRODUCT_RESTOCKED` | `"{{productName}} restocked: +{{quantityAdded}} units (new total: {{newTotal}})"` |

> In your `createLog` call in each route, compute this string and pass it as `message`. Interpolate the real values — do not pass a template string with `{{}}` literally.

**Example for `BILL_GENERATED`:**
```ts
await createLog({
  ...actor,
  action:     ActivityAction.BILL_GENERATED,
  entityId:   bill._id.toString(),
  entityType: "bill",
  message:    `Bill #${bill.serialNumber} generated for ${bill.billingCustomer?.name} — ₹${bill.grandTotal.toLocaleString("en-IN")}`,
  metadata: { ... },
});
```

---

## CONSOLIDATED FILE-CHANGE MATRIX

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|---|---|---|---|---|---|---|
| `src/models/ActivityLog.ts` | ✅ schema + enum | — | — | — | — | — |
| `src/types/activityLog.type.ts` | ✅ sync types | — | — | — | — | — |
| `src/lib/createLog.ts` | — | ✅ new params | — | — | — | — |
| `src/app/api/bills/route.ts` | — | — | ✅ POST + PUT | — | — | ✅ messages |
| `src/app/api/orders/route.ts` | — | — | ✅ PATCH x3 | — | — | ✅ messages |
| `src/app/api/delivery/update-order-status/route.ts` | — | — | ✅ all log blocks | — | — | ✅ messages |
| `src/app/api/orders/revert-delivery/route.ts` | — | — | ✅ **ADD missing log** | — | — | ✅ message |
| `src/app/api/activity-logs/route.ts` | — | — | — | ✅ entityId filter | — | — |
| `src/app/dashboard/ActivityLog.tsx` | — | — | — | — | ✅ timeline drawer | — |

**Total files touched: 9. New files created: 0. Deleted files: 0.**

---

## IMPLEMENTATION ORDER

Execute strictly in this order. Each phase depends on the previous one.

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5  →  Phase 6
  ↓              ↓            ↓           ↓             ↓            ↓
Schema      createLog     Routes      API GET        UI           Messages
  (model)   (helper)    (log calls)  (filter)    (timeline)     (quality)
```

**Why this order matters:**
- Phase 3 routes call `createLog` with new params → createLog must accept them (Phase 2) before Phase 3.
- Phase 4 API filter requires `entityId` indexed in MongoDB → Phase 1 schema index must exist first.
- Phase 5 UI calls `GET /api/activity-logs?entityId=...` → Phase 4 filter must exist first.
- Phase 6 messages can be written at the same time as Phase 3 (same files) — the separation is conceptual only. In practice, do Phase 3 + Phase 6 together.

---

## ACCEPTANCE CRITERIA (Test Each Phase)

### After Phase 1
- [ ] TypeScript compiles with no errors after adding the new fields to the schema and interface
- [ ] MongoDB creates the new `entityId` + `entityType` fields (verify with MongoDB Compass or Atlas)
- [ ] The new compound index `{ adminId, entityId, createdAt }` is visible in Atlas indexes

### After Phase 2
- [ ] `createLog({ ..., entityId: "abc", entityType: "bill" })` compiles without TS errors
- [ ] Passing no `entityId` still works (backward compat with existing calls)

### After Phase 3
- [ ] Generate a bill → check the ActivityLog collection → the document has `entityId === bill._id.toString()`, `entityType === "bill"`, `action === "BILL_GENERATED"`
- [ ] Edit the same bill → check the new log → `action === "BILL_EDITED"`, `metadata.previousTotal` and `metadata.newTotal` are correct numbers
- [ ] Change delivery status from dashboard → log has `entityId === order._id.toString()`
- [ ] Revert delivery → a log entry with `action === "ORDER_DELIVERY_REVERTED"` now exists (previously zero)
- [ ] Delivery partner accepts an order → log has `metadata.deliveryPartnerName` set correctly

### After Phase 4
- [ ] `GET /api/activity-logs?entityId=<bill_id>` returns only logs for that bill
- [ ] `GET /api/activity-logs?entityId=<order_id>` returns delivery + settlement logs for that order
- [ ] `GET /api/activity-logs` without `entityId` still returns all logs (no regression)

### After Phase 5
- [ ] Clicking "View timeline →" on a log row opens the drawer
- [ ] The drawer shows all events for that bill/order in chronological order (oldest first)
- [ ] Bill timeline shows: GENERATED → EDITED (if applicable) → delivery events
- [ ] Total change (`₹1,200 → ₹1,050`) is visible inline in the BILL_EDITED event
- [ ] Clicking outside the drawer closes it
- [ ] The drawer works on mobile (bottom sheet style)

### After Phase 6
- [ ] Every log `message` is a clean human sentence like "Bill #260501 generated for Ravi Enterprises — ₹1,200"
- [ ] No log message contains raw object references, ObjectId strings, or undefined values

---

## CRITICAL NOTES FOR IMPLEMENTATION

1. **Do not break existing log calls.** Every `createLog(...)` call that currently exists must still compile and work. Phases 1 and 2 are additive-only.

2. **The `entityId` is the MongoDB `_id`, not the human-readable `orderId`/`serialNumber`.** The human-readable IDs go in `metadata` for display. The `entityId` is used only for filtering — it must be the `_id` because that never changes and is indexed.

3. **The revert-delivery log (Phase 3G) is the most important missing piece.** Currently a full delivery revert leaves zero trace. This is a data integrity gap. Fix it first in Phase 3 if you need to prioritize.

4. **The `BILL_EDITED` action fix (Phase 3B) is a semantic fix.** The current code fires `ORDER_EDITED` when a BILL is edited. This is incorrect and causes confusion when filtering. After Phase 3B, `ORDER_EDITED` will only fire when an order is directly edited (not via the billing UI).

5. **TTL is untouched at 90 days.** The timeline drawer will show gaps for events older than 90 days — this is expected and acceptable.

6. **createLog must never throw.** Always wrap the log call in a try/catch (or wrap inside createLog itself) so a log failure never breaks the main API response. The revert-delivery route example in Phase 3G shows the correct pattern.

---

## WHAT YOU GET AT THE END

After all 6 phases:

1. **Every bill has a complete story:** Generated by X → Edited by Y (total changed) → Delivery accepted by Z → Delivered.

2. **One-click timeline:** Click any log row → see every event on that document in chronological order with actor names, timestamps, and change diffs.

3. **Proper audit trail:** `ORDER_DELIVERY_REVERTED` is now recorded. `BILL_EDITED` is semantically distinct from `ORDER_EDITED`. No more random disconnected log orphans.

4. **Zero new files.** Zero new API routes. Zero new DB collections. 9 files touched, all existing.