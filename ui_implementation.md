# IMPLEMENTATION.md
## Sidebar Navigation Migration — Ice Inventory Dashboard
### Top Navbar → Professional Left Sidebar (with Subsidebar + Tab Navigation)

---

## 0. SCOPE, CONSTRAINTS & GROUND RULES

This plan converts the existing **top horizontal `DashboardNavbar`** into a **fixed, collapsible left sidebar** (professional SaaS pattern — like Linear, Stripe, Vercel, Notion), adds a **subsidebar** for grouped secondary navigation, and adds **tab-style sub-navigation** on pages that have sibling routes (Stocks group, Customers group). It is fully responsive across mobile / tablet / desktop.

### Hard constraints (followed throughout all 3 phases)

| Constraint | How it's honored |
|---|---|
| **No new files** | Every change is made by editing the 14 files listed in §1. Nothing is created, nothing is deleted. |
| **No new components** | `DashboardNavbar.tsx` (already an existing component) is **repurposed in-place** to render as a sidebar instead of a header. No `Sidebar.tsx`, `Subsidebar.tsx`, `Tabs.tsx`, etc. are introduced. |
| **No option interchange** | All current nav items, routes, role-based visibility (admin vs manager), subscription badge, notification bell, profile icon, logout flow remain — only their **container/layout** changes from `<header>` (top, horizontal) to `<aside>` (left, vertical). |
| **Sidebar stays a sidebar** | Once converted in Phase 1, it remains the single source of primary navigation in Phases 2–3. Phase 2 only adds a nested/secondary panel **inside the same `DashboardNavbar.tsx`**. |
| **Subsidebar = "other options"** | Implemented as collapsible groups inside the same sidebar component — e.g. "Stocks" expands to show Overview / Restock / History; "Profile" expands to show its existing 11 sub-sections. |
| **Tabs on some pages** | Implemented by reusing the **exact tab-button visual pattern already proven in `src/app/dashboard/page.tsx`** (lines 160-188 / 268-312) — copy-pasted into `stocks`, `stocks/restock`, `stocks/history` (and optionally `customers` ↔ its history page) so it's a tab strip, not a new component. |
| **Responsive for all devices** | Sidebar collapses to icon-rail on tablets, becomes a slide-in drawer with overlay on mobile (same `mobileOpen` state already present, repurposed). `main` content offset (`md:ml-[X]`) is conditional on breakpoint. |
| **Professional SaaS UI** | Dark sidebar (`#020617` family — matches existing brand gradient already used in `DashboardNavbar`), light content area (matches existing `bg-gray-50` / `bg-slate-50` per-page), active-state highlight bar, grouped sections with uppercase micro-labels, icon-only collapsed state, tooltips on hover when collapsed. |

### Files touched across all phases (14 total — no others)

```
src/app/components/DashboardNavbar.tsx      ← the navbar-becomes-sidebar (primary change)
src/app/globals.css                          ← shared CSS vars + scrollbar fix + sidebar offset utility
src/app/dashboard/page.tsx                   ← layout offset + tab strip already exists (minor wrapper edit)
src/app/dashboard/products/page.tsx          ← layout offset only
src/app/dashboard/stocks/page.tsx            ← layout offset + NEW tab strip (Stocks group)
src/app/dashboard/stocks/restock/page.tsx    ← layout offset + tab strip (Stocks group)
src/app/dashboard/stocks/history/page.tsx    ← layout offset + tab strip (Stocks group)
src/app/dashboard/customers/page.tsx         ← layout offset only (+ optional tab strip)
src/app/dashboard/customers/[customerId]/history/page.tsx  ← layout offset only
src/app/dashboard/orders/page.tsx            ← layout offset only
src/app/dashboard/delivery-requests/page.tsx ← layout offset only
src/app/dashboard/delivery/live-map/page.tsx ← layout offset only
src/app/dashboard/delivery/live-map/[partnerId]/page.tsx ← layout offset only
src/app/dashboard/profile/page.tsx           ← layout offset + sidebar's "subsidebar" takes over its existing internal nav (Phase 2)
```

That is **13 page files + 1 component + 1 global stylesheet = 15 files**, all of which already exist. (`src/app/dashboard/subscription/page.tsx` and `src/app/dashboard/billing/*` are **not** in this list — see §0.1 "Known pre-existing issues, explicitly out of scope".)

### 0.1 Known pre-existing issues — explicitly OUT OF SCOPE

These were discovered while auditing the codebase. They are **not** caused by, and are **not fixed by**, this sidebar migration. Flagging them so they aren't mistaken for regressions after Phase 1–3:

1. **`/dashboard/sales` and `/dashboard/billing` have no `page.tsx`.** `DashboardNavbar.tsx` does not currently link to `/dashboard/sales` (it's referenced inside `dashboard/page.tsx`'s tab system, which is fine — that's a tab, not a route). `/dashboard/billing` IS in the current navLinks array (`DashboardNavbar.tsx` line 57) and currently 404s. We will **keep this link as-is** when moving items into the sidebar (per "no option interchange"), but it will continue to 404 until a `billing/page.tsx` is added in a future task.
2. **`src/app/dashboard/subscription/page.tsx`** is a non-UTF8/near-empty file (3 bytes) — reached via Profile's "Subscription" tab and the navbar's mobile "Subscription" link. Unrelated to layout; not touched.
3. **`AdminNavbar.tsx` / `admin/layout.tsx`** (the `/admin/*` SuperAdmin section) has a **fixed, non-responsive 240px sidebar** with no mobile handling at all. The user's request is scoped to the **main dashboard navbar** (`DashboardNavbar`), so `/admin/*` is **not modified** in this plan. If desired later, the *exact same pattern* built in Phase 1 can be reapplied to `AdminNavbar.tsx`/`admin/layout.tsx` as a follow-up — but that is outside today's 3 phases.
4. **`src/app/dashboard/delivery/live-map/[partnerId]/map-animations.css`** exists but is never imported anywhere — dead file, not touched.
5. **`globals.css` scrollbar colors** (`#0d1117`, `#2d3748`) are dark-theme leftovers applied globally even though the dashboard is light-themed. Phase 1 §3.2 makes a **minimal, additive** edit to `globals.css` (adding a CSS variable + one utility class for the sidebar offset) — it does **not** rewrite or remove these existing rules, to avoid unrelated visual regressions.

---

## 1. CURRENT STATE — WHAT WE'RE STARTING FROM

### 1.1 `DashboardNavbar.tsx` today
- Renders as `<header className="sticky top-0 z-50 ...">` — a horizontal bar.
- Contains: logo, 7 desktop nav links (`Dashboard, Products, Stocks, Customers, Billing, Orders, Live Map`, conditionally `Sales`), `SubscriptionBadge`, notification bell (delivery requests), profile icon, logout (manager only), and a `lg:hidden` hamburger that toggles a dropdown panel below the header on mobile.
- State: `pendingCount`, `role`, `userId`, `showDialog` (logout confirm), `mobileOpen`.

### 1.2 How every dashboard page is structured today
All 12 pages that render `DashboardNavbar` follow this exact skeleton:

```tsx
return (
  <div className="flex flex-col min-h-screen bg-{color}">
    <DashboardNavbar />
    <main className="flex-grow ...">
      {/* page content */}
    </main>
    <Footer />   {/* present on most, absent on a couple */}
  </div>
);
```

This vertical stack (`flex-col`) is exactly what we need to change to a horizontal stack (`flex-row` on desktop), with the sidebar as the first flex item and `<main>` as the second, flexible item.

### 1.3 Existing patterns we REUSE (not recreate)

- **`admin/layout.tsx` + `AdminNavbar.tsx`** already prove the "fixed-left `<aside>` + `main` with `ml-[Npx]`" pattern works in this codebase (`AdminNavbar` is `position: fixed; width: 240px`, `admin/layout.tsx` does `<main className="flex-1 ml-[240px] ...">`). We reuse this *structural idea* — but make it responsive (the admin one isn't).
- **`profile/page.tsx`** already proves the "desktop `<aside>` + mobile slide-in overlay `<aside>` with backdrop" pattern (lines ~340-384), including a `Menu`/`X` toggle button and `isMobileSidebarOpen` state. We reuse this *exact responsive mechanism* for the main sidebar's mobile drawer.
- **`dashboard/page.tsx`** already proves the "pill-shaped tab strip with active/inactive color classes + icon + responsive label" pattern (lines 160-188, 268-312). We reuse this *exact tab strip JSX/CSS pattern* for Phase 3's Stocks tab group.

Because all three patterns already exist in the codebase, Phases 1–3 are pure **adaptation and relocation** of existing JSX/CSS — never new design language.

---

## 2. TARGET LAYOUT (END STATE AFTER PHASE 3)

```
┌──────────────────────────────────────────────────────────────────┐
│ DESKTOP (≥1024px)                                                  │
│ ┌────────────┬─────────────────────────────────────────────────┐ │
│ │  SIDEBAR    │  TOP STRIP (subscription badge, bell, profile)  │ │
│ │  (fixed)    │  ───────────────────────────────────────────── │ │
│ │  72px       │                                                 │ │
│ │  collapsed  │   [optional TAB STRIP — Stocks/Customers etc]   │ │
│ │  or         │  ───────────────────────────────────────────── │ │
│ │  248px      │                                                 │ │
│ │  expanded   │           <main page content>                  │ │
│ │             │                                                 │ │
│ │  ── group ──│                                                 │ │
│ │  ▾ Stocks   │                                                 │ │
│ │    Overview │                                                 │ │
│ │    Restock  │                                                 │ │
│ │    History  │                                                 │ │
│ │  ▾ Profile  │                                                 │ │
│ │    (11 sub) │                                                 │ │
│ │             │                                                 │ │
│ │  [logout]   │                                                 │ │
│ └────────────┴─────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ TABLET (768–1023px)                                                │
│  Sidebar auto-collapses to 72px icon rail (labels hidden, tooltip │
│  on hover). Subsidebar groups become flyout panels on hover/click.│
├──────────────────────────────────────────────────────────────────┤
│ MOBILE (<768px)                                                    │
│  Sidebar hidden by default. Top bar (height 56px, sticky) shows   │
│  hamburger + logo + bell + profile. Tapping hamburger slides the  │
│  full sidebar in from the left over a dark backdrop (exact same   │
│  overlay mechanism as profile/page.tsx today).                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. PHASE 1 — Core Sidebar Conversion (Navbar → Sidebar Skeleton)

### Goal
Turn `DashboardNavbar` from a horizontal `<header>` into a vertical, responsive `<aside>` sidebar containing **exactly the same links/items it has today** (no additions, no removals, no reordering relative to each other). Update all 12 consuming pages so their `main` content sits to the right of the sidebar instead of below a header.

### 3.1 FILE: `src/app/components/DashboardNavbar.tsx` (FULL REWRITE OF THE RENDER — same component, same exports, same name)

**What changes:**
- `<header className="sticky top-0 z-50 ...">` → `<aside className="dash-sidebar ...">` with `position: fixed; left: 0; top: 0; height: 100vh`.
- The horizontal `<nav className="hidden lg:flex ...">` becomes a vertical `<nav className="flex flex-col gap-1 ...">` — same `navLinks.map(...)`, same `Icon`, same active-state logic (`pathname === href`), just `flex-col` instead of `flex` and full-width rows instead of inline pills.
- The "RIGHT" cluster (`SubscriptionBadge`, bell, profile icon, logout) moves from the navbar's right edge into the **sidebar's footer** (bottom of the `<aside>`) on desktop, AND into a **slim top strip** (`<div className="dash-topbar">`) that is rendered by the same component but positioned via CSS to sit at `top:0; left: var(--sidebar-width)` — this preserves "subscription badge + bell + profile visible at a glance" without inventing a second header component (it's still JSX returned by `DashboardNavbar`, just a second sibling element in its return fragment).
- `mobileOpen` state is **kept**, but now controls a **full-height slide-in drawer** (the whole sidebar, not a dropdown) — same toggle button, same `Menu`/`X` icons, relocated into the new mobile top strip.
- A **new local state `collapsed`** (boolean, default `false`, persisted to `localStorage` under key `sidebarCollapsed`) controls the 248px ↔ 72px width toggle on desktop/tablet. This is **internal component state**, not a new component.
- Logout confirm dialog (`showDialog`) JSX is **unchanged** — only its trigger button moves from the old "RIGHT" cluster into the sidebar footer.

**Pseudocode diff (structure only — exact JSX written during implementation, all existing className strings for links/icons/badges are carried over verbatim):**

```tsx
// BEFORE (current return)
return (
  <>
    {showDialog && <LogoutDialog .../>}
    <header className="sticky top-0 z-50 ...">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link href="/dashboard">{logo}</Link>
        <nav className="hidden lg:flex items-center gap-2 ml-6">
          {navLinks.map(link => <Link className="flex items-center gap-2 px-3 py-2 ...">{icon}{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SubscriptionBadge/>
          <Bell .../>
          <ProfileIcon/>
          <LogoutButton/>           {/* manager only */}
          <MobileMenuButton/>
        </div>
      </div>
      {mobileOpen && <MobileDropdownPanel/>}
    </header>
  </>
);

// AFTER (Phase 1 return)
return (
  <>
    {showDialog && <LogoutDialog .../>}   {/* UNCHANGED JSX */}

    {/* ── Mobile top strip (≤767px) ── */}
    <div className="dash-mobile-topbar lg:hidden">
      <button onClick={() => setMobileOpen(s => !s)}>{mobileOpen ? <X/> : <Menu/>}</button>
      <Link href="/dashboard">{logo}</Link>
      <div className="ml-auto flex items-center gap-2">
        {role !== "manager" && <Bell .../>}          {/* SAME bell JSX, unchanged badge logic */}
        {role !== "manager" && <ProfileIcon/>}        {/* SAME icon JSX */}
      </div>
    </div>

    {/* ── Mobile drawer backdrop ── */}
    {mobileOpen && (
      <div className="lg:hidden fixed inset-0 z-[60] bg-black/50" onClick={() => setMobileOpen(false)} />
    )}

    {/* ── THE SIDEBAR ── */}
    <aside className={`dash-sidebar ${collapsed ? "dash-sidebar-collapsed" : ""} ${mobileOpen ? "dash-sidebar-open" : ""}`}>
      <div className="dash-sidebar-header">
        <Link href="/dashboard">{logo}{!collapsed && <span>IceCream Inventory</span>}</Link>
        <button className="hidden lg:flex" onClick={() => setCollapsed(s => !s)}>
          {collapsed ? <ChevronRight/> : <ChevronLeft/>}   {/* new icons from existing lucide-react import set */}
        </button>
      </div>

      <nav className="dash-sidebar-nav">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`dash-nav-link ${pathname === href ? "dash-nav-link-active" : ""}`}>
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
            {collapsed && <span className="dash-tooltip">{label}</span>}  {/* CSS-only tooltip, no JS lib */}
          </Link>
        ))}
      </nav>

      {/* ── Sidebar footer: subscription badge + profile + bell + logout ── */}
      <div className="dash-sidebar-footer">
        {role !== "manager" && <SubscriptionBadge/>}            {/* SAME component, SAME import */}
        {role !== "manager" && (
          <Link href={requestsHref} className="dash-nav-link">
            <Bell .../>{!collapsed && <span>Delivery Requests</span>}{pendingCount>0 && <Badge/>}
          </Link>
        )}
        {role !== "manager" && (
          <Link href="/dashboard/profile" className="dash-nav-link">
            <UserCircle/>{!collapsed && <span>Profile</span>}
          </Link>
        )}
        {role === "manager" && (
          <button onClick={() => setShowDialog(true)} className="dash-nav-link dash-nav-link-danger">
            <LogOut/>{!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </aside>
  </>
);
```

**Important behavioral preservation notes:**
- `navLinks` array (lines 52-65) is **untouched** — same items, same order, same `role === "manager"` filter for "Sales".
- `requestsHref`, `handleLogout`, notification polling `useEffect`, user-loading `useEffect` are **untouched**.
- Mobile-only extra links currently inside the dropdown (Subscription, Profile, Delivery Requests, Logout for admin path — lines 263-307 of the current file) are **folded into the sidebar's main `nav`/`footer`** since the sidebar drawer now IS the mobile menu — there is no longer a need for a *separate* "mobile-only" link list, because the sidebar (with footer) renders identically whether opened via drawer (mobile) or always-visible (desktop). This reduces duplicated JSX rather than adding any.
- `SubscriptionBadge` import and usage (line 25 / 175) stays **exactly as-is** — just relocated to the footer block. Its internal implementation is not touched (and per repo audit, its source is a non-standard-encoding file we deliberately do not open/edit).

### 3.2 FILE: `src/app/globals.css` (additive only)

Add CSS variables + sidebar utility classes used by `dash-sidebar*` classNames above. **Nothing existing is removed or reordered** — these are appended after the existing rules.

```css
/* ── Sidebar layout tokens (Phase 1) ── */
:root {
  --sidebar-w-expanded: 248px;
  --sidebar-w-collapsed: 72px;
  --sidebar-mobile-topbar-h: 56px;
}

.dash-sidebar {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: var(--sidebar-w-expanded);
  background: linear-gradient(180deg, #020617 0%, #020b2c 60%, #031136 100%);
  border-right: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  z-index: 50;
  transition: width 0.2s ease, transform 0.2s ease;
  overflow-y: auto;
}
.dash-sidebar-collapsed { width: var(--sidebar-w-collapsed); }

.dash-sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); min-height: 64px;
}

.dash-sidebar-nav { flex: 1; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px; }
.dash-sidebar-footer { padding: 12px 8px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 2px; }

.dash-nav-link {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  color: #cbd5e1; font-size: 13.5px; font-weight: 500;
  text-decoration: none; transition: all .15s ease; position: relative;
}
.dash-nav-link:hover { background: rgba(255,255,255,0.08); color: #67e8f9; }
.dash-nav-link-active { background: rgba(34,211,238,0.15); color: #22d3ee; }
.dash-nav-link-danger { color: #f87171; }
.dash-nav-link-danger:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

/* Collapsed-state hover tooltip (CSS only) */
.dash-tooltip { display: none; }
.dash-sidebar-collapsed .dash-nav-link:hover .dash-tooltip {
  display: block; position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
  background: #0f172a; color: #e2e8f0; padding: 4px 10px; border-radius: 6px;
  font-size: 12px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 70;
}

/* Mobile top strip */
.dash-mobile-topbar {
  position: sticky; top: 0; z-index: 55; height: var(--sidebar-mobile-topbar-h);
  display: flex; align-items: center; gap: 12px; padding: 0 16px;
  background: linear-gradient(90deg, #020617, #020b2c, #031136);
  border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff;
}

/* Mobile drawer behavior */
@media (max-width: 1023px) {
  .dash-sidebar {
    transform: translateX(-100%);
    width: var(--sidebar-w-expanded) !important; /* always full width when used as drawer */
  }
  .dash-sidebar-open { transform: translateX(0); }
}

/* ── Content offset helper (used by every page's outer <main> wrapper) ── */
.dash-content-offset {
  margin-left: 0; /* mobile default — sidebar is an overlay drawer */
  padding-top: var(--sidebar-mobile-topbar-h);
}
@media (min-width: 1024px) {
  .dash-content-offset { margin-left: var(--sidebar-w-expanded); padding-top: 0; }
  .dash-sidebar-collapsed ~ .dash-content-offset { margin-left: var(--sidebar-w-collapsed); }
}
```

> **Note on the "collapsed ~ sibling" selector above:** CSS general-sibling selectors only work if `.dash-sidebar` and the element with `.dash-content-offset` are **siblings in the DOM** (which they are — `<aside>` then `<div className="flex flex-col min-h-screen ..."> ` in every page). If during implementation this proves fragile across pages, the fallback (still zero new files) is to lift `collapsed` state via a tiny shared `localStorage`-driven `useEffect` in each page that reads the same key and toggles `dash-content-offset`/`dash-content-offset-collapsed` via a state class — this is a **same-file** addition to each page's existing `useEffect` block, not a new file.

### 3.3 FILES: All 12 pages listed in §0 — wrapper edit pattern

For **every** page currently shaped like:

```tsx
return (
  <div className="flex flex-col min-h-screen bg-gray-50">
    <DashboardNavbar />
    <main className="flex-grow ...">
      ...
    </main>
    <Footer />
  </div>
);
```

The edit is a **2-line change**:

```tsx
return (
  <div className="flex flex-col min-h-screen bg-gray-50 dash-content-offset">
    <DashboardNavbar />
    <main className="flex-grow ...">
      ...
    </main>
    <Footer />
  </div>
);
```

Only the `className` on the outermost `<div>` gains `dash-content-offset` (one class appended — every existing class like `bg-gray-50`, `bg-slate-50`, `bg-[#f8f9fb]` etc. is **kept as-is**, so each page's individual background color is preserved). `<DashboardNavbar />`'s position is unchanged in the JSX (it's now rendered as a `fixed`-positioned `<aside>` regardless of where it sits in the tree, so leaving the `<DashboardNavbar />` call exactly where it already is in each file is correct and requires no relocation).

**Per-file line references for this 1-class addition:**

| File | Line with outer `<div>` className to edit |
|---|---|
| `src/app/dashboard/page.tsx` | line 248: `<div className="flex flex-col min-h-screen bg-gray-50">` |
| `src/app/dashboard/products/page.tsx` | line 282: `<div className="min-h-screen flex flex-col bg-gray-50">` |
| `src/app/dashboard/stocks/page.tsx` | line 254: `<div className="flex flex-col min-h-screen bg-gray-50">` |
| `src/app/dashboard/stocks/restock/page.tsx` | line 163: `<div className="flex flex-col min-h-screen bg-gray-50">` |
| `src/app/dashboard/stocks/history/page.tsx` | line 130: `<div className="flex flex-col min-h-screen bg-gray-50">` |
| `src/app/dashboard/customers/page.tsx` | line 357: `<div className="flex min-h-screen flex-col bg-slate-50">` |
| `src/app/dashboard/customers/[customerId]/history/page.tsx` | line 338: `<div className="flex min-h-screen flex-col bg-slate-50">` |
| `src/app/dashboard/orders/page.tsx` | line 852: `<div className="flex flex-col min-h-screen bg-[#f8f9fb]">` |
| `src/app/dashboard/delivery-requests/page.tsx` | line 186: `<div className="min-h-screen bg-gray-50 flex flex-col">` |
| `src/app/dashboard/delivery/live-map/page.tsx` | line 29: `<div className="flex flex-col min-h-screen bg-slate-50">` (also the `FeatureGateScreen`'s inner return at line ~30 — both wrappers in this file get the class) |
| `src/app/dashboard/delivery/live-map/[partnerId]/page.tsx` | line 440: `<div className="flex min-h-screen flex-col bg-slate-50">` |
| `src/app/dashboard/profile/page.tsx` | line 325: `<div className="flex flex-col min-h-screen bg-gray-100">` (also its loading-state return at line 210 — both get the class) |

> **`stocks/page.tsx` and `stocks/restock/page.tsx` also have an early-return "loading/empty" state** (e.g. `stocks/page.tsx` line 245, `stocks/restock/page.tsx` line 154) — those wrapper `<div>`s should **also** receive `dash-content-offset` so the loading screen doesn't render under the sidebar either.

### Phase 1 — Files affected (summary)
1. `src/app/components/DashboardNavbar.tsx` — full structural rewrite (header → sidebar + mobile topbar + drawer), same component name/export, same props (none), same imports plus `ChevronLeft`/`ChevronRight` added to the existing `lucide-react` import line.
2. `src/app/globals.css` — additive CSS block (sidebar tokens, `.dash-sidebar*`, `.dash-nav-link*`, `.dash-mobile-topbar`, `.dash-content-offset`).
3–14. The **12 page files** in the table above — each gets exactly one className addition (`dash-content-offset`) on 1–2 wrapper `<div>`s.

### Phase 1 — Acceptance checklist
- [ ] Sidebar visible on left at ≥1024px, full vertical height, dark gradient background matching old navbar's gradient.
- [ ] All 7 (or 8, with Sales) nav items present, same hrefs, same active-state highlight logic as before.
- [ ] Collapse toggle shrinks sidebar to icon rail; hovering a collapsed icon shows a CSS tooltip with the label.
- [ ] At <1024px, sidebar is hidden; a 56px dark top strip with hamburger + logo + bell + profile appears.
- [ ] Tapping hamburger slides the sidebar in over a dark backdrop; tapping backdrop or a link closes it.
- [ ] Every one of the 12 pages renders its content to the right of (desktop) / below (mobile) the sidebar — no overlap, no double scrollbars.
- [ ] Logout dialog, notification polling, subscription badge, role-based item visibility (`manager` vs `admin`) all behave identically to before.
- [ ] No new `.tsx`/`.ts`/`.css` files exist; `git status` shows only the 14 files above modified.

---

## 4. PHASE 2 — Subsidebar (Grouped Secondary Navigation)

### Goal
Within the **same `DashboardNavbar.tsx`** sidebar, turn select primary items into **expandable groups** that reveal a nested list of "other options" — i.e., a subsidebar. Two groups are introduced using content that **already exists elsewhere in the codebase** (so nothing is invented):

1. **"Stocks" group** → expands to: `Overview` (`/dashboard/stocks`), `Restock` (`/dashboard/stocks/restock`), `History` (`/dashboard/stocks/history`). These three routes already exist (Phase 1 confirmed all three have working `page.tsx` files); today they're reached only via buttons inside `StockHeader.tsx`. The sidebar subgroup gives them a persistent nav entry point too — **`StockHeader.tsx`'s existing buttons are left untouched** (per "no option interchange", we add a navigation path, we don't remove the existing one).
2. **"Profile" group** → expands to the **same 11 items** currently defined in `profile/page.tsx`'s `navItems` array (Basic Information, Bill Details, Bank Details, Product Settings, Delivery Partners, Managers, Active Sessions, Change Password, Serial Bill Number, Subscription, Logout). Clicking one of these in the sidebar navigates to `/dashboard/profile` **and** sets `localStorage`/query-driven initial tab so `profile/page.tsx` opens directly on that tab (see 4.3).

### 4.1 FILE: `src/app/components/DashboardNavbar.tsx` (additive change to the `nav` section built in Phase 1)

**New local state:** `expandedGroup: string | null` (which group, if any, is expanded — `"stocks" | "profile" | null`). Default: auto-expand based on `pathname` (e.g. if `pathname.startsWith("/dashboard/stocks")`, default `expandedGroup = "stocks"`).

**Data additions (in-file constants, not new files):**

```tsx
// Added alongside the existing `navLinks` array — same file, same scope
const stocksSubLinks = [
  { href: "/dashboard/stocks", label: "Overview" },
  { href: "/dashboard/stocks/restock", label: "Restock" },
  { href: "/dashboard/stocks/history", label: "History" },
];

// Mirrors profile/page.tsx's navItems labels/tabs (kept in sync manually —
// see 4.3 for why these stay as simple {label, tab} pairs here)
const profileSubLinks: { label: string; tab: string }[] = [
  { label: "Basic Information", tab: "basic" },
  { label: "Bill Details", tab: "billing" },
  { label: "Bank Details", tab: "bank" },
  { label: "Product Settings", tab: "product-settings" },
  { label: "Delivery Partners", tab: "delivery" },
  { label: "Managers", tab: "managers" },
  { label: "Active Sessions", tab: "sessions" },
  { label: "Change Password", tab: "password" },
  { label: "Serial Bill Number", tab: "serial" },
  { label: "Subscription", tab: "subscription" },
];
```

**Render change** — the existing `navLinks.map(...)` loop (built in Phase 1) is extended: for the two items whose `href` is `/dashboard/stocks` or `/dashboard/profile`, render a group header (clickable to toggle expand) followed by an indented sublist when expanded:

```tsx
{navLinks.map(({ href, label, icon: Icon }) => {
  const isStocksGroup = href === "/dashboard/stocks";
  const isProfileGroup = href === "/dashboard/profile" /* only relevant if Profile is ever added to navLinks — see note below */;
  const group = isStocksGroup ? "stocks" : isProfileGroup ? "profile" : null;

  if (!group) {
    // Phase 1 behavior — plain link, unchanged
    return <Link key={href} href={href} className={...}><Icon/>{!collapsed && label}</Link>;
  }

  const isExpanded = expandedGroup === group;
  return (
    <div key={href}>
      <button
        onClick={() => !collapsed && setExpandedGroup(isExpanded ? null : group)}
        className={`dash-nav-link w-full justify-between ${pathname.startsWith(href) ? "dash-nav-link-active" : ""}`}
      >
        <span className="flex items-center gap-3"><Icon size={18}/>{!collapsed && label}</span>
        {!collapsed && <ChevronDown size={14} className={isExpanded ? "rotate-180" : ""} style={{transition:"transform .15s"}}/>}
      </button>

      {!collapsed && isExpanded && (
        <div className="dash-subsidebar">
          {(group === "stocks" ? stocksSubLinks : []).map(sub => (
            <Link key={sub.href} href={sub.href}
              className={`dash-subnav-link ${pathname === sub.href ? "dash-subnav-link-active" : ""}`}>
              {sub.label}
            </Link>
          ))}
          {group === "profile" && profileSubLinks.map(sub => (
            <Link key={sub.tab} href={`/dashboard/profile?tab=${sub.tab}`}
              className="dash-subnav-link">
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
})}
```

> **Important — "Profile" is not currently in `navLinks`.** Looking at the existing `navLinks` array (Phase 1, unchanged from today), `Profile` is **not** one of the 7/8 top-level items — it's accessed via the standalone profile icon in the old navbar's right cluster (now in the sidebar footer per Phase 1). To honor **"no option interchange"**, Phase 2 does **not** move Profile out of the footer into the main `navLinks` loop. Instead, the **Profile group/subsidebar is rendered directly under the footer's existing Profile link** (same `dash-sidebar-footer` block from Phase 1), using the identical expand/collapse mechanism:

```tsx
{/* inside dash-sidebar-footer, replacing the Phase-1 plain Profile <Link> */}
{role !== "manager" && (
  <div>
    <button
      onClick={() => !collapsed && setExpandedGroup(expandedGroup === "profile" ? null : "profile")}
      className={`dash-nav-link w-full justify-between ${pathname.startsWith("/dashboard/profile") ? "dash-nav-link-active" : ""}`}
    >
      <span className="flex items-center gap-3"><UserCircle size={18}/>{!collapsed && "Profile"}</span>
      {!collapsed && <ChevronDown size={14} className={expandedGroup === "profile" ? "rotate-180" : ""} />}
    </button>
    {!collapsed && expandedGroup === "profile" && (
      <div className="dash-subsidebar">
        {profileSubLinks.map(sub => (
          <Link key={sub.tab} href={`/dashboard/profile?tab=${sub.tab}`} className="dash-subnav-link">
            {sub.label}
          </Link>
        ))}
      </div>
    )}
  </div>
)}
```

This keeps the **exact same footer position** Profile had in Phase 1 (no interchange of where "Profile" lives), while adding the requested "subsidebar with other options" beneath it.

**New icons needed:** `ChevronDown` — add to the existing `lucide-react` import line (already imports `Map`, `CreditCard`, etc., so this is a one-name addition to an existing import statement, not a new import statement).

### 4.2 FILE: `src/app/globals.css` (additive — subsidebar styling)

```css
.dash-subsidebar {
  display: flex; flex-direction: column; gap: 1px;
  margin: 2px 0 2px 30px; /* indent under the parent icon */
  border-left: 1px solid rgba(255,255,255,0.08);
  padding-left: 10px;
}
.dash-subnav-link {
  padding: 7px 10px; border-radius: 6px;
  color: #94a3b8; font-size: 12.5px; font-weight: 500;
  text-decoration: none; transition: all .15s ease;
}
.dash-subnav-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.dash-subnav-link-active { background: rgba(34,211,238,0.12); color: #22d3ee; }
```

### 4.3 FILE: `src/app/dashboard/profile/page.tsx` (small additive change — read `?tab=` query param)

So that subsidebar links like `/dashboard/profile?tab=bank` actually open the Bank Details tab, `profile/page.tsx` needs to **initialize `activeTab` from the URL search param** instead of always defaulting to `"basic"`.

**Current (line 31):**
```tsx
const [activeTab, setActiveTab] = useState<ActiveTab>("basic");
```

**Change to** (uses Next's existing `useRouter`/navigation utilities — `useSearchParams` is added to the **existing** `next/navigation` import on line 5, which already imports `useRouter`):

```tsx
// line 5 — extend existing import:
import { useRouter, useSearchParams } from "next/navigation";

// line 31 area — initialize from query string, fallback to "basic":
const searchParams = useSearchParams();
const initialTab = (searchParams.get("tab") as ActiveTab) || "basic";
const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
```

This is a **2-line edit inside an already-`"use client"` file** that already manages `activeTab` via local state — no new file, no new component, no routing restructure (Next.js App Router supports `useSearchParams` in any client component without extra config).

> If the team prefers **not** to touch `profile/page.tsx` at all in Phase 2, the alternative (zero edits to `profile/page.tsx`) is to have the sidebar's `profileSubLinks` write the desired tab to `localStorage` (`localStorage.setItem("profileInitialTab", sub.tab)`) before navigating, and have `profile/page.tsx`'s **existing** `useEffect` (the one that already runs `loadProfile()` on mount, lines ~45+) read that key once and call `setActiveTab(...)`. Either approach is a same-file, few-line addition — pick whichever the team finds cleaner during implementation. The query-param approach above is recommended because it's shareable/bookmarkable.

### Phase 2 — Files affected (summary)
1. `src/app/components/DashboardNavbar.tsx` — add `expandedGroup` state, `stocksSubLinks`/`profileSubLinks` constants, group-header rendering for the Stocks `navLinks` entry, and an expandable Profile block in the footer; add `ChevronDown` to existing lucide import.
2. `src/app/globals.css` — additive `.dash-subsidebar` / `.dash-subnav-link*` rules.
3. `src/app/dashboard/profile/page.tsx` — 2-line change to seed `activeTab` from `?tab=` query param via `useSearchParams` (added to existing `next/navigation` import).

### Phase 2 — Acceptance checklist
- [ ] Clicking "Stocks" in the sidebar expands an indented sublist: Overview / Restock / History, each navigating correctly and highlighting when active.
- [ ] Clicking "Profile" (footer) expands the same 11-item list seen today inside `profile/page.tsx`'s own sidebar.
- [ ] Navigating to `/dashboard/profile?tab=bank` (via sidebar) opens directly on "Bank Details" — `profile/page.tsx`'s own internal sidebar still works exactly as before for in-page switching.
- [ ] Collapsed sidebar (icon-only) does not show subsidebars (groups can't usefully expand at 72px) — clicking a group icon while collapsed simply navigates to the group's primary route (`/dashboard/stocks` or `/dashboard/profile`) as a graceful fallback.
- [ ] `StockHeader.tsx`'s Restock/History buttons still work unchanged (we added a path, didn't remove one).
- [ ] No new files; still 15 files modified total (12 from Phase 1 list, +0 new, with `profile/page.tsx` now also touched — it was already in the Phase 1 list).

---

## 5. PHASE 3 — Tab-Style Page Navigation + Visual SaaS Polish Pass

### Goal
Two things:
1. **Add a tab strip** to the three "Stocks group" pages (`stocks/page.tsx`, `stocks/restock/page.tsx`, `stocks/history/page.tsx`) so that — in addition to the Phase 2 sidebar subgroup — users see **Overview | Restock | History** as horizontal tabs at the top of the content area, matching the **exact visual pattern already used in `dashboard/page.tsx`** (the colored pill-button tab strip).
2. **Professional polish pass**: apply consistent spacing/breadcrumb-style page headers across the now-sidebar'd layout so the whole dashboard reads as one cohesive SaaS product (subscription badge + bell + profile relocated to a slim top strip on desktop too — not just mobile — for parity).

### 5.1 The reusable tab-strip pattern (copied from `dashboard/page.tsx`, adapted)

`dashboard/page.tsx` (Phase 1 untouched logic, lines 160-188 and 268-312) defines:
- A `getButtonClasses(tabId, color)` helper returning Tailwind classes for active/inactive pill buttons.
- A `<div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4"><div className="flex flex-wrap gap-2 sm:gap-3">...buttons...</div></div>` wrapper.

For the Stocks group, instead of `setActiveTab` (in-page state), each "tab" is a **`<Link>` to a different route** (`/dashboard/stocks`, `/dashboard/stocks/restock`, `/dashboard/stocks/history`) with `pathname === href` determining the active style — i.e., the **same visual classes**, but driven by `usePathname()` instead of local tab state (since these are separate pages, not separate panels of one page).

### 5.2 FILE: `src/app/dashboard/stocks/page.tsx`

**Add** (near the top of the file, alongside other imports — `usePathname` is added to the existing `next/navigation` import which already has `useRouter`):

```tsx
import { useRouter, usePathname } from "next/navigation";
import { Boxes, RefreshCw, History as HistoryIcon } from "lucide-react"; // extend existing lucide import
```

**Insert the tab strip** immediately inside `<main>`, before the existing `<StockHeader .../>` call (around current line 258):

```tsx
const pathname = usePathname();
const stockTabs = [
  { href: "/dashboard/stocks", label: "Overview", icon: Boxes },
  { href: "/dashboard/stocks/restock", label: "Restock", icon: RefreshCw },
  { href: "/dashboard/stocks/history", label: "History", icon: HistoryIcon },
];

// ...inside <main>, before <StockHeader .../>:
<div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
  <div className="flex flex-wrap gap-2 sm:gap-3">
    {stockTabs.map(({ href, label, icon: Icon }) => {
      const active = pathname === href;
      return (
        <Link key={href} href={href}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all border
            ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}`}>
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </Link>
      );
    })}
  </div>
</div>
```

(`Link` from `next/link` is already imported in this file's sibling pages; if `stocks/page.tsx` doesn't currently import it, add `import Link from "next/link";` to its existing import block — still not a new file.)

### 5.3 FILE: `src/app/dashboard/stocks/restock/page.tsx`

Same tab strip block as 5.2, inserted at the top of `<main>` (current line ~166, after `<DashboardNavbar />`/wrapper, before the page's existing title row at line ~169). Requires the same `usePathname` + icon imports added to this file's existing import statements.

### 5.4 FILE: `src/app/dashboard/stocks/history/page.tsx`

Same tab strip block, inserted at the top of `<main>` (current line ~133, before the existing title row at line ~136). Same import additions.

> **Why three separate edits instead of one shared block?** Because "no new files / no new components" rules out extracting this into a shared `StockTabs.tsx`. Duplicating ~15 lines of JSX three times (each already importing `Link`, `usePathname`, and 3 lucide icons that are cheap/likely-already-present) is the correct trade-off under the stated constraints. If constraints relax in a future task, this is the natural extraction point.

### 5.5 Desktop top strip — promote subscription badge / bell / profile to be visible at all breakpoints

Phase 1 placed `SubscriptionBadge`, the notification bell, and the profile icon into the **sidebar footer** (always visible on desktop since the sidebar is always visible) and into the **mobile top strip**. Phase 3 polish: for users who **collapse** the sidebar to the 72px icon rail on desktop, the footer icons become icon-only too (consistent — no change needed, Phase 1's `{!collapsed && <span>...}` pattern already degrades gracefully). 

The one **additive** polish item: render the **same mobile top strip** (`dash-mobile-topbar`, built in Phase 1) on **desktop too** when the sidebar is collapsed, so the subscription badge/bell/profile have a persistent horizontal home even at 72px. This is done by changing the Phase-1 className from:

```tsx
<div className="dash-mobile-topbar lg:hidden">
```
to:
```tsx
<div className={`dash-mobile-topbar ${collapsed ? "" : "lg:hidden"}`}>
```

i.e., the top strip is hidden on desktop **only when the sidebar is expanded** (because then the footer already shows these items with labels); when collapsed, the top strip reappears to host them with room for labels. One-line className change in `DashboardNavbar.tsx` (file already being edited in Phases 1–2).

### 5.6 FILE: `src/app/globals.css` — final polish rules (additive)

```css
/* Phase 3 — page header breadcrumb-style spacing consistency */
.dash-page-header {
  display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px;
}
.dash-page-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
.dash-page-header p { font-size: 0.875rem; color: #64748b; }

/* Smooth content shift when sidebar collapses (desktop only) */
@media (min-width: 1024px) {
  .dash-content-offset { transition: margin-left 0.2s ease; }
}
```

`.dash-page-header` is an **optional convenience class** — applying it to each page's existing title block (e.g. `StockHeader.tsx`'s `<h1>Stock Management</h1>` wrapper, `OrderList`'s header, `CustomerList`'s header, etc.) is a **cosmetic, non-breaking** addition the team can roll out incrementally per page without any structural risk; it does not gate Phase 3's functional completion.

### Phase 3 — Files affected (summary)
1. `src/app/dashboard/stocks/page.tsx` — add tab strip (Overview/Restock/History), extend `next/navigation` and `lucide-react` imports, add `Link` import if missing.
2. `src/app/dashboard/stocks/restock/page.tsx` — same tab strip + import additions.
3. `src/app/dashboard/stocks/history/page.tsx` — same tab strip + import additions.
4. `src/app/components/DashboardNavbar.tsx` — one-line className change so the top strip also appears on desktop when collapsed.
5. `src/app/globals.css` — additive `.dash-page-header` + transition polish rules.

### Phase 3 — Acceptance checklist
- [ ] Visiting `/dashboard/stocks`, `/dashboard/stocks/restock`, `/dashboard/stocks/history` shows the same 3-tab strip at the top of each, with the current page's tab visually active (blue pill), matching `dashboard/page.tsx`'s tab styling.
- [ ] Tab strip and sidebar subgroup (Phase 2) stay in sync — navigating via either updates the other's active state (both derive from `pathname`).
- [ ] Collapsing the sidebar on desktop reveals the horizontal top strip with subscription badge/bell/profile.
- [ ] All existing functionality on the three Stocks pages (search, filters, export, restock form, history table, etc.) is untouched — only a tab strip was prepended.
- [ ] Full responsive pass: 320px (small phone), 768px (tablet), 1024px+ (desktop) all render without horizontal scroll, overlap, or hidden-but-needed controls.
- [ ] Final file count check: **15 files modified total**, 0 created, 0 deleted, across all 3 phases combined.

---

## 6. CONSOLIDATED FILE-CHANGE MATRIX (ALL PHASES)

| File | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| `src/app/components/DashboardNavbar.tsx` | Header→Sidebar rewrite, mobile drawer, collapse state | Add subgroup expand state + Stocks/Profile subsidebars | 1-line: top strip visible on desktop when collapsed |
| `src/app/globals.css` | Sidebar/topbar/offset CSS vars & classes | Subsidebar CSS | Page-header + transition polish CSS |
| `src/app/dashboard/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/products/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/stocks/page.tsx` | `dash-content-offset` class (incl. loading state) | — | Tab strip (Overview/Restock/History) |
| `src/app/dashboard/stocks/restock/page.tsx` | `dash-content-offset` class (incl. loading state) | — | Tab strip |
| `src/app/dashboard/stocks/history/page.tsx` | `dash-content-offset` class | — | Tab strip |
| `src/app/dashboard/customers/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/customers/[customerId]/history/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/orders/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/delivery-requests/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/delivery/live-map/page.tsx` | `dash-content-offset` class (both returns) | — | — |
| `src/app/dashboard/delivery/live-map/[partnerId]/page.tsx` | `dash-content-offset` class | — | — |
| `src/app/dashboard/profile/page.tsx` | `dash-content-offset` class (both returns) | `useSearchParams` → seed `activeTab` from `?tab=` | — |

**Total unique files modified: 15. New files created: 0. New components created: 0.**

---

## 7. ROLLBACK PLAN

Because every change is additive-CSS-class or in-place-JSX-restructure within existing files:
- **Phase 1 rollback**: revert `DashboardNavbar.tsx` to its pre-Phase-1 version and remove the `dash-content-offset` class from the 13 page wrappers (each is a single class removal). `globals.css` additions can remain harmlessly unused.
- **Phase 2 rollback**: remove the subgroup JSX/state from `DashboardNavbar.tsx` (falls back to Phase 1's plain links) and revert the 2-line `profile/page.tsx` change.
- **Phase 3 rollback**: remove the 3 tab-strip blocks (each is a self-contained JSX block with its own `stockTabs` array — delete the block and its 2-3 added import names).

Each phase is independently shippable and independently revertible without touching the other phases' files in incompatible ways.