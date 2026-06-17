# ICE SAATHI — Professional SaaS UI Renovation Plan
## `implementation_second.md`
### Complete Phase-by-Phase UI Overhaul | Design Only — Zero Functionality Changes

---

## 0. AUDIT: WHAT IS WRONG WITH THE CURRENT UI

After converting the navbar to a sidebar, the content area inherited several legacy issues that make it feel unpolished:

| Problem | Where it occurs | Why it hurts |
|---|---|---|
| **Inconsistent page headers** | All pages | Some have icon+title+description, others have just `<h1>`, billing has none at all |
| **Mixed spacing units** | All pages | `py-6`, `py-8`, `py-4`, `space-y-5`, `space-y-6` — no rhythm |
| **Inconsistent card styles** | All pages | Some use `rounded-xl shadow-md`, others `rounded-lg shadow-sm`, billing uses `rounded-lg shadow` |
| **No global typography system** | All pages | Default `Arial` font, no modern SaaS typeface |
| **Billing page has no real page header** | `billing/page.tsx` | Drops straight into `<BillingHeader>` with no context |
| **Profile page has a second mini-sidebar** | `profile/page.tsx` | Creates a sidebar-inside-sidebar visual mess with the new left nav |
| **Dashboard tabs waste vertical space** | `dashboard/page.tsx` | Tab strip is inside a card, content starts far down the page |
| **Sidebar topbar always visible** | `DashboardNavbar.tsx` | Dark strip renders on desktop even when it should only show on mobile |
| **Content area lacks a sticky page-level header** | All pages | No persistent page context — user loses orientation after scrolling |
| **Button styling is wildly inconsistent** | Billing, Orders, Stocks | Emoji buttons (`🔄 Reset Form`, `💾 Save Draft`, `✅ Prepare Bill`) vs icon+text buttons |
| **Stat card inconsistency** | Customers, Dashboard widgets | Some have colored icon boxes, others are plain text |
| **No smooth sidebar-content transition** | `globals.css` | Content jumps when sidebar collapses — no `transition` on the margin |
| **Scrollbar colors clash** | `globals.css` | Dark scrollbar track (`#0d1117`) on a light dashboard background |
| **Stocks sub-page headers are redundant** | `stocks/restock`, `stocks/history` | Both show a tab strip AND an `<ArrowLeft>` back button — mixed navigation metaphors |
| **Font size inconsistency** | All pages | `text-xl`, `text-2xl`, `text-3xl` headings mixed without a clear hierarchy |

---

## 1. DESIGN SYSTEM (Applied in Phase 1 — Foundation)

### Typography
- Font: `Inter` from Google Fonts (modern, clean, SaaS-standard)
- H1 page title: `text-[22px] font-semibold text-slate-900`
- H2 section title: `text-[15px] font-semibold text-slate-700`
- Body: `text-[13.5px] text-slate-600`
- Label/caption: `text-[11.5px] font-medium text-slate-500 uppercase tracking-wide`

### Spacing Rhythm
- Page outer padding: `px-6 py-6` (desktop) → `px-4 py-4` (mobile)
- Section gap: `space-y-6`
- Card inner padding: `p-5` (normal), `p-4` (compact)
- Gap between cards in a grid: `gap-4`

### Card Standard
```
bg-white rounded-xl border border-slate-200 shadow-sm
```
One universal card style. No `shadow-md`, no `shadow-lg`, no `rounded-lg` vs `rounded-xl` inconsistency.

### Button Standard
```
// Primary (action)
px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold shadow-sm transition

// Secondary (outline)
px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold shadow-sm transition

// Danger
px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold shadow-sm transition

// Ghost/subtle
px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 text-[13px] font-medium transition
```
**No emoji buttons anywhere.** All actions use a Lucide icon + label.

### Page Header Standard (every page gets this)
```tsx
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">{title}</h1>
    <p className="page-subtitle">{subtitle}</p>
  </div>
  <div className="page-header-actions">
    {/* primary CTA buttons */}
  </div>
</div>
```

### Stat Card Standard
```tsx
<div className="stat-card">
  <div className="stat-icon-wrap stat-icon-{color}">
    <Icon size={16} />
  </div>
  <div>
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
  </div>
</div>
```

---

## 2. GROUND RULES

| Rule | Detail |
|---|---|
| **Zero functionality changes** | No API calls, data fetching, state logic, form handlers, modals, or business logic are touched |
| **No new files** | All changes are in-place edits to existing files |
| **Color theme unchanged** | Blue primary, sidebar dark gradient — kept exactly as-is |
| **Backend untouched** | No API, no models, no server code |
| **Sidebar untouched structurally** | The sidebar nav links, collapse behavior, mobile drawer — all kept; only CSS polish |
| **Existing component hierarchy unchanged** | `<BillingItemsTable>`, `<StockHeader>`, etc. stay as sub-components; we only change the page wrapper |

---

## 3. FILES AFFECTED (ALL PHASES)

```
src/app/globals.css                                           ← Phase 1 (design system CSS tokens)
src/app/components/DashboardNavbar.tsx                        ← Phase 1 (topbar fix), Phase 5 (sidebar polish)
src/app/dashboard/page.tsx                                    ← Phase 2 (dashboard page header + tabs)
src/app/dashboard/products/page.tsx                          ← Phase 2 (page header)
src/app/dashboard/stocks/page.tsx                            ← Phase 2 (page header, tab strip)
src/app/dashboard/stocks/restock/page.tsx                    ← Phase 2 (header, remove back arrow)
src/app/dashboard/stocks/history/page.tsx                    ← Phase 2 (header, remove back arrow)
src/app/dashboard/customers/page.tsx                         ← Phase 2 (page header)
src/app/dashboard/customers/[customerId]/history/page.tsx    ← Phase 2 (page header)
src/app/dashboard/orders/page.tsx                            ← Phase 3 (page header, button cleanup)
src/app/dashboard/billing/page.tsx                           ← Phase 3 (page header, button cleanup)
src/app/dashboard/delivery-requests/page.tsx                 ← Phase 3 (page header)
src/app/dashboard/delivery/live-map/page.tsx                 ← Phase 3 (page header)
src/app/dashboard/profile/page.tsx                           ← Phase 4 (remove inner sidebar, horizontal tabs)
src/app/dashboard/sales/page.tsx                             ← Phase 4 (page header, stat cards)
```

**Total: 15 files — all already exist. 0 created. 0 deleted.**

---

## PHASE 1 — Foundation: Global CSS Design System

**Goal:** Lay a single source of truth for spacing, typography, card styles, and button styles in `globals.css`. All subsequent phases reference these classes instead of inline Tailwind strings.

### FILE: `src/app/globals.css`

#### 1.1 Add Inter Font

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```
Update `body` font-family:
```css
body {
  font-family: 'Inter', Arial, Helvetica, sans-serif;
  /* ... rest of existing body rules unchanged ... */
}
```

#### 1.2 Fix Scrollbar Colors (light mode appropriate)
```css
/* Replace existing dark scrollbar with light-mode appropriate */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

#### 1.3 Fix Sidebar Topbar (should be hidden on desktop always — lg:hidden)
The `dash-mobile-topbar` has `display: flex` always. Add:
```css
.dash-mobile-topbar {
  /* ... existing rules ... */
}
@media (min-width: 1024px) {
  .dash-mobile-topbar { display: none; }
}
```
This removes the always-visible dark strip on desktop permanently. The sidebar header handles logo/branding on desktop.

#### 1.4 Add Smooth Content Transition
```css
@media (min-width: 1024px) {
  .dash-content-offset {
    transition: margin-left 0.2s ease;
  }
}
```

#### 1.5 Page Layout Utility Classes
```css
/* ── Page wrapper ─────────────────────────────────────────────────────── */
.page-wrapper {
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  padding: 24px 24px;
}
@media (max-width: 767px) {
  .page-wrapper { padding: 16px 16px; }
}

/* ── Page header ──────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.page-header-left { display: flex; flex-direction: column; gap: 3px; }
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
  letter-spacing: -0.015em;
}
.page-subtitle {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
}
.page-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
```

#### 1.6 Universal Card Style
```css
/* ── Card ─────────────────────────────────────────────────────────────── */
.saas-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03);
}
.saas-card-compact { padding: 14px 16px; }
```

#### 1.7 Universal Button Styles
```css
/* ── Buttons ──────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
}
.btn-primary {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 1px 2px rgba(37,99,235,0.2);
}
.btn-primary:hover { background: #1d4ed8; border-color: #1d4ed8; }
.btn-secondary {
  background: #ffffff;
  color: #374151;
  border-color: #e2e8f0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
.btn-danger {
  background: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
}
.btn-danger:hover { background: #b91c1c; }
.btn-warning {
  background: #d97706;
  color: #ffffff;
  border-color: #d97706;
}
.btn-warning:hover { background: #b45309; }
.btn-success {
  background: #059669;
  color: #ffffff;
  border-color: #059669;
}
.btn-success:hover { background: #047857; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-lg { padding: 10px 20px; font-size: 14px; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
```

#### 1.8 Stat Card Styles
```css
/* ── Stat cards ───────────────────────────────────────────────────────── */
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon-blue { background: #eff6ff; color: #2563eb; }
.stat-icon-green { background: #f0fdf4; color: #059669; }
.stat-icon-red { background: #fef2f2; color: #dc2626; }
.stat-icon-amber { background: #fffbeb; color: #d97706; }
.stat-icon-purple { background: #faf5ff; color: #7c3aed; }
.stat-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1; }
.stat-value-sm { font-size: 15px; font-weight: 700; color: #0f172a; }
```

#### 1.9 Table Styles
```css
/* ── Tables ───────────────────────────────────────────────────────────── */
.saas-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.saas-table thead th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.saas-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
.saas-table tbody tr:hover { background: #f8fafc; }
.saas-table tbody td { padding: 12px 14px; color: #374151; vertical-align: middle; }
```

#### 1.10 Badge/Tag Styles
```css
/* ── Badges ───────────────────────────────────────────────────────────── */
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.badge-green { background: #f0fdf4; color: #047857; border: 1px solid #bbf7d0; }
.badge-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.badge-amber { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.badge-slate { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
```

**Phase 1 — Files affected:** `src/app/globals.css` only (1 file)

**Phase 1 — Acceptance criteria:**
- [ ] Inter font loads on all dashboard pages
- [ ] Dark scrollbar is replaced with light grey scrollbar on the content area
- [ ] The dark topbar strip is completely gone on desktop (≥1024px)
- [ ] All new CSS utility classes exist and are usable by subsequent phases

---

## PHASE 2 — Content Pages: Page Headers + Cards + Spacing

**Goal:** Apply the design system to the primary content pages (Dashboard, Products, Stocks group, Customers). No functionality changed — only the wrapper JSX/classNames.

### 2.1 FILE: `src/app/dashboard/page.tsx`

**What changes (wrapper only — all component imports and data logic untouched):**

```tsx
// BEFORE outer wrapper:
<div className="flex flex-col min-h-screen bg-gray-50 dash-content-offset">
  <DashboardNavbar />
  <main className="flex-grow">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

// AFTER:
<div className="flex flex-col min-h-screen bg-slate-50 dash-content-offset">
  <DashboardNavbar />
  <main className="flex-grow">
    <div className="page-wrapper">
```

**Page header** — replace the existing tab-strip-only approach with a real header above it:
```tsx
{/* Page Header */}
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">Dashboard</h1>
    <p className="page-subtitle">Overview of your business at a glance</p>
  </div>
</div>

{/* Tab strip — unchanged logic, updated visual */}
<div className="saas-card saas-card-compact mb-6">
  <div className="flex flex-wrap gap-2">
    {/* existing tab buttons — only className updated per design system button styles */}
  </div>
</div>
```

**Tab strip buttons** — restyle active/inactive:
- Active: `btn btn-primary btn-sm` (blue pill)
- Inactive: `btn btn-secondary btn-sm`
- Keep all `onClick`, `id`, `key`, and badge logic **unchanged**

### 2.2 FILE: `src/app/dashboard/products/page.tsx`

**What changes:**
- Outer `<div>` background: `bg-gray-50` → `bg-slate-50`
- Remove the blue icon box (`w-10 h-10 bg-blue-600 rounded-xl`) from page header — replace with standard `page-header` layout
- Replace the `space-y-5` inner wrapper with `space-y-6`
- Button: "File Templates" → `btn btn-secondary btn-sm`
- Button: "Bulk Upload" → `btn btn-secondary btn-sm` (remove blue tint — secondary is fine)
- Button: "Add Product" → `btn btn-primary`

**Page header — BEFORE:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
      <Package size={18} className="text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-gray-900 leading-tight">Products</h1>
      <p className="text-sm text-gray-500">...</p>
    </div>
  </div>
  ...
</div>
```

**Page header — AFTER:**
```tsx
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">Products</h1>
    <p className="page-subtitle">
      {productLimit !== null
        ? `${productCount} / ${productLimit} products used`
        : "Manage your shop's product catalogue"}
    </p>
  </div>
  <div className="page-header-actions">
    <button onClick={() => setShowFileTemplate(true)} className="btn btn-secondary btn-sm">
      <FileSpreadsheet size={14} /> File Templates
    </button>
    <button onClick={() => setShowBulkUpload(true)} className="btn btn-secondary btn-sm">
      <Upload size={14} /> Bulk Upload
    </button>
    <button onClick={...} className="btn btn-primary btn-sm">
      <Plus size={14} /> Add Product
    </button>
  </div>
</div>
```

### 2.3 FILE: `src/app/dashboard/stocks/page.tsx`

**What changes:**
- Page header: add standard `page-header` with title "Stock Management" and subtitle showing product count
- Tab strip: already exists — restyle with `saas-card saas-card-compact mb-6`
- `<StockHeader>` component stays untouched — it renders below the tab strip as before

### 2.4 FILE: `src/app/dashboard/stocks/restock/page.tsx`

**What changes:**
- Remove the `<ArrowLeft>` back button — navigation is now handled by the tab strip above it (no mixed metaphors)
- Page header becomes the standard `page-header` pattern
- Buttons: "Format Guide" → `btn btn-secondary btn-sm`, "Bulk Upload" → `btn btn-primary btn-sm`
- Remove: `router.push("/dashboard/stocks")` from the back button (the ArrowLeft button is deleted, router import still used elsewhere so don't remove it)

**Page header — BEFORE:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <div className="flex items-center gap-3">
    <button onClick={() => router.push("/dashboard/stocks")} className="p-2 rounded-lg border...">
      <ArrowLeft className="w-4 h-4" />
    </button>
    <div>
      <h1 className="text-2xl font-bold...">Restock Products</h1>
      <p className="text-sm text-gray-500...">...</p>
    </div>
  </div>
  ...
</div>
```

**Page header — AFTER:**
```tsx
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">Restock Products</h1>
    <p className="page-subtitle">{products.length} products available</p>
  </div>
  <div className="page-header-actions">
    <button onClick={() => setShowFormatModal(true)} className="btn btn-secondary btn-sm">
      <FileSpreadsheet size={14} /> Format Guide
    </button>
    <button onClick={() => setShowBulkModal(true)} className="btn btn-primary btn-sm">
      <Upload size={14} /> Bulk Upload
    </button>
  </div>
</div>
```

### 2.5 FILE: `src/app/dashboard/stocks/history/page.tsx`

**Same pattern as 2.4:**
- Remove `<ArrowLeft>` back button
- Standard `page-header` with title "Restock History"
- PDF export button styled as `btn btn-secondary btn-sm`

### 2.6 FILE: `src/app/dashboard/customers/page.tsx`

**What changes:**
- Remove the `Ice Saathi` badge next to the `<h1>` (it's decorative noise)
- Standard `page-header` format
- Stat cards: already quite good — just ensure they use `stat-card` class pattern for consistency

**Page header — AFTER:**
```tsx
<div className="page-header">
  <div className="page-header-left">
    <h1 className="page-title">Customers</h1>
    <p className="page-subtitle">Manage customer profiles, balances and history</p>
  </div>
  <div className="page-header-actions">
    <CustomerReportPDF customers={customers} />  {/* unchanged */}
    <button onClick={() => setShowBulkModal(true)} className="btn btn-secondary btn-sm">
      <Upload size={14} /> Bulk Import
    </button>
    <button onClick={openAddForm} className="btn btn-primary btn-sm">
      <Plus size={14} /> Add Customer
    </button>
  </div>
</div>
```

### 2.7 FILE: `src/app/dashboard/customers/[customerId]/history/page.tsx`

**What changes:**
- Standard `page-header` with title "Customer History"
- Back button → converted to `btn btn-secondary btn-sm` with `<ArrowLeft>` icon placed **in the page-header-actions** (right side), OR removed if breadcrumb navigation is sufficient via sidebar

**Phase 2 — Files affected:** 7 files
**Phase 2 — Acceptance criteria:**
- [ ] All 7 pages show the same page-header pattern (title + subtitle + actions)
- [ ] No blue icon boxes in page headers
- [ ] All primary action buttons are `btn btn-primary`, secondary are `btn btn-secondary`
- [ ] Stocks sub-pages (Restock, History) no longer have the ArrowLeft back button
- [ ] No visual regressions on existing data tables, modals, and functional components

---

## PHASE 3 — Transactional Pages: Orders, Billing, Delivery

**Goal:** Apply design system to the highest-complexity pages. Special focus on `billing/page.tsx` which currently has the most inconsistent styling (emoji buttons, no real page header).

### 3.1 FILE: `src/app/dashboard/orders/page.tsx`

**What changes:**
- Outer bg: `bg-[#f8f9fb]` → `bg-slate-50` (match all other pages)
- Page header already exists and is reasonable — standardise to `page-header` class
- Search input: already good style — keep it, just ensure consistent sizing
- Sort select: keep as-is
- `btn btn-primary` for the "New Order" / primary action button

**No changes to:** order table, pagination, modal triggers, status badges logic

### 3.2 FILE: `src/app/dashboard/billing/page.tsx`

This is the biggest cleanup. The billing page currently renders:
1. `<DashboardNavbar />` (sidebar)
2. `<BillingHeader seller={seller} />` (a separate header sub-component)
3. Then `<main>` with `BILL OF SUPPLY` as an `<h1>` inside a card

**What changes (wrapper/shell only — all sub-components untouched):**

Add a **page header** between `<DashboardNavbar />` and `<BillingHeader>`:
```tsx
{/* New: page context header */}
<div className="page-wrapper pb-0">
  <div className="page-header">
    <div className="page-header-left">
      <h1 className="page-title">Billing</h1>
      <p className="page-subtitle">Create and manage invoices for your customers</p>
    </div>
    <div className="page-header-actions">
      {/* Draft save + Reset are moved here as proper buttons */}
      <button onClick={() => setShowResetDialog(true)} className="btn btn-secondary btn-sm">
        <RotateCcw size={14} /> Reset
      </button>
      <button onClick={saveDraft} className="btn btn-warning btn-sm">
        <Save size={14} /> Save Draft
      </button>
    </div>
  </div>
</div>
```

**Action buttons** — replace emoji buttons at the bottom of the form:
```
BEFORE: 🔄 Reset Form  →  AFTER: <RotateCcw size={14} /> Reset (btn btn-secondary)
BEFORE: 💾 Save Draft  →  AFTER: <Save size={14} /> Save Draft (btn btn-warning)
BEFORE: ✅ Prepare Bill → AFTER: <CheckCircle size={14} /> Prepare Bill (btn btn-success)
BEFORE: 📄 Export PDF  →  AFTER: <FileDown size={14} /> Export PDF (btn btn-primary)
```

New icon imports to add to billing page's existing lucide import: `RotateCcw`, `Save`, `CheckCircle`, `FileDown`

**No changes to:** `<BillingHeader>`, `<BillingCustomerSection>`, `<BillingItemsTable>`, all dialog components, all form state, all API calls

### 3.3 FILE: `src/app/dashboard/delivery-requests/page.tsx`

**What changes:**
- Standard `page-header` with title "Delivery Requests" and subtitle
- Outer bg consistent with other pages

### 3.4 FILE: `src/app/dashboard/delivery/live-map/page.tsx`

**What changes:**
- Standard `page-header` before the map renders
- "Live Map" as title, "Track your delivery partners in real time" as subtitle

**Phase 3 — Files affected:** 4 files
**Phase 3 — Acceptance criteria:**
- [ ] Billing page shows a real page header with title + subtitle
- [ ] All emoji buttons are replaced with icon+text buttons using design system btn classes
- [ ] Orders page background matches other pages (`bg-slate-50`)
- [ ] All 4 pages: no visual regressions on their core functional components

---

## PHASE 4 — Special Cases: Profile Page & Sales Page

### 4.1 FILE: `src/app/dashboard/profile/page.tsx` — REMOVE INNER SIDEBAR

**Problem:** Profile currently renders its own `<aside>` left sidebar (for tab navigation) **inside** the main content area which already has the `DashboardNavbar` sidebar. This creates a sidebar-inside-sidebar layout — confusing and space-wasteful.

**Solution:** Replace the inner aside with **horizontal tabs** at the top of the content area, matching the same tab pattern used on the Dashboard page and Stocks pages.

**What changes (structural — no logic changes):**
1. Remove the `<aside className="hidden lg:block w-64 ...">` desktop sidebar block
2. Remove the `{isMobileSidebarOpen && ...}` mobile sidebar overlay block
3. Remove the "Mobile Menu Button" `<div className="lg:hidden bg-white border-b...">` block
4. Remove the `isMobileSidebarOpen` state (it's only used by the removed sidebar)
5. Remove the `SidebarButton` sub-component (only used by the removed sidebar)
6. **Add** a horizontal tab strip at the top of `<main>`:

```tsx
{/* Profile Tab Strip */}
<div className="saas-card saas-card-compact mb-6">
  <div className="flex flex-wrap gap-2 overflow-x-auto">
    {navItems.map((item) => (
      <button
        key={item.tab}
        onClick={() => handleTabChange(item.tab)}
        className={`btn btn-sm ${activeTab === item.tab ? 'btn-primary' : 'btn-secondary'}`}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    ))}
  </div>
</div>
```

7. Change `<main>` to: `<main className="flex-grow"><div className="page-wrapper">`
8. Remove `lg:flex-row gap-4 sm:gap-6 lg:gap-8 overflow-hidden` from `<main>` — it becomes a single-column layout
9. The `<section className="flex-1 bg-white rounded-xl shadow-md h-[calc(100vh-12rem)] overflow-y-auto">` becomes a simple `<div className="saas-card">` — remove the fixed height and overflow, let content flow naturally

**What stays exactly the same:** `navItems` array, `activeTab` state, `handleTabChange`, `setActiveTab`, all the `{activeTab === "basic" && <BasicInformationComponent .../>}` conditionals, `loadProfile`, all API calls, `useSearchParams` integration

### 4.2 FILE: `src/app/dashboard/sales/page.tsx`

**What changes:**
- Page header: replace `<h1 className="text-2xl md:text-3xl font-bold text-blue-700 flex items-center gap-2"><BarChart3 .../> Sales Analytics</h1>` with standard `page-title` class (no icon in the `<h1>`, no colored heading text)
- The `<BarChart3>` icon can remain in the `page-header-left` as a small leading icon if desired, but the heading itself should be `text-slate-900` not `text-blue-700`
- Date range controls: keep exactly as-is (they're already well-designed)
- Stat cards: standardise to `stat-card` CSS class if they don't already match

**Phase 4 — Files affected:** 2 files
**Phase 4 — Acceptance criteria:**
- [ ] Profile page no longer shows an inner left sidebar on desktop
- [ ] Profile tabs render as a horizontal tab strip at the top of the content area
- [ ] All 11 profile sections are still accessible via the tab strip
- [ ] The `?tab=` URL parameter still works (navigating from sidebar links opens correct tab)
- [ ] Sales page header uses `slate-900` text, no colored heading
- [ ] No regressions on either page's data or functionality

---

## PHASE 5 — Sidebar Polish & Final Consistency Pass

**Goal:** Final visual pass — clean up the sidebar itself, ensure the collapsed topbar issue is resolved, add micro-animation polish.

### 5.1 FILE: `src/app/components/DashboardNavbar.tsx`

**What changes:**

**a) Remove unused `activeTab` state and its `useEffect`** (was added during Phase 1 of first implementation, never used):
```tsx
// DELETE these lines:
const [activeTab, setActiveTab] = useState<string>("basic");
useEffect(() => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    setActiveTab(params.get("tab") || "basic");
  }
}, [pathname]);
```

**b) Topbar — make it truly mobile-only on desktop** (reverted by user — fix it properly in CSS instead):
```css
/* In globals.css — already added in Phase 1 §1.3 */
@media (min-width: 1024px) {
  .dash-mobile-topbar { display: none; }
}
```
This removes need for any JSX conditional — the CSS handles it cleanly.

**c) Add `Profile` expand group back to sidebar footer** — The user removed it; it should be added back as it's per the original spec. The profile icon in the topbar (mobile) is sufficient for mobile; on desktop the sidebar footer Profile entry is the primary nav:
```tsx
{/* Profile group in footer — for admin/owner only */}
{role !== "manager" && (
  <div>
    <button
      onClick={() => collapsed ? router.push("/dashboard/profile") : setExpandedGroup(expandedGroup === "profile" ? null : "profile")}
      className={`dash-nav-link w-full${pathname.startsWith("/dashboard/profile") ? " dash-nav-link-active" : ""}`}
      style={{ justifyContent: collapsed ? "center" : "space-between" }}
    >
      <span className="flex items-center gap-3">
        <UserCircle size={18} className="flex-shrink-0" />
        {!collapsed && <span>Profile</span>}
      </span>
      {!collapsed && <ChevronDown size={14} style={{ transform: expandedGroup === "profile" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }} />}
      {collapsed && <span className="dash-tooltip">Profile</span>}
    </button>
    {!collapsed && expandedGroup === "profile" && (
      <div className="dash-subsidebar">
        {profileSubLinks.map((sub) => (
          <Link key={sub.tab} href={`/dashboard/profile?tab=${sub.tab}`}
            onClick={() => setMobileOpen(false)}
            className="dash-subnav-link">
            {sub.label}
          </Link>
        ))}
      </div>
    )}
  </div>
)}
```

**d) Add section label dividers to sidebar nav:**
```tsx
{/* MAIN section label */}
{!collapsed && (
  <span className="dash-section-label">Main</span>
)}
{/* ... Dashboard, Products links ... */}

{/* INVENTORY section label */}
{!collapsed && (
  <span className="dash-section-label">Inventory</span>
)}
{/* ... Stocks, Customers links ... */}

{/* OPERATIONS section label */}
{!collapsed && (
  <span className="dash-section-label">Operations</span>
)}
{/* ... Billing, Orders, Live Map, Sales links ... */}
```

And add the CSS:
```css
.dash-section-label {
  display: block;
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

### 5.2 FILE: `src/app/globals.css`

**Final polish additions:**
```css
/* Sidebar section label */
.dash-section-label {
  display: block;
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(148,163,184,0.7);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 6px;
}

/* Active sidebar link — left accent bar */
.dash-nav-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 60%;
  width: 2.5px;
  background: #22d3ee;
  border-radius: 0 2px 2px 0;
}
```

**Phase 5 — Files affected:** 2 files (`DashboardNavbar.tsx`, `globals.css`)
**Phase 5 — Acceptance criteria:**
- [ ] Sidebar shows section group labels (Main / Inventory / Operations) when expanded
- [ ] Active nav link has a cyan left accent bar
- [ ] The dark topbar strip is completely invisible on desktop (≥1024px) via CSS
- [ ] Profile expand group works in sidebar footer
- [ ] No unused `activeTab` state in `DashboardNavbar.tsx`

---

## 4. CONSOLIDATED FILE-CHANGE MATRIX

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|
| `globals.css` | Inter font, scrollbar, page-wrapper, page-header, saas-card, btn*, stat-card, table, badge, topbar hide | — | — | — | dash-section-label, dash-nav-link-active::before |
| `DashboardNavbar.tsx` | — | — | — | — | Remove activeTab state, add profile group, add section labels |
| `dashboard/page.tsx` | — | page-header, saas-card tab strip, btn classes | — | — | — |
| `products/page.tsx` | — | page-header, btn classes, remove icon box | — | — | — |
| `stocks/page.tsx` | — | page-header, saas-card tab strip | — | — | — |
| `stocks/restock/page.tsx` | — | page-header, remove ArrowLeft, btn classes | — | — | — |
| `stocks/history/page.tsx` | — | page-header, remove ArrowLeft, btn classes | — | — | — |
| `customers/page.tsx` | — | page-header, remove Ice Saathi badge, btn classes | — | — | — |
| `customers/[customerId]/history/page.tsx` | — | page-header | — | — | — |
| `orders/page.tsx` | — | — | page-header, bg-slate-50, btn classes | — | — |
| `billing/page.tsx` | — | — | page-header, emoji→icon+text buttons | — | — |
| `delivery-requests/page.tsx` | — | — | page-header | — | — |
| `delivery/live-map/page.tsx` | — | — | page-header | — | — |
| `profile/page.tsx` | — | — | — | Remove inner sidebar → horizontal tab strip | — |
| `sales/page.tsx` | — | — | — | page-header, heading color | — |

**Total unique files: 15. New files: 0. Deleted files: 0.**

---

## 5. IMPLEMENTATION ORDER

Execute phases strictly in order — each phase builds on the previous:

1. **Phase 1 first** — the CSS classes must exist before any phase can reference them
2. **Phase 2 second** — apply to simpler pages first to validate the pattern
3. **Phase 3 third** — apply to complex pages (billing especially)
4. **Phase 4 fourth** — structural change to profile (needs careful testing)
5. **Phase 5 last** — final polish after all content is consistent

---

## 6. WHAT WE ARE EXPLICITLY NOT CHANGING

- Any API route, backend model, or server component
- The color theme (dark blue sidebar gradient, cyan accents)
- The sidebar collapse behavior, mobile drawer, or any sidebar nav logic
- Any modal, dialog, or form validation logic
- The PDF generation components (`BillingItemsTable`, `PdfExportComponent`, `HistoryPdfGenerator`, etc.)
- The subscription/plan limit warning banners (`PlanLimitWarning`)
- `AdminNavbar.tsx` or `/admin/*` routes
- Any `useEffect` that fetches data or interacts with localStorage for user/token
- The notification polling logic in `DashboardNavbar.tsx`
- Role-based visibility (`role === "manager"` conditionals)
