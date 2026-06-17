# ICE SAATHI — Professional SaaS UI Renovation Plan
## `implementation_third.md`
### Final Phase: Complete Content Polish — Zero Functionality Changes

---

## 0. CONTEXT: WHERE PHASES 1 & 2 LEFT USs

### What Phases 1 & 2 (ui_implementation.md) Completed
| Phase | What was done |
|---|---|
| **Phase 1** | `DashboardNavbar` converted from horizontal header → fixed left sidebar. Mobile drawer added. `dash-content-offset` class added to 13 page wrappers. |
| **Phase 2** | Subsidebar groups added for **Stocks** (Overview / Restock / History) and **Profile** (11 sub-links). `profile/page.tsx` reads `?tab=` from URL via `useSearchParams`. |
| **Phase 3** | Tab strip (Overview / Restock / History) added to `stocks/page.tsx`, `stocks/restock/page.tsx`, `stocks/history/page.tsx`. |

### What Phases 1–5 (implementation_second.md) Completed
| Phase | What was done |
|---|---|
| **Phase 1** | Global CSS design system: Inter font, scrollbar fix, `.page-wrapper`, `.page-header`, `.saas-card`, `.btn*`, `.stat-card*`, `.saas-table`, `.badge*`, `.dash-mobile-topbar` hide on desktop. |
| **Phase 2** | Page headers applied to: `dashboard/page.tsx`, `products/page.tsx`, `stocks/page.tsx`, `stocks/restock/page.tsx`, `stocks/history/page.tsx`, `customers/page.tsx`, `customers/[customerId]/history/page.tsx`. |
| **Phase 3** | Transactional pages: `orders/page.tsx`, `billing/page.tsx`, `delivery-requests/page.tsx`, `delivery/live-map/page.tsx` — page headers + emoji button cleanup. |
| **Phase 4** | Profile page inner sidebar removed → horizontal tabs. `sales/page.tsx` page header added. |
| **Phase 5** | Sidebar polish: section labels (Main / Inventory / Operations), active link accent bar, Profile expand group in footer, unused `activeTab` state removed from `DashboardNavbar.tsx`. |

---

## 1. WHAT STILL NEEDS TO BE DONE (THE AUDIT)

After all prior phases, the following issues remain. These are the focus of **implementation_third.md**.

| Problem | Affected Files | Why It Hurts |
|---|---|---|
| **Sub-components use inconsistent card styling** | `ActivityLog.tsx`, `LowStockAlerts.tsx`, `CustomerOverview.tsx`, `DeliveryOverview.tsx`, `DeliveryPartnerOverview.tsx`, `MostPopularProducts.tsx` | Dashboard widgets use inline Tailwind `shadow-sm border-gray-100 rounded-xl` — should all use `.saas-card` |
| **Profile sub-component buttons still use old ad-hoc styles** | `BasicInformationComponent.tsx`, `BillingDetailsComponent.tsx`, `BankDetailsComponent.tsx`, `SerialNumberComponent.tsx`, `ProductSettingsComponent.tsx`, `ManagerComponent.tsx` | Mixed `bg-blue-600 hover:bg-blue-700 rounded` vs `bg-indigo-600 hover:bg-indigo-700 rounded` vs `border rounded` — no `.btn` system used |
| **`save Changes` still uses emoji** | `BasicInformationComponent.tsx` | "💾 Save Changes" — violates the no-emoji button rule from Phase 3 |
| **Subscription page (`/dashboard/subscription/page.tsx`) never touched** | `subscription/page.tsx` | Not in any previous plan. Renders with no `.page-header`, no `.saas-card`, raw inline styling. |
| **Sales Insights page header inconsistent** | `sales/SalesInsights.tsx` | Phase 4 from `implementation_second.md` says to apply header to `sales/page.tsx` — but `sales/page.tsx` only renders `<SalesInsights />`. The actual page wrapper and header is INSIDE `SalesInsights.tsx` — this was missed. |
| **Delivery live-map sub-page (`[partnerId]/page.tsx`) lacks a page header** | `delivery/live-map/[partnerId]/page.tsx` | Only `live-map/page.tsx` (the list) got a header; the individual partner map page has none. |
| **Delivery Requests page missing stat cards** | `delivery-requests/page.tsx` | Phase 3 added a page header but the stat area at top (total requests, pending, approved, rejected) uses raw `<div>` cards, not `.stat-card` class. |
| **Orders page tab strip is inconsistent with rest** | `orders/page.tsx` | Tab buttons (Unsettled, Settled, Debt, Discarded) use custom inline classes — not the `.btn .btn-primary .btn-sm` system. |
| **Customer History page header action button style** | `customers/[customerId]/history/page.tsx` | Back button uses ad-hoc Tailwind inline classes, not `.btn .btn-secondary`. |
| **`billing/page.tsx` bottom action buttons** | `billing/page.tsx` | Phase 3 of `implementation_second.md` moves Reset + Save Draft to page header, but the bottom of billing still has the old emoji buttons (`✅ Prepare Bill`, `📄 Export PDF`) that were planned for cleanup but the specific component (`BillingConfirmDialog.tsx`'s trigger in `page.tsx`) was not addressed. |
| **Profile page tab strip spacing** | `profile/page.tsx` | `implementation_second.md` Phase 4 says replace inner sidebar with horizontal tabs. The tabs now work (via `?tab=` param in Phase 2 of `ui_implementation.md`), but the visual tab strip wrapper is not yet using `.saas-card .saas-card-compact`. |
| **`globals.css` missing `.dash-section-label` color** | `globals.css` | Phase 5 of `implementation_second.md` defines this class, but the color value `rgba(148,163,184,0.7)` may clash if it was already defined by Phase 1 of `ui_implementation.md` as `#475569`. One needs to win; we standardize to `rgba(148,163,184,0.7)` (softer on dark background). |
| **`stocks/layout.tsx` not using `.page-wrapper`** | `stocks/layout.tsx` | The stocks sub-pages (`restock/page.tsx`, `history/page.tsx`) render inside `stocks/layout.tsx`. That layout uses its own wrapper padding that may conflict with `.page-wrapper` added to sub-pages. |

---

## 2. GROUND RULES (SAME AS BOTH PREVIOUS DOCUMENTS)

| Rule | Detail |
|---|---|
| **Zero functionality changes** | No API calls, form handlers, state logic, business logic, modals, or data-fetching is touched. |
| **No new files** | All changes are in-place edits to existing files. |
| **No option interchange** | All buttons, tabs, links, form fields remain. We restyle them, not remove them. |
| **Backend untouched** | No `api/`, `models/`, `lib/`, `services/`, `types/` changes. |
| **UI-only files touched** | Only `src/app/` frontend files (pages, components, dashboard sub-components, globals.css). |
| **Additive CSS only** | All CSS additions to `globals.css` are appended — nothing existing is removed. |

---

## 3. FILES AFFECTED IN THIS DOCUMENT

```
src/app/globals.css                                                    ← Phase A (CSS additions)
src/app/dashboard/billing/page.tsx                                     ← Phase A (bottom action buttons)
src/app/dashboard/profile/page.tsx                                     ← Phase A (tab strip card wrapper)
src/app/dashboard/orders/page.tsx                                      ← Phase A (tab strip btn classes)
src/app/dashboard/customers/[customerId]/history/page.tsx              ← Phase A (back button)
src/app/dashboard/delivery-requests/page.tsx                           ← Phase A (stat cards)
src/app/dashboard/delivery/live-map/[partnerId]/page.tsx               ← Phase A (page header)
src/app/dashboard/subscription/page.tsx                                ← Phase B (full page header + saas-card)
src/app/dashboard/sales/SalesInsights.tsx                              ← Phase B (page-wrapper + page-header)
src/app/dashboard/ActivityLog.tsx                                      ← Phase C (saas-card class)
src/app/dashboard/LowStockAlerts.tsx                                   ← Phase C (saas-card class)
src/app/dashboard/CustomerOverview.tsx                                 ← Phase C (saas-card class)
src/app/dashboard/DeliveryOverview.tsx                                 ← Phase C (saas-card class)
src/app/dashboard/DeliveryPartnerOverview.tsx                          ← Phase C (saas-card class)
src/app/dashboard/profile/BasicInformationComponent.tsx                ← Phase D (btn classes, emoji)
src/app/dashboard/profile/BillingDetailsComponent.tsx                  ← Phase D (btn classes)
src/app/dashboard/profile/BankDetailsComponent.tsx                     ← Phase D (btn classes)
src/app/dashboard/profile/SerialNumberComponent.tsx                    ← Phase D (btn classes)
src/app/dashboard/profile/ProductSettingsComponent.tsx                 ← Phase D (btn classes)
src/app/dashboard/profile/ManagerComponent.tsx                         ← Phase D (btn classes)
```

**Total: 21 files — all already exist. 0 created. 0 deleted.**

---

## PHASE A — Loose-End Fixes: Pages That Were Partially Done

**Goal:** Complete the UI cleanup on pages that were targeted in `implementation_second.md` Phases 3–5 but had items missed.

---

### Phase A.1 — FILE: `src/app/globals.css`

Two additive fixes:

#### A.1.1 — Standardize `.dash-section-label` color (de-conflict)

`implementation_second.md` Phase 5 may have defined `.dash-section-label` with `color: #475569` (from the first code block), then immediately after defined it again with `color: rgba(148,163,184,0.7)`. The second definition must win (it's softer on the dark sidebar background). Append an override to ensure the correct color:

```css
/* implementation_third.md — Phase A.1.1 */
/* Ensure dash-section-label uses the sidebar-appropriate color */
.dash-section-label {
  color: rgba(148, 163, 184, 0.7);
}
```

#### A.1.2 — Add `.form-input` and `.form-label` utility classes

Profile sub-components (`BasicInformationComponent`, `BillingDetailsComponent`, etc.) repeat the same input/label styles inline. Adding these as global classes lets Phase D use them cleanly without touching any logic:

```css
/* ── Form utilities (used by profile sub-components) ────────────────── */
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 5px;
}
.form-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13.5px;
  color: #111827;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}
.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.form-input::placeholder { color: #9ca3af; }
.form-input:disabled { background: #f9fafb; color: #6b7280; cursor: not-allowed; }
.form-textarea {
  resize: vertical;
  min-height: 80px;
}
```

**Phase A.1 — Files affected:** `src/app/globals.css` (additive, appended)

---

### Phase A.2 — FILE: `src/app/dashboard/billing/page.tsx`

**Problem:** Phase 3 of `implementation_second.md` moved Reset and Save Draft buttons to the page header. However, at the **bottom** of the billing form, the buttons that trigger `<BillingConfirmDialog>` and PDF export still use emoji: `✅ Prepare Bill` and `📄 Export PDF`. These are buttons inside `billing/page.tsx`'s JSX (not inside `BillingConfirmDialog.tsx` itself).

**What changes (JSX only — no logic):**

Locate the bottom action button row in `billing/page.tsx`. It currently looks like:

```tsx
// BEFORE — bottom action buttons in billing/page.tsx
<button onClick={() => setShowResetDialog(true)} className="...some inline classes...">
  🔄 Reset Form
</button>
<button onClick={saveDraft} className="...some inline classes...">
  💾 Save Draft
</button>
<button onClick={() => setShowConfirmDialog(true)} className="...some inline classes...">
  ✅ Prepare Bill
</button>
<button onClick={handleExportPdf} className="...some inline classes...">
  📄 Export PDF
</button>
```

**AFTER — same buttons, no emoji, use design system classes:**

```tsx
// AFTER — same onClick handlers, same disabled logic, just className + content changed
<button onClick={() => setShowResetDialog(true)} className="btn btn-secondary btn-sm">
  <RotateCcw size={14} /> Reset Form
</button>
<button onClick={saveDraft} className="btn btn-warning btn-sm">
  <Save size={14} /> Save Draft
</button>
<button onClick={() => setShowConfirmDialog(true)} className="btn btn-success btn-sm">
  <CheckCircle size={14} /> Prepare Bill
</button>
<button onClick={handleExportPdf} className="btn btn-primary btn-sm">
  <FileDown size={14} /> Export PDF
</button>
```

**Icon imports** — add to the existing `lucide-react` import line (which already has other icons):
```tsx
// Add to existing: import { ..., RotateCcw, Save, CheckCircle, FileDown } from "lucide-react";
```

> **Critical note:** `<BillingHeader>`, `<BillingCustomerSection>`, `<BillingItemsTable>`, `<PdfExportComponent>`, `<BillingConfirmDialog>` — **all untouched.** Only the outer wrapper `<button>` elements in `billing/page.tsx`'s own JSX are changed. If `saveDraft`, `handleExportPdf`, `setShowConfirmDialog`, `setShowResetDialog` are the existing handler names, use those names exactly — do not rename anything.

---

### Phase A.3 — FILE: `src/app/dashboard/profile/page.tsx`

**Problem:** `implementation_second.md` Phase 4 says "Replace inner aside with horizontal tab strip." `ui_implementation.md` Phase 2 adds `useSearchParams` to seed `activeTab`. But the **visual tab strip wrapper** is not yet using `.saas-card .saas-card-compact`. The tabs render as plain buttons in an unstyled `<div>`.

**What changes (1 className addition on the tab strip wrapper):**

```tsx
// BEFORE:
<div className="flex flex-wrap gap-2 overflow-x-auto mb-6">
  {navItems.map((item) => (
    <button key={item.tab} onClick={() => handleTabChange(item.tab)} className={`...`}>

// AFTER:
<div className="saas-card saas-card-compact mb-6">
  <div className="flex flex-wrap gap-2 overflow-x-auto">
    {navItems.map((item) => (
      <button key={item.tab} onClick={() => handleTabChange(item.tab)} className={`btn btn-sm ${activeTab === item.tab ? 'btn-primary' : 'btn-secondary'}`}>
        {item.icon && <span className="mr-1">{item.icon}</span>}
        {item.label}
      </button>
    ))}
  </div>
</div>
```

The `navItems` array, `activeTab` state, `handleTabChange` function, tab content (`{renderTabContent()}`) — **all unchanged.** Only the wrapper `div`'s className and each button's `className` change. The `item.icon` rendering should use the icon element already returned by each `navItems` entry's icon property.

---

### Phase A.4 — FILE: `src/app/dashboard/orders/page.tsx`

**Problem:** The four order tab buttons (Unsettled / Settled / Debt / Discarded) use inline Tailwind classes like `px-4 py-2 rounded-full border font-medium text-sm ...` with conditional active/inactive colors. These should use `.btn .btn-sm` system.

**What changes (className update on tab buttons only):**

```tsx
// BEFORE (example for one tab button — same pattern for all 4):
<button
  onClick={() => setActiveTab("Unsettled")}
  className={`px-4 py-2 rounded-full border font-medium text-sm transition-all ${
    activeTab === "Unsettled"
      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
      : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-gray-200"
  }`}
>
  Unsettled
</button>

// AFTER (same onClick, same activeTab logic — only className):
<button
  onClick={() => setActiveTab("Unsettled")}
  className={`btn btn-sm ${activeTab === "Unsettled" ? "btn-primary" : "btn-secondary"}`}
>
  Unsettled
</button>
```

Apply this pattern to all 4 tab buttons: `Unsettled`, `Settled`, `Debt`, `Discarded`.

**Tab strip wrapper** — wrap the tab button row in `.saas-card .saas-card-compact` if not already wrapped in a card:

```tsx
// BEFORE:
<div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
  {/* 4 tab buttons */}
</div>

// AFTER:
<div className="saas-card saas-card-compact mb-6">
  <div className="flex flex-wrap gap-2 sm:gap-3">
    {/* 4 tab buttons — same buttons, only className changed per above */}
  </div>
</div>
```

> **No change to:** order fetching, `OrderList`, `OrderCard`, `OrderModals`, pagination, sort controls, search input, `DiscardConfirmationModal`, `RevertDeliveryModal`. Only the 4 tab `<button>` elements and their wrapper `<div>` change.

---

### Phase A.5 — FILE: `src/app/dashboard/customers/[customerId]/history/page.tsx`

**Problem:** `implementation_second.md` Phase 2.7 targeted this file for a standard `page-header`. The back button was left as "converted to `btn btn-secondary btn-sm`" but this specific styling may not have been applied.

**What changes (page header + back button):**

The existing page header in `customers/[customerId]/history/page.tsx` likely has an `<ArrowLeft>` back button with inline classes. Update it to:

```tsx
// AFTER — standard page-header with back button in actions:
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">Customer History</h1>
    <p className="page-subtitle">
      {customerName ? `Transaction history for ${customerName}` : "Order and payment history"}
    </p>
  </div>
  <div className="page-header-actions">
    <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
      <ArrowLeft size={14} /> Back
    </button>
  </div>
</div>
```

Use whichever navigation call already exists (e.g., `router.back()`, `router.push("/dashboard/customers")`) — do not change the navigation logic, only the button className and label placement.

---

### Phase A.6 — FILE: `src/app/dashboard/delivery-requests/page.tsx`

**Problem:** Phase 3 of `implementation_second.md` only added a `page-header`. The stat area at the top of the delivery requests list (counts of total / pending / approved / rejected) uses raw `<div>` cards. These should use `.stat-card`.

**What changes:**

Find the stat summary cards in `delivery-requests/page.tsx` — they likely look like:

```tsx
// BEFORE (representative pattern):
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
    <p className="text-sm text-gray-500">Total</p>
    <p className="text-2xl font-bold">{total}</p>
  </div>
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
    <p className="text-sm text-gray-500">Pending</p>
    <p className="text-2xl font-bold text-yellow-600">{pending}</p>
  </div>
  {/* ... */}
</div>
```

**AFTER — use `.stat-card` pattern:**

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
  <div className="stat-card">
    <div className="stat-icon-wrap stat-icon-blue">
      <Users size={16} />
    </div>
    <div>
      <p className="stat-label">Total</p>
      <p className="stat-value">{total}</p>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon-wrap stat-icon-amber">
      <Clock size={16} />
    </div>
    <div>
      <p className="stat-label">Pending</p>
      <p className="stat-value">{pending}</p>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon-wrap stat-icon-green">
      <CheckCircle size={16} />
    </div>
    <div>
      <p className="stat-label">Approved</p>
      <p className="stat-value">{approved}</p>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon-wrap stat-icon-red">
      <XCircle size={16} />
    </div>
    <div>
      <p className="stat-label">Rejected</p>
      <p className="stat-value">{rejected}</p>
    </div>
  </div>
</div>
```

**Icons to add to existing import** (add to the existing `lucide-react` import — whichever of these are not already imported):
```tsx
// Add to existing lucide-react import: Users, Clock, CheckCircle, XCircle
```

Use the actual stat variable names that exist in the file — do not rename them. The stat grid cards, icons, and stat-card class swap are the only changes.

---

### Phase A.7 — FILE: `src/app/dashboard/delivery/live-map/[partnerId]/page.tsx`

**Problem:** `delivery/live-map/page.tsx` (the list) got a page header in Phase 3 of `implementation_second.md`. But the individual partner map page (`[partnerId]/page.tsx`) has no header.

**What changes (page header only — no map logic touched):**

Add a `page-header` block inside `<main>`, before the map renders. The map component, leaflet imports, location tracking `useEffect`, `useRef`, and all map-related state are **unchanged**.

```tsx
// Add this BEFORE the map container div — inside <main>:
<div className="page-wrapper pb-0">
  <div className="page-header">
    <div className="page-header-left">
      <h1 className="page-title">
        {partnerName ? `${partnerName} — Live Location` : "Partner Live Map"}
      </h1>
      <p className="page-subtitle">Real-time location tracking for this delivery partner</p>
    </div>
    <div className="page-header-actions">
      <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
        <ArrowLeft size={14} /> Back to Map List
      </button>
    </div>
  </div>
</div>
```

Use whatever variable holds the partner's name in this page (check the file for `partner.name`, `partnerData.name`, or similar). The `router.back()` call matches how the current back navigation works (if a `router.push(...)` is currently used as the back button, keep that same destination — only change the className to `btn btn-secondary btn-sm` and the wrapper to the `page-header` pattern).

---

### Phase A — Files affected (summary)
1. `src/app/globals.css` — 2 additive CSS blocks (`.dash-section-label` color override + `.form-label`/`.form-input`/`.form-textarea` utilities)
2. `src/app/dashboard/billing/page.tsx` — 4 bottom button classNames + emoji removal + 4 lucide icon imports
3. `src/app/dashboard/profile/page.tsx` — Tab strip wrapper → `.saas-card .saas-card-compact`, tab buttons → `.btn .btn-sm .btn-primary/.btn-secondary`
4. `src/app/dashboard/orders/page.tsx` — 4 tab button classNames + tab wrapper card
5. `src/app/dashboard/customers/[customerId]/history/page.tsx` — page-header + back button className
6. `src/app/dashboard/delivery-requests/page.tsx` — stat card grid using `.stat-card` pattern
7. `src/app/dashboard/delivery/live-map/[partnerId]/page.tsx` — page header block added

### Phase A — Acceptance checklist
- [ ] Billing page bottom has 4 icon+text buttons with no emoji; clicking each triggers the same dialogs/actions as before
- [ ] Profile page tab strip is wrapped in a white card; clicking tabs navigates correctly
- [ ] Orders page tab strip uses `btn btn-primary` for active tab, `btn btn-secondary` for inactive — existing tab click logic unchanged
- [ ] Customer history page has a standard page header with a Back button that navigates correctly
- [ ] Delivery requests page shows 4 stat cards with icons, same count values as before
- [ ] Individual partner map page shows a page header and back button above the map; map renders identically

---

## PHASE B — Untouched Pages: Subscription + Sales Insights

**Goal:** Apply the design system to the two pages that were explicitly scoped out or missed in both prior documents.

---

### Phase B.1 — FILE: `src/app/dashboard/subscription/page.tsx`

**Background:** This page was listed as "out of scope" in `ui_implementation.md` §0.1 (noted as "non-UTF8/near-empty file — 3 bytes"). However, looking at the codebase structure and the `ISubscriptionStatusResponse` type, it is clear this file has grown significantly or is now the actual subscription management page. This phase addresses whatever the current file contains.

> **If `subscription/page.tsx` is still empty/minimal:** Add a proper placeholder with page header and a card telling the user to visit Profile → Subscription tab.
> **If `subscription/page.tsx` has a full UI:** Apply the `page-wrapper`, `page-header`, and `.saas-card` pattern throughout.

**Pattern to apply (choose whichever applies based on actual file content):**

**Case 1 — File is empty/minimal (likely scenario given prior audit):**
```tsx
// Replace the placeholder content (if any) with:
return (
  <div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
    <DashboardNavbar />
    <main className="flex-grow">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Subscription</h1>
            <p className="page-subtitle">Manage your plan, billing, and add-ons</p>
          </div>
        </div>
        <div className="saas-card">
          <p className="text-slate-600 text-sm">
            Subscription details are available under{" "}
            <a href="/dashboard/profile?tab=subscription" className="text-blue-600 underline font-medium">
              Profile → Subscription
            </a>.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);
```

**Case 2 — File has actual subscription content:**

Apply this wrapper pattern to whatever content already exists:

```tsx
// Outer wrapper:
<div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
  <DashboardNavbar />
  <main className="flex-grow">
    <div className="page-wrapper">

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Subscription & Billing</h1>
          <p className="page-subtitle">
            {subscription ? `${subscription.planName} plan · ${subscription.status}` : "Manage your subscription"}
          </p>
        </div>
        <div className="page-header-actions">
          {/* Keep any existing action buttons here — just restyle with btn classes */}
        </div>
      </div>

      {/* All existing content below — wrapped in saas-card where appropriate */}
      {/* Plan info card: */}
      <div className="saas-card mb-6">
        {/* existing plan info JSX — unchanged */}
      </div>

      {/* Usage card: */}
      <div className="saas-card mb-6">
        {/* existing usage/progress bars JSX — unchanged */}
      </div>

      {/* Payment history card: */}
      <div className="saas-card">
        {/* existing payment table JSX — unchanged */}
      </div>

    </div>
  </main>
  <Footer />
</div>
```

**All data fetching, `useEffect`, payment handlers, upgrade buttons, and API calls — completely unchanged.** Only the wrapper `<div>` classNames and card wrapper classNames change.

---

### Phase B.2 — FILE: `src/app/dashboard/sales/SalesInsights.tsx`

**Problem:** `implementation_second.md` Phase 4 says "apply page header to `sales/page.tsx`." But `sales/page.tsx` only renders `<SalesInsights />`. The actual UI, title, and all content are inside `SalesInsights.tsx`. That file has its own internal header structure (currently `h1`, date pickers, etc.) that doesn't use `.page-header`.

**What changes (wrapper + page header inside `SalesInsights.tsx`):**

The `SalesInsights.tsx` component currently renders something like:
```tsx
return (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Insights</h1>
          <p className="text-sm text-gray-500">...</p>
        </div>
        <div className="flex items-center gap-3">
          {/* date range picker, export buttons */}
        </div>
      </div>
      {/* charts, stat cards, table */}
    </div>
  </div>
);
```

**AFTER:**
```tsx
return (
  <div className="min-h-screen bg-slate-50">
    <div className="page-wrapper">

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Sales Insights</h1>
          <p className="page-subtitle">
            {summaryData
              ? `Showing data for the selected period`
              : "Analyse your sales trends and top products"}
          </p>
        </div>
        <div className="page-header-actions">
          {/* All existing date pickers + export button stay here — just restyle: */}
          {/* date range inputs: keep as-is (they're <input type="date"> controls) */}
          {/* export button: className="btn btn-secondary btn-sm" */}
        </div>
      </div>

      {/* Stat Cards Row — update to use .stat-card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* existing stat values — same variables, only card wrapper className changes */}
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-blue">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="stat-label">Total Sales</p>
            <p className="stat-value">{totalSales}</p>
          </div>
        </div>
        {/* ... same pattern for other 3 stat cards */}
      </div>

      {/* Charts + table — wrapped in saas-card */}
      <div className="saas-card mb-6">
        {/* existing chart JSX — completely unchanged */}
      </div>

      <div className="saas-card">
        {/* existing table JSX — completely unchanged */}
      </div>

    </div>
  </div>
);
```

All `useEffect`, fetch calls, `recharts` components, date range state, CSV/PDF export logic — **unchanged.** Only classNames on wrapper divs and the header structure change.

Note: `SalesInsights.tsx` is a sub-component rendered by `sales/page.tsx`. It does NOT itself render `<DashboardNavbar />` or `<Footer />` — those are in the parent `page.tsx`. The `min-h-screen` is optional inside a sub-component; if it conflicts, replace with just the `page-wrapper` div without the `min-h-screen` wrapper.

---

### Phase B — Files affected (summary)
1. `src/app/dashboard/subscription/page.tsx` — page header + saas-card wrapper
2. `src/app/dashboard/sales/SalesInsights.tsx` — page-wrapper + page-header + stat-card + saas-card wrappers

### Phase B — Acceptance checklist
- [ ] `/dashboard/subscription` renders a proper page header and shows content in `.saas-card` styled cards
- [ ] `/dashboard/sales` (which renders `<SalesInsights>`) shows the standard page-header with title "Sales Insights", date controls in the header-actions area, and stat cards using `.stat-card` classes
- [ ] All sales charts, tables, and export functions work identically — no data or interaction changes
- [ ] Subscription payment history, plan info, and upgrade flow work identically

---

## PHASE C — Dashboard Widget Cards: Consistent `.saas-card` Usage

**Goal:** The dashboard sub-components (`ActivityLog.tsx`, `LowStockAlerts.tsx`, `CustomerOverview.tsx`, `DeliveryOverview.tsx`, `DeliveryPartnerOverview.tsx`) each have their own internal card wrapper using inline Tailwind strings like `bg-white rounded-xl shadow-sm border border-gray-100`. Standardise all to use `.saas-card` so the dashboard tab panels look visually uniform.

**Pattern:** In every file, the outermost `return (...)` wrapper `<div>` goes from:
```tsx
// BEFORE (representative — exact classes vary per component):
<div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
```
To:
```tsx
// AFTER:
<div className="saas-card overflow-hidden">
```

The `overflow-hidden` is kept because these components have internal scrollable areas, tables, and charts. All other classes (`w-full` etc.) that are needed for layout are kept.

**Sub-component inner cards** (e.g., the "header" row inside each widget, section dividers) — these may use `border-b border-gray-100` as dividers, which is fine to leave as-is (`.saas-card` only affects the outermost wrapper).

---

### Phase C.1 — FILE: `src/app/dashboard/ActivityLog.tsx`

The component returns a `<div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">` (or similar). Change the outer wrapper className:

```tsx
// BEFORE:
<div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

// AFTER:
<div className="saas-card overflow-hidden" style={{ padding: 0 }}>
```

> **Note on `style={{ padding: 0 }}`:** `.saas-card` adds `padding: 20px` but the `ActivityLog` has its own internal `px-4 py-3` / `px-6 py-4` on its header and list items. Add `style={{ padding: 0 }}` inline (or add a `.saas-card-flush` CSS class in globals.css) to avoid double-padding. All inner padding is already handled by the component's own inner divs.

```css
/* Add to globals.css (appended) — Phase C */
.saas-card-flush { padding: 0; }
```

Then use:
```tsx
<div className="saas-card saas-card-flush overflow-hidden">
```

This applies to **all 5 widget files** in Phase C.

---

### Phase C.2 — FILE: `src/app/dashboard/LowStockAlerts.tsx`

Same pattern as C.1:
```tsx
// AFTER:
<div className="saas-card saas-card-flush overflow-hidden">
```

The internal `px-4 py-4 border-b border-gray-100` header row and the low-stock product list remain **unchanged**.

---

### Phase C.3 — FILE: `src/app/dashboard/CustomerOverview.tsx`

Same pattern:
```tsx
<div className="saas-card saas-card-flush overflow-hidden">
```

---

### Phase C.4 — FILE: `src/app/dashboard/DeliveryOverview.tsx`

Same pattern:
```tsx
<div className="saas-card saas-card-flush overflow-hidden">
```

---

### Phase C.5 — FILE: `src/app/dashboard/DeliveryPartnerOverview.tsx`

Same pattern:
```tsx
<div className="saas-card saas-card-flush overflow-hidden">
```

---

### Phase C — globals.css addition (1 line, appended)
```css
/* Phase C — flush card variant for widget components */
.saas-card-flush { padding: 0; }
```

### Phase C — Files affected (summary)
1. `src/app/globals.css` — `.saas-card-flush` class appended
2. `src/app/dashboard/ActivityLog.tsx` — outermost wrapper class
3. `src/app/dashboard/LowStockAlerts.tsx` — outermost wrapper class
4. `src/app/dashboard/CustomerOverview.tsx` — outermost wrapper class
5. `src/app/dashboard/DeliveryOverview.tsx` — outermost wrapper class
6. `src/app/dashboard/DeliveryPartnerOverview.tsx` — outermost wrapper class

### Phase C — Acceptance checklist
- [ ] Dashboard "Overview" tab shows all 5 widgets in uniform white cards with identical border/shadow treatment
- [ ] No widget has double-padding (inner content not squashed)
- [ ] All activity log entries, low-stock items, customer/delivery counts display correctly
- [ ] `MostPopularProducts.tsx` was already using `bg-white rounded-xl shadow-sm border border-gray-100` — confirm it also gets the same treatment (if `MostPopularProducts.tsx` was missed, apply `.saas-card saas-card-flush overflow-hidden` to its outermost wrapper too)

---

## PHASE D — Profile Sub-Components: Button Standardisation

**Goal:** The 6 profile sub-components (`BasicInformationComponent`, `BillingDetailsComponent`, `BankDetailsComponent`, `SerialNumberComponent`, `ProductSettingsComponent`, `ManagerComponent`) all have inconsistent button styles:
- Some use `bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg`
- Some use `bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded`
- Cancel buttons use `text-gray-700 px-3 py-2 rounded border hover:bg-gray-50`
- One save button uses `"💾 Save Changes"` (emoji)

All save/primary action buttons → `.btn .btn-primary`. All cancel/secondary → `.btn .btn-secondary`. All danger → `.btn .btn-danger`. No emoji.

**Ground rule:** Only `className` and button label text change. All `onClick`, `disabled`, `loading` conditions, and form state remain exactly as-is.

---

### Phase D.1 — FILE: `src/app/dashboard/profile/BasicInformationComponent.tsx`

**Change:** The "Save Changes" button currently uses:
```tsx
// BEFORE:
<button
  onClick={updateProfile}
  disabled={loading || !isChanged}
  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
>
  {loading ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      Saving...
    </span>
  ) : (
    "💾 Save Changes"   {/* ← emoji must go */}
  )}
</button>
```

```tsx
// AFTER:
import { Save } from "lucide-react";  // add to existing lucide-react import

<button
  onClick={updateProfile}
  disabled={loading || !isChanged}
  className="btn btn-primary"
>
  {loading ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      Saving...
    </span>
  ) : (
    <><Save size={14} /> Save Changes</>
  )}
</button>
```

---

### Phase D.2 — FILE: `src/app/dashboard/profile/BillingDetailsComponent.tsx`

This file has buttons for: Save Billing Details, Cancel (in edit mode), and image upload buttons for logo, QR code, and signature.

**Save button:**
```tsx
// BEFORE:
<button onClick={saveBillingDetails} disabled={saveLoading || !isBillDirty} className="inline-flex items-center gap-2 px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 ...">

// AFTER (same onClick, disabled logic, loading state):
<button onClick={saveBillingDetails} disabled={saveLoading || !isBillDirty} className="btn btn-primary">
  {saveLoading ? "Saving..." : "Save Billing Details"}
</button>
```

**Edit button** (pencil icon button that toggles edit mode):
```tsx
// BEFORE: some inline `px-3 py-1.5 rounded border` style
// AFTER:
<button onClick={() => setEditMode(true)} className="btn btn-secondary btn-sm">
  <Edit3 size={14} /> Edit
</button>
```

**Cancel button:**
```tsx
// BEFORE: text-gray-600 inline classes
// AFTER:
<button onClick={cancelEdit} className="btn btn-secondary btn-sm">
  Cancel
</button>
```

Image upload `<label>` wrappers (logo, QR, signature) — these are `<label>` elements styled as buttons because they trigger `<input type="file">`. Change their className too:
```tsx
// BEFORE: inline bg-gray-100 hover:bg-gray-200 rounded px-3 py-2 text-sm
// AFTER:
<label className="btn btn-secondary btn-sm cursor-pointer">
  {uploading.logo ? "Uploading..." : "Upload Logo"}
  <input type="file" className="hidden" onChange={...} accept="image/*" />
</label>
```

---

### Phase D.3 — FILE: `src/app/dashboard/profile/BankDetailsComponent.tsx`

**Save / Update Bank Details button:**
```tsx
// BEFORE:
className={`inline-flex items-center gap-2 px-4 py-2 rounded text-white ${
  bankLoading ? "bg-indigo-400" : isBankDirty ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
}`}

// AFTER (same disabled condition, same onClick):
className="btn btn-primary"
```

**Cancel button (shown when in edit mode):**
```tsx
// BEFORE: className="text-gray-700 px-3 py-2 rounded border hover:bg-gray-50"
// AFTER: className="btn btn-secondary btn-sm"
```

**Edit button** (pencil icon):
```tsx
// BEFORE: inline icon-only button style
// AFTER: className="btn btn-secondary btn-sm"
```

---

### Phase D.4 — FILE: `src/app/dashboard/profile/SerialNumberComponent.tsx`

This component manages serial bill number settings. It has Save/Update buttons.

**Save button:**
```tsx
// BEFORE: bg-blue-600 hover:bg-blue-700 or similar inline style
// AFTER:
className="btn btn-primary btn-sm"
```

**All secondary/cancel actions:**
```tsx
// AFTER: className="btn btn-secondary btn-sm"
```

---

### Phase D.5 — FILE: `src/app/dashboard/profile/ProductSettingsComponent.tsx`

This component manages product categories and units. It has Save/Add/Delete buttons.

**Save/Add buttons (primary):**
```tsx
// AFTER: className="btn btn-primary btn-sm"
```

**Delete category/unit buttons (danger):**
```tsx
// These likely have a red tint — keep the red, standardise:
// AFTER: className="btn btn-danger btn-sm"
```

**Cancel buttons:**
```tsx
// AFTER: className="btn btn-secondary btn-sm"
```

---

### Phase D.6 — FILE: `src/app/dashboard/profile/ManagerComponent.tsx`

This component manages manager accounts. It has: Approve, Reject, Add Manager, Send OTP, etc.

**Approve / positive action buttons:**
```tsx
// AFTER: className="btn btn-success btn-sm"
```

**Reject / remove buttons:**
```tsx
// AFTER: className="btn btn-danger btn-sm"
```

**Add Manager / primary CTA:**
```tsx
// AFTER: className="btn btn-primary btn-sm"
```

**Send OTP / secondary:**
```tsx
// AFTER: className="btn btn-secondary btn-sm"
```

**Cancel:**
```tsx
// AFTER: className="btn btn-secondary btn-sm"
```

---

### Phase D — Files affected (summary)
1. `src/app/dashboard/profile/BasicInformationComponent.tsx` — save button + emoji removal + `Save` icon import
2. `src/app/dashboard/profile/BillingDetailsComponent.tsx` — save/cancel/edit/upload-label buttons
3. `src/app/dashboard/profile/BankDetailsComponent.tsx` — save/cancel/edit buttons
4. `src/app/dashboard/profile/SerialNumberComponent.tsx` — save/cancel buttons
5. `src/app/dashboard/profile/ProductSettingsComponent.tsx` — save/add/delete/cancel buttons
6. `src/app/dashboard/profile/ManagerComponent.tsx` — approve/reject/add/send-otp/cancel buttons

### Phase D — Acceptance checklist
- [ ] No emoji in any profile sub-component button text
- [ ] All primary save buttons are `.btn .btn-primary` (blue, consistent size)
- [ ] All cancel/secondary buttons are `.btn .btn-secondary`
- [ ] All danger actions (reject, delete) are `.btn .btn-danger`
- [ ] No functionality change: clicking each button still triggers the exact same handler as before
- [ ] Disabled states still work (opacity applied via `.btn:disabled { opacity: 0.45 }` in globals.css)
- [ ] Image upload labels in `BillingDetailsComponent` still open the file picker correctly

---

## 4. CONSOLIDATED FILE-CHANGE MATRIX (ALL PHASES)

| File | Phase A | Phase B | Phase C | Phase D |
|---|---|---|---|---|
| `globals.css` | `.dash-section-label` override, `.form-*` utilities | — | `.saas-card-flush` | — |
| `billing/page.tsx` | Bottom 4 buttons: no emoji + btn classes | — | — | — |
| `profile/page.tsx` | Tab strip wrapper `.saas-card` + btn classes | — | — | — |
| `orders/page.tsx` | 4 tab buttons + wrapper `.saas-card` | — | — | — |
| `customers/[customerId]/history/page.tsx` | page-header + back button | — | — | — |
| `delivery-requests/page.tsx` | Stat cards → `.stat-card` | — | — | — |
| `delivery/live-map/[partnerId]/page.tsx` | page-header block | — | — | — |
| `subscription/page.tsx` | — | page-header + `.saas-card` | — | — |
| `sales/SalesInsights.tsx` | — | page-wrapper + page-header + stat-card + saas-card | — | — |
| `ActivityLog.tsx` | — | — | `.saas-card saas-card-flush` on outer wrapper | — |
| `LowStockAlerts.tsx` | — | — | `.saas-card saas-card-flush` on outer wrapper | — |
| `CustomerOverview.tsx` | — | — | `.saas-card saas-card-flush` on outer wrapper | — |
| `DeliveryOverview.tsx` | — | — | `.saas-card saas-card-flush` on outer wrapper | — |
| `DeliveryPartnerOverview.tsx` | — | — | `.saas-card saas-card-flush` on outer wrapper | — |
| `BasicInformationComponent.tsx` | — | — | — | btn classes + emoji removal + Save icon |
| `BillingDetailsComponent.tsx` | — | — | — | btn classes for all buttons/labels |
| `BankDetailsComponent.tsx` | — | — | — | btn classes |
| `SerialNumberComponent.tsx` | — | — | — | btn classes |
| `ProductSettingsComponent.tsx` | — | — | — | btn classes |
| `ManagerComponent.tsx` | — | — | — | btn classes |

**Total unique files: 21. New files: 0. Deleted files: 0.**

---

## 5. IMPLEMENTATION ORDER

Execute phases strictly in order:

1. **Phase A first** — globals.css form utilities must exist before Phase D uses `.form-input/.form-label`. The `.saas-card-flush` must exist before Phase C uses it. Loose-end page fixes first validates the pattern.
2. **Phase B second** — Subscription and Sales are standalone; they don't depend on Phase C or D.
3. **Phase C third** — Dashboard widget cards. `MostPopularProducts.tsx` should also be checked during this phase (it was almost-compliant already).
4. **Phase D last** — Profile sub-components. These are the most numerous but each is a mechanical className swap. Do them last so the test cycle can focus on them together.

---

## 6. WHAT WE ARE EXPLICITLY NOT CHANGING

- Any API route, server action, or database model
- The sidebar structure, collapse behavior, subsidebar groups — all set in `ui_implementation.md`
- The stocks tab strip (Overview / Restock / History) — set in `ui_implementation.md`
- The profile `useSearchParams` tab-seeding — set in `ui_implementation.md`
- The main page headers for Dashboard, Products, Stocks, Customers, Orders, Billing, Delivery Requests, Live Map — all set in `implementation_second.md`
- The inner sidebar removal from Profile — set in `implementation_second.md`
- Section labels in sidebar (Main / Inventory / Operations) — set in `implementation_second.md`
- Any modal, dialog, form validation, or confirmation dialog
- PDF generation components (`BillingConfirmDialog`, `PdfExportComponent`, `HistoryPdfGenerator`, `RestockPdfGenerator`, `CustomerReportPDF`)
- `PlanLimitWarning.tsx`, `UpgradePromptModal.tsx`, `SubscriptionBadge.tsx`
- `AdminNavbar.tsx` and all `/admin/*` routes
- `Footer.tsx`, `Navbar.tsx` (public landing page navbar)
- Any TypeScript types, models, or utility files
- The `stocks/layout.tsx` wrapper (Restock and History pages already render inside it correctly)

---

## 7. COMPLETE FINAL FILE LIST (ALL 3 DOCUMENTS COMBINED)

This is the **complete list of all UI files ever touched across `ui_implementation.md`, `implementation_second.md`, and this document.**

```
SIDEBAR CONVERSION (ui_implementation.md):
  src/app/components/DashboardNavbar.tsx
  src/app/globals.css
  src/app/dashboard/page.tsx
  src/app/dashboard/products/page.tsx
  src/app/dashboard/stocks/page.tsx
  src/app/dashboard/stocks/restock/page.tsx
  src/app/dashboard/stocks/history/page.tsx
  src/app/dashboard/customers/page.tsx
  src/app/dashboard/customers/[customerId]/history/page.tsx
  src/app/dashboard/orders/page.tsx
  src/app/dashboard/delivery-requests/page.tsx
  src/app/dashboard/delivery/live-map/page.tsx
  src/app/dashboard/delivery/live-map/[partnerId]/page.tsx
  src/app/dashboard/profile/page.tsx

CONTENT PAGES POLISH (implementation_second.md):
  src/app/globals.css                  ← (also in above; accumulated additions)
  src/app/dashboard/billing/page.tsx
  src/app/dashboard/sales/SalesInsights.tsx  ← missed in second.md, fixed here

FINAL POLISH (implementation_third.md — this document):
  src/app/globals.css                         ← accumulated final additions
  src/app/dashboard/billing/page.tsx          ← bottom buttons
  src/app/dashboard/profile/page.tsx          ← tab strip card wrapper
  src/app/dashboard/orders/page.tsx           ← tab btn classes
  src/app/dashboard/customers/[customerId]/history/page.tsx  ← back btn
  src/app/dashboard/delivery-requests/page.tsx               ← stat cards
  src/app/dashboard/delivery/live-map/[partnerId]/page.tsx   ← page header
  src/app/dashboard/subscription/page.tsx                    ← full page header
  src/app/dashboard/sales/SalesInsights.tsx                  ← page-wrapper fix
  src/app/dashboard/ActivityLog.tsx
  src/app/dashboard/LowStockAlerts.tsx
  src/app/dashboard/CustomerOverview.tsx
  src/app/dashboard/DeliveryOverview.tsx
  src/app/dashboard/DeliveryPartnerOverview.tsx
  src/app/dashboard/profile/BasicInformationComponent.tsx
  src/app/dashboard/profile/BillingDetailsComponent.tsx
  src/app/dashboard/profile/BankDetailsComponent.tsx
  src/app/dashboard/profile/SerialNumberComponent.tsx
  src/app/dashboard/profile/ProductSettingsComponent.tsx
  src/app/dashboard/profile/ManagerComponent.tsx
```

**Grand total across all 3 documents: ~35 unique files. 0 new files created. 0 files deleted.**

---

## 8. ROLLBACK PLAN

Each phase in this document is independently revertible:

- **Phase A rollback:** Revert the 7 listed files to their pre-Phase-A versions. CSS additions to `globals.css` are harmless if left (unused classes don't affect rendering).
- **Phase B rollback:** Revert `subscription/page.tsx` and `SalesInsights.tsx` only.
- **Phase C rollback:** Revert the 5 widget files' outermost wrapper className from `saas-card saas-card-flush` back to their original inline Tailwind strings. One-line change per file.
- **Phase D rollback:** Revert the 6 profile sub-component files. Each is a mechanical className revert — no logic is involved, so rollback risk is minimal.

No phase in this document touches the sidebar, the subsidebar, or any routing/data-fetching code, so there is zero risk of breaking navigation or API behavior during rollback.

---

## 9. FINAL ACCEPTANCE CHECKLIST (FULL UI REVIEW)

After all phases in all 3 documents are complete, verify:

### Sidebar & Navigation
- [ ] Fixed left sidebar visible on all dashboard pages at ≥1024px
- [ ] Sidebar shows section labels: **Main**, **Inventory**, **Operations** (when expanded)
- [ ] Active nav link has a left cyan accent bar
- [ ] Stocks group expands to show Overview / Restock / History sub-links
- [ ] Profile group in sidebar footer expands to show 11 sub-links
- [ ] Sidebar collapses to 72px icon rail; hovering shows CSS tooltip
- [ ] On mobile (<1024px): dark topbar strip with hamburger; tapping opens full sidebar drawer

### Page Headers
- [ ] **Every** dashboard page (`/dashboard/*`) has a `page-header` with title + subtitle
- [ ] All page headers have action buttons in `page-header-actions` using `.btn` classes
- [ ] No emoji in any button anywhere in the app

### Cards
- [ ] All stat figures use `.stat-card` with `.stat-icon-wrap` colored icon box
- [ ] All content sections use `.saas-card` or `.saas-card saas-card-flush`
- [ ] No mixed `shadow-md` / `shadow-sm` / `shadow-lg` — all use the design system shadow

### Buttons
- [ ] Primary CTAs: `.btn .btn-primary` (blue)
- [ ] Secondary/Cancel: `.btn .btn-secondary` (white with border)
- [ ] Danger: `.btn .btn-danger` (red)
- [ ] Success/Approve: `.btn .btn-success` (green)
- [ ] Warning/Draft: `.btn .btn-warning` (amber)
- [ ] Small buttons use `.btn-sm`; all have icon + text (no icon-only except where icon alone is sufficient)

### Profile Page
- [ ] No inner sidebar — horizontal tab strip at top
- [ ] Tab strip wrapped in `.saas-card .saas-card-compact`
- [ ] Navigating to `/dashboard/profile?tab=bank` opens Bank Details tab directly
- [ ] All 6 sub-components (Basic Info, Bill Details, Bank Details, Product Settings, Managers, Serial Number) use `.btn` classes

### Typography
- [ ] Inter font loaded on all pages
- [ ] Page titles: `page-title` class (20px, font-semibold, slate-900)
- [ ] Subtitles: `page-subtitle` class (13px, slate-600)
- [ ] No `text-xl font-bold text-gray-900` or `text-2xl font-bold` in page headers — all use design system classes

### Responsive
- [ ] All pages readable and usable on 375px (iPhone SE), 768px (iPad), 1440px (desktop)
- [ ] No horizontal scroll on any page at any breakpoint
- [ ] Mobile tab strips scroll horizontally when tabs overflow

### Zero Functionality Regression
- [ ] All modals open and close correctly
- [ ] All forms submit and show success/error toasts
- [ ] All PDF exports work
- [ ] All order actions (Settle, Discard, Delivery Status change) work
- [ ] All stock restock flows work
- [ ] Subscription/upgrade flow works
- [ ] Delivery partner live map renders and tracks correctly
- [ ] Manager approval/rejection works
- [ ] All role-based visibility (admin vs manager) unchanged