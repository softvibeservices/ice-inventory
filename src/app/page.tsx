// src/app/page.tsx
// Server Component — fully crawlable, no client JS needed

import Link from "next/link";

const FEATURES: { id: string; title: string; desc: string }[] = [
  {
    id: "product-management",
    title: "Product Management",
    desc: "Add, edit and delete your ice cream products. Set categories, units, MRP, selling price, pack size and minimum stock level. Import multiple products at once from a CSV or Excel file.",
  },
  {
    id: "customer-management",
    title: "Customer Management",
    desc: "Store complete customer records — shop name, multiple contacts, area, address and GPS location. The system automatically tracks each customer's credit, debit and total sales.",
  },
  {
    id: "order-management",
    title: "Order Management",
    desc: "Create orders with paid and free items, apply discounts and track every order from creation to settlement. Settle via Cash or Bank/UPI, mark as Debt, or discard. Filter by Unsettled, Settled, Debt and Discarded tabs.",
  },
  {
    id: "gst-billing",
    title: "GST Billing and PDF Invoices",
    desc: "Generate GST-compliant invoices with your business logo, QR code, digital signature and GSTIN. Every bill includes a unique serial number and can be downloaded as a print-ready PDF instantly.",
  },
  {
    id: "stock-management",
    title: "Stock Management",
    desc: "See live stock levels for every product. Get automatic low-stock alerts when a product drops below your set threshold. Reset all stock at once for a new period.",
  },
  {
    id: "restock-history",
    title: "Restock History",
    desc: "Log every restock with product, quantity added and a reason note. Upload bulk restock quantities from a CSV or Excel file. View the full restock history and export it as a PDF.",
  },
  {
    id: "sales-analytics",
    title: "Sales Analytics",
    desc: "Filter sales by date range. View total sales, number of orders, average order value, cash collected, bank/UPI collected and outstanding dues. See daily sales trends and your top customers by outstanding balance.",
  },
  {
    id: "customer-ledger",
    title: "Customer Ledger",
    desc: "View a complete transaction history per customer — every sale, payment and adjustment listed chronologically with running credit, debit and net balance totals.",
  },
  {
    id: "delivery-partner-management",
    title: "Delivery Partner Management",
    desc: "Register delivery staff and control who gets access. Review and approve or reject partner requests. Assign orders to partners and track delivery status from Pending to On the Way to Delivered.",
  },
  {
    id: "live-gps-tracking",
    title: "Live GPS Delivery Tracking",
    desc: "Delivery partners share their live location from their phone. You see their real-time position on an interactive map so you always know where your deliveries are.",
  },
  {
    id: "manager-roles",
    title: "Manager Accounts",
    desc: "Create accounts for your staff with manager-level access. Managers can use the same dashboard with permissions set by you. Each manager has their own secure login.",
  },
  {
    id: "sticky-notes",
    title: "Sticky Notes",
    desc: "Create quick order notes for a customer and assign them to a delivery partner for dispatch. Useful for planning before a formal order is created.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is IceCream Inventory?",
    a: "IceCream Inventory is a complete management platform for ice cream wholesalers and retailers. It handles your products, customers, orders, billing, stock, delivery partners and sales reports — all from one dashboard.",
  },
  {
    q: "Does it support GST billing?",
    a: "Yes. You can generate GST-compliant PDF invoices with your business logo, QR code, digital signature, GSTIN and full itemised product details. Every invoice gets a unique serial number automatically.",
  },
  {
    q: "Can I track my delivery staff in real time?",
    a: "Yes. Delivery partners share their GPS location from their phone and you can see their live position on a map directly from your dashboard.",
  },
  {
    q: "Can I import products and stock in bulk?",
    a: "Yes. You can upload products and restock quantities in bulk using a CSV or Excel file. The platform provides a sample file format guide inside.",
  },
  {
    q: "Can I add staff or manager accounts?",
    a: "Yes. You can create manager accounts for your staff. They get access to the same dashboard and you control their permissions.",
  },
  {
    q: "How do delivery partners log in?",
    a: "Delivery partners have a separate mobile-friendly login. They receive a one-time password on their email to sign in securely. You approve each partner before they can access any orders.",
  },
  {
    q: "What can I export as PDF?",
    a: "You can export GST invoices, customer reports, restock history and stock history summaries as formatted PDFs directly from the dashboard.",
  },
  {
    q: "How does stock update when I create an order?",
    a: "Stock is deducted automatically every time an order is created. You always see the current quantity without any manual update needed.",
  },
];

export default function HomePage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:text-sm focus:rounded"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-[#020b1a] text-white">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#020b1a]/95 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-sm select-none">❄</span>
              <span className="font-semibold text-sm text-white tracking-tight">IceCream Inventory</span>
            </div>
            <nav aria-label="Primary navigation" className="flex items-center gap-1">
              <Link href="#features" className="hidden sm:block px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Features</Link>
              <Link href="#how-it-works" className="hidden sm:block px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">How it Works</Link>
              <Link href="#faq" className="hidden sm:block px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">FAQ</Link>
              <Link href="/login" className="ml-2 px-3 py-1.5 text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded transition-colors">Login</Link>
              <Link href="/register" className="ml-1 px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-colors">Get Started</Link>
            </nav>
          </div>
        </header>

        <main id="main-content">

          {/* ── HERO ── */}
          <section aria-labelledby="hero-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded border border-cyan-500/25 bg-cyan-500/5 text-[11px] font-mono text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Built for ice cream wholesale businesses
              </div>

              <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white max-w-3xl">
                Run your ice cream wholesale business from{" "}
                <span className="text-cyan-400">one dashboard</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
                Products, customers, orders, GST invoices, stock alerts, delivery tracking and sales reports — everything your business needs, in one place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold rounded transition-colors"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded transition-colors"
                >
                  Sign In →
                </Link>
              </div>

              <div className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <div className="text-xl font-bold text-cyan-400">12</div>
                  <div className="text-xs text-slate-500 mt-0.5">Business modules</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-400">GST</div>
                  <div className="text-xs text-slate-500 mt-0.5">Compliant PDF invoices</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-400">Live</div>
                  <div className="text-xs text-slate-500 mt-0.5">GPS delivery tracking</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-cyan-400">Auto</div>
                  <div className="text-xs text-slate-500 mt-0.5">Stock deduction on orders</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" aria-labelledby="features-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="mb-10">
                <p className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-2">What you get</p>
                <h2 id="features-heading" className="text-2xl sm:text-3xl font-bold text-white">
                  Everything your business needs, nothing it doesn't
                </h2>
                <p className="mt-3 text-sm text-slate-400 max-w-xl">
                  12 modules built specifically for ice cream wholesale operations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-lg overflow-hidden border border-white/[0.06]">
                {FEATURES.map((f, i) => (
                  <article key={f.id} id={f.id} className="bg-[#020b1a] p-5 hover:bg-white/[0.025] transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-mono text-cyan-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section id="how-it-works" aria-labelledby="workflow-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="mb-10">
                <p className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-2">How it works</p>
                <h2 id="workflow-heading" className="text-2xl sm:text-3xl font-bold text-white">
                  Up and running in minutes
                </h2>
                <p className="mt-3 text-sm text-slate-400 max-w-xl">
                  A straightforward setup that matches how your business already works.
                </p>
              </div>

              <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    n: "01",
                    title: "Create your account",
                    desc: "Register with your name, email and shop name. Verify your email with a one-time password. Then set up your seller profile — GST number, logo, QR code, digital signature and bank details.",
                  },
                  {
                    n: "02",
                    title: "Add your products",
                    desc: "Add your ice cream products one by one or import them all at once from an Excel or CSV file. Set the selling price, MRP, category, unit and minimum stock level for each.",
                  },
                  {
                    n: "03",
                    title: "Add your customers",
                    desc: "Create records for each of your wholesale customers. Add their shop name, contacts, area and address. The system tracks their dues and payments automatically.",
                  },
                  {
                    n: "04",
                    title: "Create orders",
                    desc: "Select a customer and add the products they ordered with quantities. Add free items if any. Apply a discount. Stock is deducted automatically the moment you save the order.",
                  },
                  {
                    n: "05",
                    title: "Bill and collect payment",
                    desc: "Generate a GST invoice as a PDF and share it with your customer. Collect payment via Cash or Bank/UPI and mark the order settled. The customer ledger updates instantly.",
                  },
                  {
                    n: "06",
                    title: "Track your deliveries",
                    desc: "Assign orders to your delivery staff. They update the delivery status from their phone and share their live location. You see exactly where every delivery is on the map.",
                  },
                ].map((s) => (
                  <li key={s.n} className="border border-white/[0.06] rounded-lg p-5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors list-none">
                    <div className="text-[11px] font-mono text-cyan-500 mb-2">{s.n}</div>
                    <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── CAPABILITIES ── */}
          <section id="capabilities" aria-labelledby="capabilities-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="mb-10">
                <p className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-2">In detail</p>
                <h2 id="capabilities-heading" className="text-2xl sm:text-3xl font-bold text-white">
                  A closer look at what each module does
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">GST Billing</h3>
                  <ul className="space-y-2">
                    {[
                      "Your GSTIN, business name and full address on every invoice",
                      "Upload your logo, QR code and digital signature once — used on all invoices",
                      "Separate billing and delivery address per invoice",
                      "Full product table with quantity, unit and price",
                      "Discount applied at order level",
                      "Unique invoice serial number generated automatically",
                      "Download as a print-ready PDF in one click",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">Orders and Payments</h3>
                  <ul className="space-y-2">
                    {[
                      "Add paid items and free items in the same order",
                      "Order statuses: Unsettled, Settled, Debt, Discarded",
                      "Settle via Cash, Bank/UPI or mark the full amount as Debt",
                      "Full payment history per order with amount, method and date",
                      "Filter orders by status tab",
                      "Sort by date, total amount, shop name, area or invoice number",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">Stock and Inventory</h3>
                  <ul className="space-y-2">
                    {[
                      "Live stock quantity per product updated on every order",
                      "Low-stock alert when a product falls below your set minimum",
                      "Reset all stock at once at the start of a new period",
                      "Restock in bulk by uploading a CSV or Excel file",
                      "Add a reason note to every restock for your records",
                      "View and export the complete restock history as a PDF",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">Delivery Management</h3>
                  <ul className="space-y-2">
                    {[
                      "Delivery partners log in from their phone with a secure one-time password",
                      "You approve or reject each partner before they can see any orders",
                      "Partners see their assigned orders and update delivery status",
                      "Status moves from Pending to On the Way to Delivered",
                      "Live GPS location shared from partner's phone to your map",
                      "Assign quick dispatch notes to partners without creating a full order",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">Sales Reports</h3>
                  <ul className="space-y-2">
                    {[
                      "Filter all reports by any date range",
                      "Total sales, number of orders and average order value",
                      "Cash collected vs Bank/UPI collected",
                      "Total outstanding dues across all customers",
                      "Daily sales trend chart",
                      "Top 10 customers by outstanding balance",
                      "Per-customer ledger with every transaction listed",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-2 mb-4">Account and Access</h3>
                  <ul className="space-y-2">
                    {[
                      "Register with email and verify with a one-time password",
                      "Secure login with password and OTP-protected password changes",
                      "Create manager accounts for your staff",
                      "Managers access the dashboard with your set permissions",
                      "Delivery partner accounts are separate from the main dashboard",
                      "All passwords are securely encrypted",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-cyan-500 shrink-0 mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section id="faq" aria-labelledby="faq-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="mb-10">
                <p className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-2">FAQ</p>
                <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-white">
                  Common questions
                </h2>
              </div>

              <dl className="divide-y divide-white/[0.06] max-w-3xl">
                {FAQS.map((faq) => (
                  <div key={faq.q} className="py-5">
                    <dt className="text-sm font-semibold text-white mb-2">{faq.q}</dt>
                    <dd className="text-sm text-slate-400 leading-relaxed">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ── CTA ── */}
          <section id="get-started" aria-labelledby="cta-heading" className="border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
              <p className="text-[11px] font-mono text-cyan-500 uppercase tracking-widest mb-4">Get Started</p>
              <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Start managing your ice cream business today
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-8">
                Create your account, verify your email and you are ready. No setup fees, no complicated onboarding.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-semibold rounded transition-colors"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded transition-colors"
                >
                  Already have an account? Login →
                </Link>
              </div>
            </div>
          </section>

        </main>

        {/* ── FOOTER ── */}
        <footer aria-label="Site footer" className="border-t border-white/[0.06] bg-[#010810]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-cyan-400 text-xs">❄</span>
                  <span className="font-semibold text-sm text-white">IceCream Inventory</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Inventory, billing and delivery management for ice cream wholesalers and retailers.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Platform</h3>
                <ul className="space-y-2">
                  {[
                    { href: "#features", label: "Features" },
                    { href: "#how-it-works", label: "How it Works" },
                    { href: "#capabilities", label: "Capabilities" },
                    { href: "#faq", label: "FAQ" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Features</h3>
                <ul className="space-y-2">
                  {[
                    "Product Management",
                    "Customer Management",
                    "Order Management",
                    "GST Billing",
                    "Stock Management",
                    "Sales Analytics",
                    "Delivery Tracking",
                    "Manager Accounts",
                  ].map((m) => (
                    <li key={m} className="text-xs text-slate-500">{m}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Account</h3>
                <ul className="space-y-2">
                  {[
                    { href: "/register", label: "Create Account" },
                    { href: "/login", label: "Login" },
                    { href: "/forgot-password", label: "Forgot Password" },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                © {new Date().getFullYear()} IceCream Inventory. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}