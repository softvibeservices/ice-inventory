// src/app/api/auth/check-email/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/check-email
//
//  Public endpoint — no auth required.
//  Used by PricingSection.tsx to determine whether a visitor who clicks a
//  paid-plan CTA has an existing account:
//
//    exists === true  → redirect to /login   (they can log in and then upgrade)
//    exists === false → redirect to /register (they need to create an account)
//
//  Only checks admin-role users (not managers or delivery partners).
//  Returns { exists: boolean } — nothing else, to minimise information leakage.
//
//  Rate-limited to 10 requests per IP per minute to prevent email enumeration.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 256;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Body size guard ────────────────────────────────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = rateLimit(`check-email:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", exists: false },
      { status: 429 }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── 4. Validate email ─────────────────────────────────────────────────────
  const emailRaw = raw.email;
  if (!emailRaw || typeof emailRaw !== "string" || emailRaw.trim() === "") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = emailRaw.trim().toLowerCase().slice(0, 254);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format.", exists: false },
      { status: 400 }
    );
  }

  // ── 5. DB lookup ──────────────────────────────────────────────────────────
  try {
    await connectDB();

    // Only check admin-role users (not managers, not delivery partners)
    const user = await User.findOne(
      { email, role: "admin" },
      { _id: 1 }         // projection — only need existence, not the doc
    ).lean();

    return NextResponse.json({ exists: !!user }, { status: 200 });
  } catch (err) {
    console.error("[check-email] DB error:", err);
    // On error, return exists: false — don't block the user, let them proceed
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}