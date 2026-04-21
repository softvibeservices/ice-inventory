// src/lib/razorpay.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Razorpay SDK — shared instance + signature verification helpers
//
//  CHANGES FROM PREVIOUS VERSION:
//    - SDK instance is now lazily initialised via getRazorpay() instead of
//      being created at module load time. This prevents Next.js static
//      generation from evaluating the Razorpay constructor before env vars
//      are available, eliminating the DYNAMIC_SERVER_USAGE build warnings.
//    - createOrder() now calls getRazorpay() internally — no external API change.
//    - Default export `razorpay` replaced by named export `getRazorpay()` to
//      enforce lazy access. Direct use of the default export is removed.
//
//  ENV VARS REQUIRED (set in Vercel project settings + .env.local):
//    RAZORPAY_KEY_ID              — Razorpay Key ID           (server-side only)
//    RAZORPAY_KEY_SECRET          — Razorpay Key Secret       (server-side only, NEVER expose)
//    RAZORPAY_WEBHOOK_SECRET      — Razorpay Dashboard → Webhooks → Secret
//    NEXT_PUBLIC_RAZORPAY_KEY_ID  — same Key ID, NEXT_PUBLIC_ prefix for frontend
//
//  SERVER-SIDE ONLY. Never import this file into client components or pages.
// ─────────────────────────────────────────────────────────────────────────────

import Razorpay from "razorpay";
import crypto   from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
//  RazorpayOrder
//
//  Explicit interface for the object returned by razorpay.orders.create().
//  The Razorpay Node.js SDK types the return as IMap<any> / void in some
//  version declarations. We cast to this interface to get correct TS types
//  in all route files without any `any` casts.
//
//  Matches Razorpay Orders API response:
//  https://razorpay.com/docs/api/orders/
// ─────────────────────────────────────────────────────────────────────────────
export interface RazorpayOrder {
  id:          string;            // e.g. "order_ABC123XYZ"
  entity:      string;            // always "order"
  amount:      number;            // in paise
  amount_paid: number;            // paise paid so far
  amount_due:  number;            // paise remaining
  currency:    string;            // "INR"
  receipt?:    string;
  offer_id?:   string | null;
  status:      "created" | "attempted" | "paid";
  attempts:    number;
  notes:       Record<string, string> | [];
  created_at:  number;            // Unix timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lazy Razorpay singleton
//
//  WHY LAZY?
//    The previous version called `new Razorpay(...)` at module load time.
//    Next.js evaluates all imported modules during the static page generation
//    phase of `next build`. At that point, process.env vars may not be loaded
//    yet, and accessing `request.headers` inside the same module graph
//    triggers DYNAMIC_SERVER_USAGE build errors across every API route that
//    imports this file.
//
//    By deferring construction to the first actual request (getRazorpay()),
//    we guarantee the SDK is only instantiated inside a real server handler,
//    where env vars are always present.
//
//  getRazorpay() throws a hard error if env vars are missing so the failure
//  is immediately visible in Vercel function logs, not silently swallowed.
// ─────────────────────────────────────────────────────────────────────────────
let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (_razorpay) return _razorpay;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "[razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variable is not set. " +
      "Add both to your Vercel project environment variables and redeploy."
    );
  }

  _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _razorpay;
}

// ─────────────────────────────────────────────────────────────────────────────
//  createOrder()
//
//  Typed wrapper around razorpay.orders.create().
//  Returns the explicit RazorpayOrder interface instead of the SDK's
//  under-specified IMap<any>, eliminating TS2322 / TS2339 errors in routes.
//
//  Throws on Razorpay API failure — callers must wrap in try/catch.
//
//  @param params  same params object as razorpay.orders.create()
//  @returns       fully typed RazorpayOrder
// ─────────────────────────────────────────────────────────────────────────────
export async function createOrder(
  params: Parameters<Razorpay["orders"]["create"]>[0]
): Promise<RazorpayOrder> {
  const result = await getRazorpay().orders.create(params);
  return result as unknown as RazorpayOrder;
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyRazorpaySignature()
//
//  Verifies the HMAC-SHA256 signature returned by the Razorpay checkout
//  modal. Call this BEFORE activating any subscription or add-on.
//
//  HOW IT WORKS:
//    Razorpay constructs: `${orderId}|${paymentId}` and hashes it with your
//    Key Secret. We independently recompute the same HMAC and compare.
//
//  Uses crypto.timingSafeEqual() to prevent timing-based side-channel attacks.
//
//  @param orderId    razorpay_order_id from the checkout modal callback
//  @param paymentId  razorpay_payment_id from the checkout modal callback
//  @param signature  razorpay_signature from the checkout modal callback
//  @returns          true if valid, false if tampered or env var missing
// ─────────────────────────────────────────────────────────────────────────────
export function verifyRazorpaySignature(
  orderId:   string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error("[verifyRazorpaySignature] RAZORPAY_KEY_SECRET is not set.");
      return false;
    }

    const message = `${orderId}|${paymentId}`;

    const expectedDigest = crypto
      .createHmac("sha256", keySecret)
      .update(message)
      .digest("hex");

    // timingSafeEqual requires equal-length buffers
    const expectedBuffer = Buffer.from(expectedDigest, "hex");
    const receivedBuffer = Buffer.from(signature,      "hex");

    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    // Malformed hex, empty strings, etc. → treat as invalid
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  verifyRazorpayWebhookSignature()
//
//  Verifies the HMAC-SHA256 signature on incoming Razorpay webhook POST calls.
//
//  KEY DIFFERENCE from verifyRazorpaySignature():
//    ┌─────────────────────────────────┬──────────────────────────────────┐
//    │ verifyRazorpaySignature         │ verifyRazorpayWebhookSignature   │
//    ├─────────────────────────────────┼──────────────────────────────────┤
//    │ Secret: RAZORPAY_KEY_SECRET     │ Secret: RAZORPAY_WEBHOOK_SECRET  │
//    │ Message: orderId|paymentId      │ Message: raw request body string │
//    │ Used by: /verify, /addon/verify │ Used by: /webhook                │
//    └─────────────────────────────────┴──────────────────────────────────┘
//
//  CRITICAL: rawBody MUST be the exact string from req.text() — do NOT
//  parse it as JSON first. Re-serialising changes whitespace and breaks HMAC.
//
//  @param rawBody   raw request body string (from await req.text())
//  @param signature x-razorpay-signature header value
//  @returns         true if valid, false if tampered or env var missing
// ─────────────────────────────────────────────────────────────────────────────
export function verifyRazorpayWebhookSignature(
  rawBody:   string,
  signature: string
): boolean {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[verifyRazorpayWebhookSignature] RAZORPAY_WEBHOOK_SECRET is not set.");
      return false;
    }

    const expectedDigest = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedDigest, "hex");
    const receivedBuffer = Buffer.from(signature,      "hex");

    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}