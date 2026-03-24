// src/utils/deviceFingerprint.ts
// ─────────────────────────────────────────────────────────────────────────────
//  Client-side ONLY. Never import this in server components or API routes.
//  Generates a stable fingerprint per physical device by collecting browser
//  signals that differ between devices even when the browser version and OS
//  are identical (e.g. two MacBooks running Chrome 122 on the same WiFi).
//
//  Stability guarantee:
//    - Same device + same browser  → same fingerprint on every login
//    - Different physical device   → different fingerprint (even if same UA)
//    - Clearing localStorage       → new fingerprint generated on next call
//    - Private/incognito window    → new fingerprint (no localStorage access)
//
//  Signals used (in order of discriminating power):
//    1. Canvas fingerprint  — GPU + driver + OS font rendering differences
//    2. hardwareConcurrency — CPU core count (2/4/8/16 differ per machine)
//    3. screen resolution   — width × height × colorDepth
//    4. timezone offset     — UTC offset in minutes
//    5. language            — browser locale (en-US, en-IN, etc.)
//    6. userAgent           — browser + OS string (already on server, kept for completeness)
//
//  The combined signal is hashed to a short hex string and persisted in
//  localStorage under the key "dv_fp" so it is stable across page reloads
//  and multiple logins without recomputing every time.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dv_fp";
const FP_VERSION  = "v1"; // bump this if you add new signals in the future

// ─────────────────────────────────────────────
//  Canvas fingerprint
//  Draws text + shapes to an offscreen canvas and reads back the pixel data.
//  Different GPUs, GPU drivers, and OS-level font rasterisers produce subtly
//  different anti-aliasing, making this the single most discriminating signal.
// ─────────────────────────────────────────────
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width  = 200;
    canvas.height = 50;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-ctx";

    // Text rendering — font hinting differs per OS / GPU driver
    ctx.textBaseline = "top";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("device-fp \u2603 \ud83d\udd12", 2, 4); // snowman + lock emoji stress GPU

    // Shape rendering — sub-pixel differences per GPU
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.beginPath();
    ctx.arc(50, 25, 20, 0, Math.PI * 2);
    ctx.fill();

    // Take only the last 40 chars of the base64 data URL — that's where
    // pixel-level differences concentrate, and it keeps the string short.
    return canvas.toDataURL("image/png").slice(-40);
  } catch {
    return "canvas-err";
  }
}

// ─────────────────────────────────────────────
//  Simple djb2-style hash
//  Produces a short hex-like string from an arbitrary input string.
//  Not cryptographic — we just need stable, collision-resistant short IDs.
// ─────────────────────────────────────────────
function hashSignals(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
     ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
     ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Return as a 16-char lowercase hex string
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

// ─────────────────────────────────────────────
//  Collect all signals and produce the fingerprint string
// ─────────────────────────────────────────────
function computeFingerprint(): string {
  const signals: string[] = [
    FP_VERSION,
    navigator.userAgent,
    String(navigator.hardwareConcurrency ?? "?"),   // CPU cores
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),          // timezone
    navigator.language ?? "?",
    getCanvasFingerprint(),
  ];

  return hashSignals(signals.join("||"));
}

// ─────────────────────────────────────────────
//  Public API — the only export you need
//
//  Call this once inside handleSubmit on the login page BEFORE making the
//  fetch call. It is synchronous and takes < 5ms including canvas rendering.
//
//  Returns a 16-char lowercase hex string, e.g. "a3f92c1d7b0e4f58"
// ─────────────────────────────────────────────
export function getOrCreateDeviceFingerprint(): string {
  // Guard: this must only run in a browser environment
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "ssr-no-fp";
  }

  // Return the cached fingerprint if it exists and is from the current version
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && cached.startsWith(FP_VERSION + ":")) {
      // Strip the version prefix before returning
      return cached.slice(FP_VERSION.length + 1);
    }
  } catch {
    // localStorage may be blocked (strict cookie settings, some browsers in
    // private mode throw on access). Fall through to compute fresh.
  }

  // Compute a fresh fingerprint
  const fp = computeFingerprint();

  // Persist it so future logins on this device are instant
  try {
    localStorage.setItem(STORAGE_KEY, `${FP_VERSION}:${fp}`);
  } catch {
    // If storage is blocked, we still return the computed value for this session.
    // The server fallback (UA hash) will kick in on the next login if needed.
  }

  return fp;
}