# IceSaathi — Legal Pages & Login Terms Acceptance
## Implementation Plan
### Domain: https://www.icesaathi.co.in/
### Support: softvibeservices@gmail.com

---

## OVERVIEW

This document covers:
1. Three new public legal pages: **Terms & Conditions**, **Privacy Policy**, **Refund Policy**
2. **Login page checkbox** — user must accept T&C before logging in (frontend enforcement)
3. **Backend enforcement** — `termsAcceptedAt` field on the User model; the login API rejects login if terms were never accepted on registration, and records acceptance timestamp when the checkbox is ticked
4. **Registration page** — same checkbox added to register page so new users also explicitly accept on signup
5. **Database migration** — non-breaking, uses a default value so existing users are not locked out

**Total new/changed files: 12**
Zero dashboard logic touched. Zero existing API routes broken.

---

## ARCHITECTURE DECISION

### Why enforce at both frontend AND backend?

Frontend-only checkbox enforcement (just disabling the Login button) can be bypassed by anyone sending a direct `POST /api/login` request. We enforce at both layers:

- **Frontend:** Login button is disabled until checkbox is ticked. The `termsAccepted: true` flag is sent in the request body.
- **Backend:** The login API route checks `req.body.termsAccepted === true`. If false or missing, it returns `400`. It also stamps `termsAcceptedAt` on the user document.

### Why not lock out existing users?

Existing users in MongoDB do not have a `termsAcceptedAt` field. We use a **soft enforcement** approach:
- New users: must check the box on registration (POST /api/register already validates it)
- Existing users at next login: must check the box (the login API stamps `termsAcceptedAt` on their document at that point)
- The login API never blocks an existing user permanently — it only blocks the current request if `termsAccepted` is not sent. The frontend checkbox handles this gracefully.

---

## FILES TO CREATE / CHANGE

```
NEW FILES (Legal Pages):
  src/app/terms/page.tsx                    ← Terms & Conditions page
  src/app/privacy/page.tsx                  ← Privacy Policy page
  src/app/refund/page.tsx                   ← Refund Policy page

NEW FILES (API):
  (no new API files — changes go into existing routes)

CHANGED FILES:
  src/app/login/page.tsx                    ← Add checkbox + link to terms
  src/app/register/page.tsx                 ← Add checkbox + link to terms
  src/app/api/login/route.ts                ← Validate termsAccepted, stamp termsAcceptedAt
  src/app/api/register/route.ts             ← Validate termsAccepted on signup
  src/models/User.ts                        ← Add termsAcceptedAt field (non-breaking)
  src/app/components/Footer.tsx             ← Add links to all three legal pages
  src/app/page.tsx                          ← Add links to legal pages in footer (if footer is inline)
```

---

---

## FILE 1 (CHANGED): `src/models/User.ts`

**What to tell the AI:** "Find the Mongoose schema definition in this file (the object passed to `new Schema({...})`). Add the following two fields inside the schema object. Do not change any other field. Do not change indexes, methods, or exports."

Add inside the schema object (after the last existing field, before the closing `}`):

```typescript
// ── Legal acceptance ────────────────────────────────────────────
// Timestamp of when the user first accepted the Terms & Conditions.
// Optional so existing users are not broken. Stamped at login or registration.
termsAcceptedAt: {
  type: Date,
  default: null,
},

// The version of the Terms & Conditions the user accepted.
// Increment this string (e.g. "1.1", "2.0") when T&C changes
// significantly, so you can detect users who accepted an old version.
termsVersion: {
  type: String,
  default: null,
},
```

**Why this is non-breaking:**
- Both fields have `default: null`
- Mongoose does NOT update existing documents in the DB when you add a field with a default — existing documents simply return `null` for these fields until they are written to
- No existing query, populate, or lean call breaks because these are additive-only fields
- No index is added, so no migration script is needed

---

## FILE 2 (CHANGED): `src/app/api/login/route.ts`

**What to tell the AI:** "In this file, make the following two targeted changes only. Do not change authentication logic, JWT signing, cookie setting, rate limiting, or any other part of the route."

### Change 2.1 — Read `termsAccepted` from request body

Find the section where the request body is destructured. It will look something like:
```typescript
const { email, password, deviceFingerprint } = await req.json();
```

Replace with:
```typescript
const { email, password, deviceFingerprint, termsAccepted } = await req.json();
```

### Change 2.2 — Validate `termsAccepted` and stamp the user document

Find the section AFTER the user is fetched from the database and BEFORE the password is verified. Add this block:

```typescript
// ── Terms & Conditions enforcement ──────────────────────────────────────────
// The frontend sends termsAccepted: true when the user ticks the checkbox.
// We validate it here so the login cannot be bypassed by direct API calls.
if (!termsAccepted) {
  return NextResponse.json(
    {
      message:
        "You must accept the Terms & Conditions to log in to IceSaathi.",
    },
    { status: 400 }
  );
}
```

Then find the section AFTER the password is verified successfully and BEFORE the JWT/cookie is set. Add this block:

```typescript
// ── Stamp termsAcceptedAt on first acceptance ────────────────────────────────
// Only write to the DB if the user has never accepted terms before.
// This silently migrates existing users on their next login.
if (!user.termsAcceptedAt) {
  await user.updateOne({
    termsAcceptedAt: new Date(),
    termsVersion: "1.0",
  });
}
```

**Note for the AI:** The variable name for the fetched user document may be `user`, `foundUser`, or `existingUser` depending on the existing code. Use whichever name is already in the file. The `updateOne` call is safe to await and does not affect the rest of the login flow.

---

## FILE 3 (CHANGED): `src/app/api/register/route.ts`

**What to tell the AI:** "In this file, make the following two targeted changes only. Do not change email verification, OTP sending, password hashing, or any other part of the register route."

### Change 3.1 — Read `termsAccepted` from request body

Find where the request body is destructured:
```typescript
const { name, email, password, shopName, ... } = await req.json();
```
Add `termsAccepted` to the destructure:
```typescript
const { name, email, password, shopName, ..., termsAccepted } = await req.json();
```

### Change 3.2 — Validate before creating the user

Find the validation section (where other field validations like empty email checks happen). Add:

```typescript
// ── Terms acceptance required ────────────────────────────────────────────────
if (!termsAccepted) {
  return NextResponse.json(
    {
      message:
        "You must accept the Terms & Conditions to create an IceSaathi account.",
    },
    { status: 400 }
  );
}
```

### Change 3.3 — Save `termsAcceptedAt` when creating the new User document

Find where `new User({...})` is called. Add `termsAcceptedAt` and `termsVersion` to that object:

```typescript
const newUser = new User({
  // ...all existing fields stay exactly as they are...
  termsAcceptedAt: new Date(),
  termsVersion: "1.0",
});
```

---

## FILE 4 (CHANGED): `src/app/login/page.tsx`

**What to tell the AI:** "Make the following changes to the login page. Do not change the form submission logic, API call, error handling, redirect logic, device fingerprint logic, or any other state/effect."

### Change 4.1 — Add `termsAccepted` state

Find the existing `useState` declarations at the top of the component. Add:

```typescript
const [termsAccepted, setTermsAccepted] = useState(false);
```

### Change 4.2 — Send `termsAccepted` in the login API call

Find the `fetch("/api/login", ...)` call and its request body. Add `termsAccepted` to the body:

```typescript
body: JSON.stringify({
  email,
  password,
  deviceFingerprint,
  termsAccepted,   // ← ADD THIS LINE
}),
```

### Change 4.3 — Add the checkbox UI above the submit button

Find the submit button element (it will be a `<button type="submit">` or `<button onClick={handleSubmit}>`). **Directly above it**, insert this JSX:

```tsx
{/* ── Terms & Conditions checkbox ── */}
<div className="flex items-start gap-3 py-1">
  <input
    type="checkbox"
    id="terms-accept"
    checked={termsAccepted}
    onChange={(e) => setTermsAccepted(e.target.checked)}
    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
    style={{ accentColor: "#2563eb" }}
  />
  <label htmlFor="terms-accept" className="text-sm text-gray-600 leading-snug cursor-pointer select-none">
    I have read and accept the{" "}
    <a
      href="/terms"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Terms &amp; Conditions
    </a>
    ,{" "}
    <a
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Privacy Policy
    </a>{" "}
    and{" "}
    <a
      href="/refund"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Refund Policy
    </a>{" "}
    of IceSaathi.
  </label>
</div>
```

### Change 4.4 — Disable the submit button until checkbox is ticked

Find the submit button. It will have a `disabled` prop or none. Add `|| !termsAccepted` to the disabled condition:

```tsx
// BEFORE (example):
<button
  type="submit"
  disabled={loading}
  className="..."
>
  Login
</button>

// AFTER:
<button
  type="submit"
  disabled={loading || !termsAccepted}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  Login
</button>
```

**Note:** The exact existing `disabled` condition may differ. Whatever it is, append `|| !termsAccepted` to it.

---

## FILE 5 (CHANGED): `src/app/register/page.tsx`

**What to tell the AI:** "Make the following changes to the register page. Do not change the form fields, OTP flow, email verification, password validation, or any other logic."

Apply the exact same pattern as the login page:

### Change 5.1 — Add state
```typescript
const [termsAccepted, setTermsAccepted] = useState(false);
```

### Change 5.2 — Send in API call
Find the `fetch("/api/register", ...)` body and add:
```typescript
termsAccepted,
```

### Change 5.3 — Add checkbox UI (same JSX as login page, insert above the submit/register button)

```tsx
{/* ── Terms & Conditions checkbox ── */}
<div className="flex items-start gap-3 py-1">
  <input
    type="checkbox"
    id="terms-accept-register"
    checked={termsAccepted}
    onChange={(e) => setTermsAccepted(e.target.checked)}
    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
    style={{ accentColor: "#2563eb" }}
  />
  <label htmlFor="terms-accept-register" className="text-sm text-gray-600 leading-snug cursor-pointer select-none">
    I have read and accept the{" "}
    <a
      href="/terms"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Terms &amp; Conditions
    </a>
    ,{" "}
    <a
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Privacy Policy
    </a>{" "}
    and{" "}
    <a
      href="/refund"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      Refund Policy
    </a>{" "}
    of IceSaathi. By creating an account, I agree to be bound by these policies.
  </label>
</div>
```

### Change 5.4 — Disable the submit button
```tsx
disabled={loading || !termsAccepted}
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## FILE 6 (NEW): `src/app/terms/page.tsx`

**What to tell the AI:** "Create a new file at this path with the complete code below."

```tsx
// src/app/terms/page.tsx
// Server Component — no client JS needed

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — IceSaathi",
  description:
    "Read the Terms & Conditions for IceSaathi, the inventory and billing software for ice cream businesses in India. Understand your rights and obligations when using our platform.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.icesaathi.co.in/terms" },
};

const LAST_UPDATED = "20 June 2025";
const EFFECTIVE_DATE = "20 June 2025";
const COMPANY_NAME = "SoftVibe Services";
const PRODUCT_NAME = "IceSaathi";
const DOMAIN = "www.icesaathi.co.in";
const SUPPORT_EMAIL = "softvibeservices@gmail.com";
const AGENCY_URL = "https://softvibe-service.vercel.app/";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">IS</span>
            </div>
            <span className="font-bold text-gray-900 text-[17px] tracking-tight">IceSaathi</span>
          </Link>
          <Link href="/login" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Page title */}
        <div className="mb-10 pb-8 border-b border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-gray-500 text-sm">
            <strong>Effective date:</strong> {EFFECTIVE_DATE} &nbsp;·&nbsp;
            <strong>Last updated:</strong> {LAST_UPDATED}
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of {PRODUCT_NAME} (the &ldquo;Service&rdquo;), a software-as-a-service platform operated by <strong>{COMPANY_NAME}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By registering for or using the Service, you agree to be legally bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </div>

        {/* Table of contents */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200" aria-label="Table of contents">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 uppercase tracking-wider">Contents</h2>
          <ol className="space-y-1.5 text-sm text-blue-600">
            {[
              ["#definitions", "1. Definitions"],
              ["#service", "2. Description of Service"],
              ["#eligibility", "3. Eligibility"],
              ["#accounts", "4. Accounts & Registration"],
              ["#acceptable-use", "5. Acceptable Use"],
              ["#subscription", "6. Subscription & Payment"],
              ["#free-trial", "7. Free Trial"],
              ["#intellectual-property", "8. Intellectual Property"],
              ["#data", "9. Your Data"],
              ["#third-party", "10. Third-Party Services"],
              ["#disclaimer", "11. Disclaimers"],
              ["#liability", "12. Limitation of Liability"],
              ["#indemnification", "13. Indemnification"],
              ["#termination", "14. Termination"],
              ["#governing-law", "15. Governing Law & Dispute Resolution"],
              ["#changes", "16. Changes to These Terms"],
              ["#contact", "17. Contact Us"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:underline">{label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-700">

          <section id="definitions">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Definitions</h2>
            <ul className="space-y-2 list-none pl-0">
              <li><strong>&ldquo;Service&rdquo;</strong> — The {PRODUCT_NAME} web application accessible at {DOMAIN}, including all features, APIs and related software.</li>
              <li><strong>&ldquo;User&rdquo;</strong> — Any individual or business entity that registers for and uses the Service.</li>
              <li><strong>&ldquo;Account Owner&rdquo;</strong> — The primary registered user who created the account and is responsible for all activity under that account.</li>
              <li><strong>&ldquo;Manager&rdquo;</strong> — A secondary user added by the Account Owner with limited dashboard access.</li>
              <li><strong>&ldquo;Delivery Partner&rdquo;</strong> — A delivery staff member registered under an Account Owner&apos;s account.</li>
              <li><strong>&ldquo;Content&rdquo;</strong> — Any data, text, records, customer information, invoices, or files you upload to or generate through the Service.</li>
              <li><strong>&ldquo;Subscription Plan&rdquo;</strong> — A paid plan (Starter, Growth or Business) that unlocks feature limits beyond the free trial.</li>
              <li><strong>&ldquo;Add-On&rdquo;</strong> — An optional paid feature purchased in addition to a Subscription Plan.</li>
            </ul>
          </section>

          <section id="service">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p>
              {PRODUCT_NAME} is a cloud-based inventory management, billing and delivery tracking platform designed for ice cream wholesalers, distributors and retail businesses in India. The Service includes:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Product and inventory management</li>
              <li>GST-compliant invoice generation and PDF export</li>
              <li>Customer ledger and payment tracking</li>
              <li>Order creation, settlement and management</li>
              <li>Live GPS delivery tracking</li>
              <li>Delivery partner management and approval workflow</li>
              <li>Sales analytics and reporting</li>
              <li>Manager role access</li>
              <li>Bulk import via CSV/Excel</li>
            </ul>
            <p className="mt-3">
              We reserve the right to modify, suspend or discontinue any feature of the Service at any time with reasonable notice to users.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <p>
              You must be at least 18 years of age and have the legal capacity to enter into a binding agreement to use this Service. By using {PRODUCT_NAME}, you represent that:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>You are 18 years of age or older.</li>
              <li>You are using the Service for a legitimate business purpose.</li>
              <li>The information you provide at registration is accurate and truthful.</li>
              <li>You are not prohibited by applicable law from using the Service.</li>
            </ul>
            <p className="mt-3">
              The Service is intended for use by businesses operating in India. Use from outside India is permitted but subject to your local laws and regulations.
            </p>
          </section>

          <section id="accounts">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Accounts &amp; Registration</h2>
            <p>
              To use the Service, you must create an account by providing your name, business name, email address and a password. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Provide accurate, current and complete information during registration.</li>
              <li>Keep your account credentials confidential and not share your password with anyone.</li>
              <li>Immediately notify us at {SUPPORT_EMAIL} if you suspect unauthorised access to your account.</li>
              <li>Be solely responsible for all activity that occurs under your account.</li>
            </ul>
            <p className="mt-3">
              You are responsible for all Manager and Delivery Partner accounts created under your Account Owner account. Their actions within the Service are your responsibility.
            </p>
            <p className="mt-3">
              We may suspend or terminate your account if we have reason to believe the registration information is false or the account is being used for fraudulent or harmful purposes.
            </p>
          </section>

          <section id="acceptable-use">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Upload false, misleading or fraudulent business data, invoices or customer records.</li>
              <li>Attempt to gain unauthorised access to the Service, its servers, or other users&apos; accounts.</li>
              <li>Reverse engineer, decompile, disassemble or attempt to extract the source code of the Service.</li>
              <li>Transmit any malware, viruses or malicious code through the Service.</li>
              <li>Use automated tools (bots, scrapers) to access the Service without prior written permission.</li>
              <li>Resell, sublicense or commercially exploit the Service without our written consent.</li>
              <li>Impersonate another user or business entity.</li>
              <li>Use the Service to generate invoices for goods or services other than for your own legitimate business.</li>
            </ul>
            <p className="mt-3">
              Violation of these rules may result in immediate account suspension or termination without refund.
            </p>
          </section>

          <section id="subscription">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Subscription &amp; Payment</h2>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.1 Plans</h3>
            <p>
              {PRODUCT_NAME} offers paid subscription plans (Starter, Growth, Business) billed monthly or annually. Plan features and limits are described on the pricing page at {DOMAIN}/#pricing.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.2 Billing</h3>
            <p>
              Payment is processed through Razorpay, a third-party payment gateway. By subscribing, you authorise us to charge your selected payment method for the subscription amount. All prices are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.3 Auto-Renewal</h3>
            <p>
              Subscriptions renew automatically at the end of each billing period. You may cancel auto-renewal at any time from your dashboard before the renewal date. Cancellation takes effect at the end of the current billing period — you retain access until then.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.4 Price Changes</h3>
            <p>
              We reserve the right to change subscription prices. You will be notified at least 14 days in advance of any price change taking effect. Continued use of the Service after the price change constitutes acceptance of the new price.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.5 Add-Ons</h3>
            <p>
              Optional add-ons (additional invoices, manager seats, delivery partners) are billed as one-time purchases for the current billing period. They are non-refundable once activated.
            </p>
          </section>

          <section id="free-trial">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Free Trial</h2>
            <p>
              {PRODUCT_NAME} offers a 30-day free trial period for new accounts. During the trial:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>All features are available subject to trial plan limits.</li>
              <li>No payment information is required to start.</li>
              <li>At the end of the trial, your account will be downgraded to a limited free tier or suspended until you subscribe to a paid plan.</li>
              <li>Data created during the trial is retained for 30 days after trial expiry.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to modify or discontinue the free trial at any time.
            </p>
          </section>

          <section id="intellectual-property">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">8.1 Our Property</h3>
            <p>
              The Service, including its design, code, features, trademarks, logo and content created by us, is the exclusive property of {COMPANY_NAME}. You are granted a limited, non-exclusive, non-transferable licence to use the Service for your business operations during the period of your subscription.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">8.2 Your Content</h3>
            <p>
              You retain full ownership of all business data, customer records, invoices and files you upload or create through the Service (&ldquo;Your Content&rdquo;). You grant us a limited, worldwide licence to store, process and display Your Content solely for the purpose of providing the Service to you.
            </p>
            <p className="mt-3">
              You are responsible for ensuring that Your Content does not infringe any third-party rights and complies with applicable laws.
            </p>
          </section>

          <section id="data">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Your Data</h2>
            <p>
              We take reasonable technical and organisational measures to protect your data. However, you acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>No system is completely secure and we cannot guarantee absolute data security.</li>
              <li>You are responsible for maintaining your own backups of critical business data.</li>
              <li>In the event of account termination, your data may be permanently deleted after 30 days.</li>
            </ul>
            <p className="mt-3">
              Our use of your data is governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section id="third-party">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Third-Party Services</h2>
            <p>
              The Service integrates with the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li><strong>Razorpay</strong> — for payment processing</li>
              <li><strong>Cloudinary</strong> — for image storage (business logos, signatures)</li>
              <li><strong>MongoDB Atlas</strong> — for database storage</li>
              <li><strong>Firebase</strong> — for push notifications</li>
            </ul>
            <p className="mt-3">
              Your use of these services is also governed by their respective terms. We are not responsible for the practices or content of third-party services.
            </p>
          </section>

          <section id="disclaimer">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="mt-3">
              We do not warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>The Service will be uninterrupted, error-free or free of viruses.</li>
              <li>The invoices generated through the Service will be accepted by any specific tax authority without independent review.</li>
              <li>GST invoice outputs are a substitute for professional tax advice. You should consult a qualified chartered accountant for tax compliance.</li>
              <li>GPS tracking data will be 100% accurate at all times.</li>
            </ul>
          </section>

          <section id="liability">
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY_NAME.toUpperCase()} AND ITS DIRECTORS, EMPLOYEES AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Your use of or inability to use the Service.</li>
              <li>Any unauthorised access to your account or data.</li>
              <li>Errors, bugs or inaccuracies in the Service.</li>
              <li>Any interruption or cessation of the Service.</li>
            </ul>
            <p className="mt-3">
              In no event shall our total liability to you exceed the total amount paid by you to us in the 3 months immediately preceding the claim.
            </p>
          </section>

          <section id="indemnification">
            <h2 className="text-xl font-bold text-gray-900 mb-4">13. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {COMPANY_NAME}, its directors, employees and agents from any claims, damages, losses, liabilities, costs and expenses (including reasonable legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>Your violation of these Terms.</li>
              <li>Your use of the Service in a manner not permitted by these Terms.</li>
              <li>Your Content infringing any third-party rights.</li>
              <li>Any tax or regulatory liability arising from invoices you generate through the Service.</li>
            </ul>
          </section>

          <section id="termination">
            <h2 className="text-xl font-bold text-gray-900 mb-4">14. Termination</h2>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">14.1 By You</h3>
            <p>
              You may stop using the Service and cancel your subscription at any time from your dashboard. Cancellation takes effect at the end of the current billing period.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">14.2 By Us</h3>
            <p>
              We may suspend or terminate your account immediately, without prior notice, if:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>You breach these Terms.</li>
              <li>We are required to do so by law.</li>
              <li>Your account is used for fraudulent, abusive or harmful activity.</li>
              <li>Payment for a subscription fails and is not resolved within 7 days.</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">14.3 Effect of Termination</h3>
            <p>
              Upon termination, your access to the Service is immediately revoked. Your data will be retained for 30 days and then permanently deleted. Please export any data you need before termination.
            </p>
          </section>

          <section id="governing-law">
            <h2 className="text-xl font-bold text-gray-900 mb-4">15. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of India, without regard to conflict of law principles. Any dispute arising from or relating to these Terms or the Service shall be first attempted to be resolved amicably through written communication to {SUPPORT_EMAIL}.
            </p>
            <p className="mt-3">
              If amicable resolution is not reached within 30 days, the dispute shall be subject to the exclusive jurisdiction of the courts located in Gujarat, India.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-bold text-gray-900 mb-4">16. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at the top and, for significant changes, notify you by email or an in-app notice. Your continued use of the Service after the effective date of updated Terms constitutes your acceptance of the updated Terms.
            </p>
            <p className="mt-3">
              If you disagree with updated Terms, you may cancel your subscription and stop using the Service.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-bold text-gray-900 mb-4">17. Contact Us</h2>
            <p>For any questions about these Terms, please contact us:</p>
            <div className="mt-4 p-5 bg-gray-50 border border-gray-200 rounded-xl text-sm space-y-1">
              <p><strong>Company:</strong> {COMPANY_NAME}</p>
              <p><strong>Product:</strong> {PRODUCT_NAME}</p>
              <p><strong>Email:</strong>{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>
              </p>
              <p><strong>Website:</strong>{" "}
                <a href={AGENCY_URL} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{AGENCY_URL}</a>
              </p>
            </div>
          </section>

        </div>

        {/* Back / nav links */}
        <div className="mt-14 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          <Link href="/refund" className="text-blue-600 hover:underline">Refund Policy</Link>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} IceSaathi by SoftVibe Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
```

---

## FILE 7 (NEW): `src/app/privacy/page.tsx`

**What to tell the AI:** "Create a new file at this path with the complete code below."

```tsx
// src/app/privacy/page.tsx
// Server Component

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — IceSaathi",
  description:
    "Read the Privacy Policy for IceSaathi. Understand what data we collect, how we use it, and your rights as a user of our ice cream business management software.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.icesaathi.co.in/privacy" },
};

const LAST_UPDATED = "20 June 2025";
const EFFECTIVE_DATE = "20 June 2025";
const COMPANY_NAME = "SoftVibe Services";
const PRODUCT_NAME = "IceSaathi";
const SUPPORT_EMAIL = "softvibeservices@gmail.com";
const AGENCY_URL = "https://softvibe-service.vercel.app/";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">IS</span>
            </div>
            <span className="font-bold text-gray-900 text-[17px] tracking-tight">IceSaathi</span>
          </Link>
          <Link href="/login" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="mb-10 pb-8 border-b border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">
            <strong>Effective date:</strong> {EFFECTIVE_DATE} &nbsp;·&nbsp;
            <strong>Last updated:</strong> {LAST_UPDATED}
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            {COMPANY_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates {PRODUCT_NAME} (&ldquo;the Service&rdquo;). This Privacy Policy explains what personal and business data we collect, how we use it, who we share it with, and your rights regarding your data. By using the Service, you consent to the practices described in this policy.
          </p>
        </div>

        {/* TOC */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 uppercase tracking-wider">Contents</h2>
          <ol className="space-y-1.5 text-sm text-blue-600">
            {[
              ["#what-we-collect", "1. What Data We Collect"],
              ["#how-we-use", "2. How We Use Your Data"],
              ["#legal-basis", "3. Legal Basis for Processing"],
              ["#data-sharing", "4. Data Sharing"],
              ["#data-storage", "5. Data Storage & Security"],
              ["#data-retention", "6. Data Retention"],
              ["#cookies", "7. Cookies & Local Storage"],
              ["#your-rights", "8. Your Rights"],
              ["#children", "9. Children's Privacy"],
              ["#international", "10. International Transfers"],
              ["#changes", "11. Changes to This Policy"],
              ["#contact", "12. Contact Us"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} className="hover:underline">{label}</a></li>
            ))}
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-700">

          <section id="what-we-collect">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. What Data We Collect</h2>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">1.1 Information you provide directly</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account registration data:</strong> Name, email address, phone number, shop/business name, password (hashed, never stored in plain text).</li>
              <li><strong>Business profile data:</strong> GSTIN, business logo, digital signature image, QR code image, bank details (account holder name, account number, IFSC code, UPI ID, bank name).</li>
              <li><strong>Product data:</strong> Product names, categories, prices, stock levels.</li>
              <li><strong>Customer data:</strong> Customer shop names, contact numbers, address, area, GPS location coordinates.</li>
              <li><strong>Order and billing data:</strong> Order details, invoice numbers, amounts, payment modes, settlement status.</li>
              <li><strong>Delivery partner data:</strong> Name, email, contact number of delivery staff you register.</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">1.2 Data collected automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Device fingerprint:</strong> A hashed identifier generated from your browser characteristics (screen resolution, CPU cores, timezone, canvas rendering) to detect new device logins. This is stored in your browser&apos;s localStorage and never transmitted to third parties.</li>
              <li><strong>Usage logs:</strong> Activity logs of key actions performed in the dashboard (e.g. &ldquo;Product added&rdquo;, &ldquo;Order created&rdquo;) for audit purposes.</li>
              <li><strong>IP address:</strong> Collected at login for security and fraud prevention.</li>
              <li><strong>Browser and device information:</strong> User agent string, operating system, for device session management.</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">1.3 GPS location data</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Delivery partners voluntarily share their GPS location during active deliveries. Location data is stored temporarily and is visible only to the Account Owner who manages that delivery partner.</li>
              <li>Customer GPS coordinates (if you record them) are stored as part of the customer record and visible only to users of your account.</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">1.4 Payment data</h3>
            <p>Payment processing is handled by <strong>Razorpay</strong>. We do not store your credit card, debit card or UPI credentials. We store only Razorpay&apos;s order and payment IDs for our records.</p>
          </section>

          <section id="how-we-use">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>To provide the Service:</strong> Storing and displaying your products, customers, orders and invoices.</li>
              <li><strong>Account management:</strong> Creating and maintaining your account, verifying your email, managing sessions.</li>
              <li><strong>Security:</strong> Detecting suspicious logins using device fingerprinting, IP logging and session management.</li>
              <li><strong>Billing:</strong> Processing subscription payments and verifying payment status through Razorpay.</li>
              <li><strong>Communication:</strong> Sending OTPs for email verification and password reset, subscription alerts, and important service notices to your registered email.</li>
              <li><strong>Analytics (internal):</strong> Aggregated, anonymised usage data to improve the Service. We do not sell individual user data for advertising.</li>
              <li><strong>Legal compliance:</strong> Maintaining records required by law.</li>
            </ul>
          </section>

          <section id="legal-basis">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Legal Basis for Processing</h2>
            <p>We process your data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Contractual necessity:</strong> Processing required to provide the Service you subscribed to.</li>
              <li><strong>Legitimate interests:</strong> Security monitoring, fraud prevention, and improving the Service.</li>
              <li><strong>Consent:</strong> Where you have explicitly opted in, such as GPS location sharing by delivery partners.</li>
              <li><strong>Legal obligation:</strong> Where we are required to retain records by applicable Indian law.</li>
            </ul>
          </section>

          <section id="data-sharing">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
            <p>We do <strong>not</strong> sell your personal or business data to any third party. We share your data only with the following categories of sub-processors, and only to the extent necessary to provide the Service:</p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Sub-processor</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Data shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">Razorpay</td>
                    <td className="px-4 py-3">Payment processing</td>
                    <td className="px-4 py-3">Email, amount, order ID</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Cloudinary</td>
                    <td className="px-4 py-3">Image storage</td>
                    <td className="px-4 py-3">Business logo, signature, QR code images</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">MongoDB Atlas</td>
                    <td className="px-4 py-3">Database</td>
                    <td className="px-4 py-3">All account and business data</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Firebase (Google)</td>
                    <td className="px-4 py-3">Push notifications</td>
                    <td className="px-4 py-3">FCM device tokens</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Nodemailer / SMTP</td>
                    <td className="px-4 py-3">Transactional emails</td>
                    <td className="px-4 py-3">Email address, OTP</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              We may also disclose your data if required to do so by law or in response to a lawful request by public authorities (e.g. a court order).
            </p>
          </section>

          <section id="data-storage">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Data Storage &amp; Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data is stored on MongoDB Atlas servers, which use encryption at rest and in transit.</li>
              <li>Passwords are hashed using bcrypt before storage. We never store plain-text passwords.</li>
              <li>Authentication uses JWT tokens with expiry limits, stored in HTTP-only cookies.</li>
              <li>Device fingerprinting adds an additional layer of session security.</li>
              <li>All communication with the Service is over HTTPS.</li>
            </ul>
            <p className="mt-3">
              Despite our measures, no internet transmission or electronic storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section id="data-retention">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Active accounts:</strong> Data is retained for as long as your account is active.</li>
              <li><strong>After account deletion or termination:</strong> Your data is retained for 30 days to allow for recovery requests, then permanently deleted.</li>
              <li><strong>Payment records:</strong> Transaction records are retained for 7 years as required by Indian financial regulations.</li>
              <li><strong>Activity logs:</strong> Retained for 90 days, then automatically purged.</li>
            </ul>
            <p className="mt-3">
              You may request deletion of your data at any time by emailing {SUPPORT_EMAIL}. We will respond within 30 days.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. Cookies &amp; Local Storage</h2>
            <p>We use the following:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Authentication cookies (HTTP-only):</strong> Secure, HTTP-only cookies to maintain your login session. These are essential for the Service to function.</li>
              <li><strong>localStorage — device fingerprint:</strong> A hashed device identifier stored under the key <code className="bg-gray-100 px-1 rounded text-xs">dv_fp</code> to detect login from new devices. Contains no personally identifiable information.</li>
              <li><strong>localStorage — user session:</strong> Your name, shop name and role are cached in localStorage for faster dashboard loading. This data is cleared on logout.</li>
            </ul>
            <p className="mt-3">
              We do not use third-party advertising cookies or analytics cookies (e.g. Google Analytics) at this time.
            </p>
          </section>

          <section id="your-rights">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data. You can update most data directly from your dashboard profile.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and all associated data.</li>
              <li><strong>Portability:</strong> Request your business data (products, customers, orders) in a structured, machine-readable format.</li>
              <li><strong>Withdraw consent:</strong> Where processing is based on consent (e.g. GPS location for delivery partners), you may withdraw consent at any time.</li>
              <li><strong>Objection:</strong> Object to processing of your data for any purpose that is not strictly necessary to provide the Service.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>. We will respond within 30 days.
            </p>
          </section>

          <section id="children">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed at children under 18 years of age. We do not knowingly collect personal data from anyone under 18. If you believe a minor has registered, please contact us at {SUPPORT_EMAIL} and we will promptly delete the account.
            </p>
          </section>

          <section id="international">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p>
              Your data is primarily stored on servers located in or near India (MongoDB Atlas Asia-Pacific region). Some sub-processors (e.g. Cloudinary, Firebase) may process data in other regions. These providers maintain adequate security standards and comply with applicable data protection laws.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. When we make significant changes, we will notify you by email or an in-app notice and update the &ldquo;Last updated&rdquo; date. Continued use of the Service after the update constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
            <p>For privacy-related enquiries or to exercise your rights, contact us:</p>
            <div className="mt-4 p-5 bg-gray-50 border border-gray-200 rounded-xl text-sm space-y-1">
              <p><strong>Company:</strong> {COMPANY_NAME}</p>
              <p><strong>Product:</strong> {PRODUCT_NAME}</p>
              <p><strong>Email:</strong>{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>
              </p>
              <p><strong>Website:</strong>{" "}
                <a href={AGENCY_URL} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{AGENCY_URL}</a>
              </p>
            </div>
          </section>

        </div>

        <div className="mt-14 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          <Link href="/terms" className="text-blue-600 hover:underline">Terms &amp; Conditions</Link>
          <Link href="/refund" className="text-blue-600 hover:underline">Refund Policy</Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} IceSaathi by SoftVibe Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
```

---

## FILE 8 (NEW): `src/app/refund/page.tsx`

**What to tell the AI:** "Create a new file at this path with the complete code below."

```tsx
// src/app/refund/page.tsx
// Server Component

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy — IceSaathi",
  description:
    "Read the Refund Policy for IceSaathi. Understand our subscription refund terms, add-on purchase policy and how to request a refund for our ice cream business management software.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://www.icesaathi.co.in/refund" },
};

const LAST_UPDATED = "20 June 2025";
const EFFECTIVE_DATE = "20 June 2025";
const COMPANY_NAME = "SoftVibe Services";
const PRODUCT_NAME = "IceSaathi";
const SUPPORT_EMAIL = "softvibeservices@gmail.com";
const AGENCY_URL = "https://softvibe-service.vercel.app/";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">IS</span>
            </div>
            <span className="font-bold text-gray-900 text-[17px] tracking-tight">IceSaathi</span>
          </Link>
          <Link href="/login" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="mb-10 pb-8 border-b border-gray-200">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Refund Policy
          </h1>
          <p className="text-gray-500 text-sm">
            <strong>Effective date:</strong> {EFFECTIVE_DATE} &nbsp;·&nbsp;
            <strong>Last updated:</strong> {LAST_UPDATED}
          </p>
          <p className="text-gray-600 mt-3 text-sm leading-relaxed">
            This Refund Policy describes when and how {COMPANY_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) will process refunds for {PRODUCT_NAME} subscriptions and add-on purchases. Please read this carefully before making any purchase.
          </p>
        </div>

        {/* Summary box */}
        <div className="mb-10 p-5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 space-y-2">
          <p className="font-semibold text-blue-800 text-[15px]">Quick Summary</p>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>Free 30-day trial — no payment required, no refund needed.</li>
            <li>Subscription refund eligible within <strong>7 days</strong> of first payment if you have not used key features.</li>
            <li>Renewals: No refund after auto-renewal charges — cancel before renewal to avoid charges.</li>
            <li>Add-ons: Non-refundable once activated.</li>
            <li>Contact us within the refund window at <a href={`mailto:${SUPPORT_EMAIL}`} className="underline font-medium">{SUPPORT_EMAIL}</a>.</li>
          </ul>
        </div>

        {/* TOC */}
        <nav className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm mb-3 uppercase tracking-wider">Contents</h2>
          <ol className="space-y-1.5 text-sm text-blue-600">
            {[
              ["#free-trial", "1. Free Trial"],
              ["#subscription-refunds", "2. Subscription Refunds"],
              ["#renewal-refunds", "3. Auto-Renewal Charges"],
              ["#addon-refunds", "4. Add-On Purchases"],
              ["#eligibility", "5. Refund Eligibility Conditions"],
              ["#not-eligible", "6. When Refunds Are NOT Issued"],
              ["#process", "7. How to Request a Refund"],
              ["#timeline", "8. Refund Processing Timeline"],
              ["#disputes", "9. Payment Disputes"],
              ["#changes", "10. Changes to This Policy"],
              ["#contact", "11. Contact Us"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} className="hover:underline">{label}</a></li>
            ))}
          </ol>
        </nav>

        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-700">

          <section id="free-trial">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Free Trial</h2>
            <p>
              {PRODUCT_NAME} offers a <strong>30-day free trial</strong> for all new accounts. No payment information is required to start the free trial. Since no charge is made during the trial, no refund is applicable for the trial period.
            </p>
            <p className="mt-3">
              The free trial gives you access to all features within trial plan limits. You are encouraged to thoroughly evaluate the Service before making any payment.
            </p>
          </section>

          <section id="subscription-refunds">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Subscription Refunds</h2>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.1 First-Time Subscription (New Paid Users)</h3>
            <p>
              If you subscribe to a paid plan for the first time and are not satisfied with the Service, you may request a full refund within <strong>7 calendar days</strong> of your first payment, provided:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-3">
              <li>The refund request is submitted within 7 days of payment.</li>
              <li>You have not generated more than 5 GST invoices during the paid period.</li>
              <li>You have not downloaded more than 5 invoice or report PDFs.</li>
              <li>Your account has not been suspended for policy violations.</li>
            </ul>
            <p className="mt-3">
              Refunds under this policy are processed as a full refund of the subscription amount paid, with no deductions.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.2 Plan Upgrades</h3>
            <p>
              If you upgrade from a lower plan to a higher plan mid-cycle, the unused portion of your current plan is prorated and applied as credit toward the new plan. No cash refund is issued for upgrades.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.3 Plan Downgrades</h3>
            <p>
              Downgrades take effect at the start of the next billing cycle. No refund is issued for the remaining days of the current billing period when downgrading.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.4 Annual Plans</h3>
            <p>
              For annual subscriptions, a refund may be requested within <strong>14 calendar days</strong> of payment (instead of 7 days), subject to the same usage conditions in 2.1. After 14 days, annual plans are non-refundable.
            </p>
          </section>

          <section id="renewal-refunds">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Auto-Renewal Charges</h2>
            <p>
              Subscriptions renew automatically at the end of each billing period. We send a reminder email at least <strong>3 days before</strong> the renewal date.
            </p>
            <p className="mt-3 font-medium text-gray-800">
              Refunds are NOT issued for renewal charges that occur after the reminder email was sent and you did not cancel before the renewal date.
            </p>
            <p className="mt-3">
              To avoid renewal charges:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Cancel your subscription from your dashboard at least 24 hours before the renewal date.</li>
              <li>You retain access to the Service until the end of the current paid period after cancellation.</li>
            </ul>
            <p className="mt-3">
              <strong>Exception:</strong> If a renewal charge occurs due to a technical error on our end (e.g. you cancelled but were charged anyway), we will issue a full refund immediately upon verification. Contact us at {SUPPORT_EMAIL} with your Razorpay payment ID.
            </p>
          </section>

          <section id="addon-refunds">
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. Add-On Purchases</h2>
            <p>
              Add-ons (additional invoices per month, extra manager seats, additional delivery partners, advanced reports, setup &amp; migration) are <strong>non-refundable</strong> once purchased and activated, because they are consumed resources that are immediately made available to your account.
            </p>
            <p className="mt-3">
              Before purchasing an add-on, please verify that it meets your requirements. We recommend testing the base plan thoroughly before purchasing add-ons.
            </p>
            <p className="mt-3">
              <strong>Exception:</strong> If an add-on was charged but was not activated or delivered due to a technical error, we will issue a full refund upon investigation. Contact us at {SUPPORT_EMAIL}.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. Refund Eligibility Conditions</h2>
            <p>To be eligible for a refund under Section 2, ALL of the following must be true:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>The refund request is made within the applicable window (7 days for monthly plans, 14 days for annual plans).</li>
              <li>You have not generated more than 5 invoices during the paid period.</li>
              <li>You have not exported more than 5 PDF reports.</li>
              <li>Your account has not been suspended or terminated for policy violations.</li>
              <li>The payment was not disputed with your bank or card issuer before the refund request.</li>
              <li>This is your first paid subscription (not a renewal).</li>
            </ul>
          </section>

          <section id="not-eligible">
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. When Refunds Are NOT Issued</h2>
            <p>Refunds will not be issued in the following situations:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Subscription renewal charges (after the reminder email was sent).</li>
              <li>After the 7-day / 14-day refund window has passed.</li>
              <li>Add-on purchases (once activated).</li>
              <li>Accounts terminated for violating the Terms &amp; Conditions.</li>
              <li>Requests citing inability to use features that were clearly described on the pricing page before purchase.</li>
              <li>Requests due to change of business, decision not to continue, or preference for a different software.</li>
              <li>Requests made after the account has already been used to generate significant invoices or reports.</li>
            </ul>
          </section>

          <section id="process">
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. How to Request a Refund</h2>
            <p>To request a refund, email us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a> with the subject line: <strong>&ldquo;Refund Request — [Your Registered Email]&rdquo;</strong></p>
            <p className="mt-3">Include in your email:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your registered email address.</li>
              <li>Your Razorpay Payment ID (found in your subscription dashboard or payment receipt email).</li>
              <li>The date of payment.</li>
              <li>The reason for your refund request.</li>
            </ul>
            <p className="mt-3">
              We will acknowledge your request within 2 business days and respond with a decision within 5 business days.
            </p>
          </section>

          <section id="timeline">
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. Refund Processing Timeline</h2>
            <p>Once a refund is approved:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>We initiate the refund through Razorpay within <strong>2 business days</strong> of approval.</li>
              <li>Razorpay processes refunds to the original payment method within <strong>5–7 business days</strong> (bank cards) or <strong>1–3 business days</strong> (UPI).</li>
              <li>Total time from approval to credit in your account: typically <strong>5–10 business days</strong>.</li>
            </ul>
            <p className="mt-3">
              The refund will be credited to the same payment method used for the original purchase. We cannot issue refunds to a different payment method.
            </p>
          </section>

          <section id="disputes">
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. Payment Disputes</h2>
            <p>
              We strongly encourage you to contact us at {SUPPORT_EMAIL} before filing a dispute or chargeback with your bank. Most issues can be resolved quickly and directly.
            </p>
            <p className="mt-3">
              If you file a chargeback with your bank without first contacting us, we reserve the right to suspend your account during the dispute resolution period. If the chargeback is resolved in our favour, your account may be permanently terminated.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Refund Policy from time to time. Changes will be reflected by the &ldquo;Last updated&rdquo; date at the top of this page. For significant changes, we will notify users by email. Continued use of the Service after policy changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p>For refund requests or questions about this policy:</p>
            <div className="mt-4 p-5 bg-gray-50 border border-gray-200 rounded-xl text-sm space-y-1">
              <p><strong>Company:</strong> {COMPANY_NAME}</p>
              <p><strong>Product:</strong> {PRODUCT_NAME}</p>
              <p><strong>Email:</strong>{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">{SUPPORT_EMAIL}</a>
              </p>
              <p><strong>Website:</strong>{" "}
                <a href={AGENCY_URL} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{AGENCY_URL}</a>
              </p>
              <p className="mt-2 text-gray-500">Response time: Within 2 business days.</p>
            </div>
          </section>

        </div>

        <div className="mt-14 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Home</Link>
          <Link href="/terms" className="text-blue-600 hover:underline">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} IceSaathi by SoftVibe Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
```

---

## FILE 9 (CHANGED): `src/app/components/Footer.tsx`

**What to tell the AI:** "In the Footer component, find the section where footer links are listed. Add the following three links to the appropriate section (or create a new 'Legal' column if none exists)."

Add these three links wherever footer links are listed (inside the existing footer columns, or as a new 'Legal' column):

```tsx
{/* Legal links — add these */}
<h3 className="font-semibold text-gray-900 text-sm mb-4 uppercase tracking-wider">Legal</h3>
<ul className="space-y-3 text-sm text-gray-600">
  <li>
    <Link href="/terms" className="hover:text-gray-900 transition-colors">
      Terms &amp; Conditions
    </Link>
  </li>
  <li>
    <Link href="/privacy" className="hover:text-gray-900 transition-colors">
      Privacy Policy
    </Link>
  </li>
  <li>
    <Link href="/refund" className="hover:text-gray-900 transition-colors">
      Refund Policy
    </Link>
  </li>
</ul>
```

Also add these three links at the bottom of the footer (the copyright bar):

```tsx
{/* Add inside the bottom copyright bar, after the copyright text */}
<div className="flex items-center gap-4 text-sm text-gray-500">
  <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
  <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
  <Link href="/refund" className="hover:text-gray-900 transition-colors">Refund</Link>
</div>
```

---

---

## IMPLEMENTATION ORDER

Follow this exact order to avoid breaking anything:

```
Step 1 — src/models/User.ts
        Add termsAcceptedAt and termsVersion fields.
        Deploy and verify MongoDB connection still works.

Step 2 — src/app/api/register/route.ts
        Add termsAccepted validation and save termsAcceptedAt on new user creation.

Step 3 — src/app/api/login/route.ts
        Add termsAccepted validation and stamp termsAcceptedAt on existing users.

Step 4 — src/app/login/page.tsx
        Add checkbox state, send in body, add UI, disable button.

Step 5 — src/app/register/page.tsx
        Same as step 4 but for register form.

Step 6 — Create src/app/terms/page.tsx
Step 7 — Create src/app/privacy/page.tsx
Step 8 — Create src/app/refund/page.tsx

Step 9 — src/app/components/Footer.tsx
        Add legal links.
```

---

## TESTING CHECKLIST

After implementation, verify each of the following:

### Backend tests (do these manually with a REST client or curl):

```bash
# Test 1: Login WITHOUT checkbox — must return 400
curl -X POST https://www.icesaathi.co.in/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234","termsAccepted":false}'
# Expected: 400 with message "You must accept the Terms & Conditions"

# Test 2: Login WITH checkbox — must return 200 (if credentials correct)
curl -X POST https://www.icesaathi.co.in/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234","termsAccepted":true}'
# Expected: 200 with token/cookie

# Test 3: Register WITHOUT checkbox — must return 400
curl -X POST https://www.icesaathi.co.in/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"new@test.com","password":"Test@1234","shopName":"Test Shop","termsAccepted":false}'
# Expected: 400 with message "You must accept the Terms & Conditions"
```

### Frontend tests:

- [ ] Login page loads with checkbox unchecked by default
- [ ] Login button is visually disabled (greyed out) when checkbox is unchecked
- [ ] Clicking the checkbox enables the Login button
- [ ] Clicking "Terms & Conditions" link opens `/terms` in a new tab
- [ ] Clicking "Privacy Policy" link opens `/privacy` in a new tab
- [ ] Clicking "Refund Policy" link opens `/refund` in a new tab
- [ ] Login works normally when checkbox is ticked and credentials are correct
- [ ] Login shows error message when credentials are wrong (no change from existing behaviour)
- [ ] Register page has identical checkbox behaviour
- [ ] Terms page is accessible at `https://www.icesaathi.co.in/terms`
- [ ] Privacy page is accessible at `https://www.icesaathi.co.in/privacy`
- [ ] Refund page is accessible at `https://www.icesaathi.co.in/refund`

### Database verification:

After a new registration, check the user document in MongoDB Atlas:
```json
{
  "email": "newuser@example.com",
  "termsAcceptedAt": "2025-06-20T12:34:56.789Z",
  "termsVersion": "1.0"
}
```

After an existing user's first login with the checkbox:
```json
{
  "email": "existinguser@example.com",
  "termsAcceptedAt": "2025-06-20T12:34:56.789Z",
  "termsVersion": "1.0"
}
```

---

## IMPORTANT NOTES

### On existing users
Existing users who registered before this change do NOT have `termsAcceptedAt` in their document. The next time they log in, the login API will:
1. Reject the request if `termsAccepted` is not sent (i.e. frontend checkbox not ticked) — but the frontend checkbox is always visible, so users will tick it
2. Stamp `termsAcceptedAt` on their document silently at that login — they are migrated automatically with zero friction

This is the correct approach for an early-stage SaaS: no forced migration, no broken logins, no mass emails.

### On T&C version management
The `termsVersion: "1.0"` field is set at acceptance. When you significantly update the Terms (e.g. add new data processing clauses), bump this to `"2.0"` in the login and register API routes. You can then query the database for `termsVersion: { $lt: "2.0" }` to find users who have not yet accepted the updated terms and prompt them to re-accept.

### On the legal content
The legal pages in this document are carefully written for an early-stage SaaS product operating under Indian law. However, they are not a substitute for advice from a qualified lawyer. For a production SaaS product with significant user data or payments, it is strongly recommended to have a legal professional review the content before publishing.

---

*End of IceSaathi Legal Pages & Terms Acceptance Implementation Plan*
*softvibeservices@gmail.com | https://softvibe-service.vercel.app/*