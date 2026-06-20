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
