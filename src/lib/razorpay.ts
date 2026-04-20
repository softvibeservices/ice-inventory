// src/lib/razorpay.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Razorpay SDK — shared instance + signature verification helpers
//
//  This file is the ONLY place Razorpay is initialised.
//  Import `razorpay` for order creation.
//  Import `verifyRazorpaySignature` for HMAC-SHA256 payment signature verification.
//  Import `verifyRazorpayWebhookSignature` for webhook signature verification.
//  Import `RazorpayOrder` for typing order creation responses.
//
//  SECURITY NOTE:
//    verifyRazorpaySignature uses crypto.timingSafeEqual() to compare the
//    computed HMAC digest against the received signature. This prevents
//    timing attacks where an attacker could guess the signature byte-by-byte
//    based on how long the comparison takes with a naive string comparison.
//
//  ENV VARS REQUIRED (add to .env.local):
//    RAZORPAY_KEY_ID              — your Razorpay Key ID     (server-side only)
//    RAZORPAY_KEY_SECRET          — your Razorpay Key Secret (server-side only, NEVER expose)
//    RAZORPAY_WEBHOOK_SECRET      — set in Razorpay Dashboard → Webhooks → Secret
//    NEXT_PUBLIC_RAZORPAY_KEY_ID  — same Key ID, prefixed so frontend can read it
//
//  NOTE: razorpay.ts is SERVER-SIDE ONLY. Never import it into client components.
// ─────────────────────────────────────────────────────────────────────────────

import Razorpay from "razorpay";
import crypto   from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
//  RazorpayOrder
//
//  Explicit interface for the object returned by razorpay.orders.create().
//  The Razorpay Node.js SDK types sometimes resolve `orders.create` return
//  type as `void` in older versions, causing TypeScript errors on property
//  access (e.g. `.id`). This interface is cast over the result to guarantee
//  correct typing in all route files.
//
//  Fields match Razorpay's Orders API response exactly:
//  https://razorpay.com/docs/api/orders/
// ─────────────────────────────────────────────────────────────────────────────
export interface RazorpayOrder {
  id:           string;          // e.g. "order_ABC123XYZ"
  entity:       string;          // always "order"
  amount:       number;          // in paise
  amount_paid:  number;          // paise paid so far
  amount_due:   number;          // paise remaining
  currency:     string;          // "INR"
  receipt?:     string;          // your receipt string
  offer_id?:    string | null;
  status:       "created" | "attempted" | "paid";
  attempts:     number;
  notes:        Record<string, string> | [];
  created_at:   number;          // Unix timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared Razorpay SDK instance
//
//  Used by:
//    - /api/payment/create-order         → razorpay.orders.create(...)
//    - /api/payment/addon/create-order   → razorpay.orders.create(...)
//
//  The instance is created once at module load time (singleton pattern).
//  Next.js module caching ensures this is not re-created on every request.
//
//  ENV GUARD:
//    If RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET are missing at startup,
//    we log a clear warning so developers catch misconfiguration early
//    rather than getting cryptic Razorpay API errors at runtime.
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn(
    "[razorpay] WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. " +
    "Payment routes will fail at runtime. Check your .env.local file."
  );
}

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
});

export default razorpay;

// ─────────────────────────────────────────────────────────────────────────────
//  createOrder()
//
//  Typed wrapper around razorpay.orders.create() that returns the explicit
//  RazorpayOrder interface instead of the SDK's under-specified IMap<any>.
//
//  Use this in route files instead of calling razorpay.orders.create() directly
//  to get correct TypeScript types without `any` casts in every route.
//
//  Throws the original Razorpay SDK error on failure — callers must wrap in
//  try/catch and handle the error (e.g. return 502).
//
//  @param params — same params as razorpay.orders.create()
//  @returns       — fully typed RazorpayOrder
// ─────────────────────────────────────────────────────────────────────────────
export async function createOrder(
  params: Parameters<typeof razorpay.orders.create>[0]
): Promise<RazorpayOrder> {
  // The Razorpay SDK types `orders.create` return as `IMap<any>` (or `void`
  // in some version declarations). We cast via `unknown` to our explicit
  // RazorpayOrder interface which matches the actual API response shape.
  const result = await razorpay.orders.create(params);
  return result as unknown as RazorpayOrder;
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyRazorpaySignature()
//
//  Verifies the HMAC-SHA256 signature returned by the Razorpay checkout
//  modal. Call this BEFORE activating any subscription or add-on.
//
//  HOW IT WORKS:
//    1. Razorpay constructs the signed message as: `${orderId}|${paymentId}`
//    2. Razorpay hashes this message using your Key Secret via HMAC-SHA256.
//    3. Your server independently recomputes the same HMAC.
//    4. If the digests match, the payment is authentic.
//
//  Used by:
//    - /api/payment/verify               (subscription payment callback)
//    - /api/payment/addon/verify         (add-on payment callback)
//
//  @param orderId    — razorpay_order_id from the checkout response
//  @param paymentId  — razorpay_payment_id from the checkout response
//  @param signature  — razorpay_signature from the checkout response
//  @returns          — true if signature is valid, false if tampered
// ─────────────────────────────────────────────────────────────────────────────
export function verifyRazorpaySignature(
  orderId:   string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

    if (!keySecret) {
      console.error("[verifyRazorpaySignature] RAZORPAY_KEY_SECRET is not set.");
      return false;
    }

    // Build the message Razorpay signs: "orderId|paymentId"
    const message = `${orderId}|${paymentId}`;

    // Compute the expected HMAC-SHA256 digest
    const expectedDigest = crypto
      .createHmac("sha256", keySecret)
      .update(message)
      .digest("hex");

    // Use timingSafeEqual to prevent timing attacks.
    // Both buffers must be the same byte length for timingSafeEqual to work.
    const expectedBuffer = Buffer.from(expectedDigest, "hex");
    const receivedBuffer = Buffer.from(signature,       "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    // Any error (e.g., malformed hex string) is treated as an invalid signature
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyRazorpayWebhookSignature()
//
//  Verifies the HMAC-SHA256 signature on incoming Razorpay webhook calls.
//  This is DIFFERENT from verifyRazorpaySignature():
//
//    verifyRazorpaySignature        → uses RAZORPAY_KEY_SECRET
//                                     message = `${orderId}|${paymentId}`
//
//    verifyRazorpayWebhookSignature → uses RAZORPAY_WEBHOOK_SECRET
//                                     message = raw request body (string)
//
//  The webhook secret is configured separately in your Razorpay Dashboard
//  under: Settings → Webhooks → [your endpoint] → Secret
//
//  CRITICAL: The raw body MUST be passed as a string (not parsed JSON).
//  Parsing the body before hashing changes the string and breaks verification.
//  In the webhook route, read with `await req.text()` — NOT `await req.json()`.
//
//  Used by:
//    - /api/payment/webhook             (Razorpay server-to-server webhook)
//
//  @param rawBody    — the raw request body as a string (from req.text())
//  @param signature  — the x-razorpay-signature header value
//  @returns          — true if webhook signature is valid, false if tampered
// ─────────────────────────────────────────────────────────────────────────────
export function verifyRazorpayWebhookSignature(
  rawBody:   string,
  signature: string
): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

    if (!webhookSecret) {
      console.error("[verifyRazorpayWebhookSignature] RAZORPAY_WEBHOOK_SECRET is not set.");
      return false;
    }

    // Compute HMAC-SHA256 of the raw body using the webhook secret
    const expectedDigest = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // timingSafeEqual requires equal-length buffers
    const expectedBuffer = Buffer.from(expectedDigest, "hex");
    const receivedBuffer = Buffer.from(signature,       "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}