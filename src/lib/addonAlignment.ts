// src/lib/addonAlignment.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  Add-on expiry alignment utilities.
//
//  WHY ALIGNMENT MATTERS:
//    A user's subscription invoice count resets on a fixed calendar day each
//    month — tracked in Subscription.invoiceCountResetAt. If an add-on used a
//    naive "now + 30 days" expiry, a user who buys on the 20th but resets on
//    the 1st would get invoice bonuses until the 20th of the following month —
//    20 extra days past when their base limit already reset. That's unfair in
//    the other direction: 20 days of double-counting bonuses.
//
//    By aligning add-on expiry to the same calendar day as the subscription
//    reset, add-on bonuses always expire exactly when the base plan resets.
//    The user gets a clean, predictable billing cycle.
//
//  HOW IT WORKS:
//    1. When an add-on is purchased, call getAnchorDayFromDate() with the
//       user's Subscription.invoiceCountResetAt to extract the anchor day.
//    2. Call computeAddOnExpiry(anchorDay) to get the next occurrence of
//       that calendar day — this becomes AddOn.expiresAt.
//    3. Store the anchorDay in AddOn.billingAnchorDay for future renewal.
//
//  FEBRUARY SAFETY:
//    All anchor days are capped at 28 to avoid "Feb 30" edge cases.
//    getAnchorDayFromDate() enforces this cap.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  MAX_ANCHOR_DAY
//
//  Cap at 28 to ensure the anchor day is valid in all months including
//  February (shortest month). Days 29, 30, 31 do not exist in February.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_ANCHOR_DAY = 28;

// ─────────────────────────────────────────────────────────────────────────────
//  getAnchorDayFromDate()
//
//  Extracts the day-of-month from a Date object.
//  Caps the result at MAX_ANCHOR_DAY (28) for February safety.
//
//  @param date — typically Subscription.invoiceCountResetAt
//  @returns    — integer 1–28 representing the billing anchor day
//
//  Example:
//    getAnchorDayFromDate(new Date("2025-05-31")) → 28  (capped)
//    getAnchorDayFromDate(new Date("2025-05-09")) → 9
//    getAnchorDayFromDate(new Date("2025-05-01")) → 1
// ─────────────────────────────────────────────────────────────────────────────
export function getAnchorDayFromDate(date: Date): number {
  const day = date.getDate(); // Returns 1–31
  return Math.min(day, MAX_ANCHOR_DAY);
}

// ─────────────────────────────────────────────────────────────────────────────
//  computeAddOnExpiry()
//
//  Given a billing anchor day (1–28), returns the next occurrence of that
//  calendar day as a Date. This is the expiry date that should be stored
//  in AddOn.expiresAt.
//
//  Algorithm:
//    1. Start with today's date at midnight UTC.
//    2. Set the day-of-month to anchorDay.
//    3. If the resulting date is in the past (or today — user just bought,
//       so we want the NEXT occurrence), advance by one month.
//    4. Return the resulting Date.
//
//  "In the past or today" check uses strict <=, meaning if the anchor day
//  is today, we advance to next month. This ensures the user always gets
//  a full month of add-on benefit from the moment of purchase.
//
//  @param anchorDay — integer 1–28. Use getAnchorDayFromDate() to extract
//                     this from Subscription.invoiceCountResetAt.
//  @returns         — Date object representing the next anchor day (future)
//
//  Example (today = April 9, anchor = 9):
//    → Next April 9 is today → advance to May 9
//    → Returns: May 9 of current year
//
//  Example (today = April 9, anchor = 15):
//    → April 15 is in the future
//    → Returns: April 15 of current year
//
//  Example (today = April 20, anchor = 9):
//    → April 9 is in the past
//    → Returns: May 9 of current year
// ─────────────────────────────────────────────────────────────────────────────
export function computeAddOnExpiry(anchorDay: number): Date {
  // Clamp the input in case caller passes an out-of-range value
  const clampedDay = Math.max(1, Math.min(anchorDay, MAX_ANCHOR_DAY));

  // Start from today at midnight UTC for deterministic comparison
  const now = new Date();
  const todayMidnightUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Build a candidate date in the current month at the anchor day
  const candidate = new Date(
    Date.UTC(
      todayMidnightUTC.getUTCFullYear(),
      todayMidnightUTC.getUTCMonth(),
      clampedDay
    )
  );

  // If the candidate is today or in the past, advance to next month.
  // We use <= (not <) so that purchasing on the anchor day itself gives
  // a full month of benefit, not 0 days.
  if (candidate <= todayMidnightUTC) {
    // Advance by exactly one month using UTC month arithmetic.
    // JavaScript's Date constructor handles month overflow correctly:
    // new Date(Date.UTC(2025, 11, 28)) = Dec 28 2025
    // new Date(Date.UTC(2025, 12, 28)) = Jan 28 2026  ← correct overflow
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  }

  return candidate;
}

// ─────────────────────────────────────────────────────────────────────────────
//  getNextResetDate()
//
//  Helper that returns the next date when Subscription.invoiceCountResetAt
//  should be advanced to. Used by lazyResetInvoiceCountIfNeeded() in
//  subscriptionGuard.ts.
//
//  Given the current invoiceCountResetAt date, returns that same calendar
//  day one month later.
//
//  @param currentResetAt — Subscription.invoiceCountResetAt
//  @returns              — Date one month later, same day-of-month (capped at 28)
//
//  Example:
//    currentResetAt = May 9 → returns June 9
//    currentResetAt = Jan 31 (stored as Jan 28 due to cap) → returns Feb 28
// ─────────────────────────────────────────────────────────────────────────────
export function getNextResetDate(currentResetAt: Date): Date {
  const anchorDay = getAnchorDayFromDate(currentResetAt);

  // Advance by exactly one month
  const next = new Date(
    Date.UTC(
      currentResetAt.getUTCFullYear(),
      currentResetAt.getUTCMonth() + 1, // JS handles year overflow
      anchorDay
    )
  );

  return next;
}