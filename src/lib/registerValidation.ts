/**
 * lib/registerValidation.ts
 *
 * Centralised validation & sanitisation rules for the register flow.
 * Import these in both the register and resend API routes so the rules
 * are never duplicated and always stay in sync.
 */

// ─── Regex ────────────────────────────────────────────────────────────────────

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const CONTACT_RE = /^[0-9]{10}$/;

// ─── Field character limits ───────────────────────────────────────────────────

export const LIMITS = {
  name: 80,
  email: 254,        // RFC 5321 maximum
  contact: 10,
  password: 128,     // bcrypt silently truncates at 72 bytes — keep a hard cap
} as const;

// ─── Sanitisers ───────────────────────────────────────────────────────────────

/** Strip leading/trailing whitespace and collapse internal runs of whitespace */
function clean(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s{2,}/g, " ");
}

/** Remove every character that is not a digit */
function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

// ─── Main sanitiser ───────────────────────────────────────────────────────────

export interface RegisterFields {
  name: string;
  email: string;
  contact: string;
  password: string;
}

export interface SanitiseResult {
  ok: boolean;
  error?: string;
  data: RegisterFields;
}

/**
 * Sanitise and validate a raw register request body.
 * Returns `{ ok: false, error }` on the first violation found.
 * Returns `{ ok: true, data }` with clean values when everything passes.
 */
export function sanitiseRegisterBody(raw: Record<string, unknown>): SanitiseResult {
  // ── Presence ──────────────────────────────────────────────────────────────
  const requiredKeys: (keyof RegisterFields)[] = [
    "name", "email", "contact", "password",
  ];

  for (const key of requiredKeys) {
    if (!raw[key] || String(raw[key]).trim() === "") {
      return {
        ok: false,
        error: `${fieldLabel(key)} is required.`,
        data: emptyData(),
      };
    }
  }

  // ── Clean ─────────────────────────────────────────────────────────────────
  const name        = clean(raw.name).slice(0, LIMITS.name);
  const email       = clean(raw.email).toLowerCase().slice(0, LIMITS.email);
  const contact     = digitsOnly(raw.contact).slice(0, LIMITS.contact);
  const password    = String(raw.password ?? "").slice(0, LIMITS.password);

  // ── Format ────────────────────────────────────────────────────────────────
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please provide a valid email address.", data: emptyData() };
  }

  if (!CONTACT_RE.test(contact)) {
    return { ok: false, error: "Contact must be exactly 10 digits.", data: emptyData() };
  }

  if (password.length < 6) {
    return {
      ok: false,
      error: "Password must be at least 6 characters.",
      data: emptyData(),
    };
  }

  // ── Extra content guards ──────────────────────────────────────────────────
  if (/[<>]/.test(name)) {
    return { ok: false, error: "Invalid characters detected in input.", data: emptyData() };
  }

  return {
    ok: true,
    data: { name, email, contact, password },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyData(): RegisterFields {
  return {
    name: "", email: "", contact: "", password: "",
  };
}

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    name: "Full name",
    email: "Email",
    contact: "Contact number",
    password: "Password",
  };
  return labels[key] ?? key;
}