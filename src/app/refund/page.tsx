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
