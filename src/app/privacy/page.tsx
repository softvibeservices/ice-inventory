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
