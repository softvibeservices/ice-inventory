// src/app/api/admin/verify-access/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  NEW FILE — required by the Bug 4 fix in src/app/admin/layout.tsx.
//
//  This lightweight endpoint is called by the admin layout's useEffect to
//  verify that the user's token is both cryptographically valid AND carries
//  the "superAdmin" role — all on the server, where the JWT_SECRET is known.
//
//  The admin layout previously decoded the JWT client-side using atob(), which
//  only base64-decodes the payload without verifying the HMAC signature. An
//  attacker could forge a token with {"role":"superAdmin"} and pass the UI
//  guard. This endpoint closes that gap.
//
//  Responses:
//    200 OK         — token is valid and role is superAdmin
//    401 Unauthorized — token is missing, malformed, or expired
//    403 Forbidden  — token is valid but role is not superAdmin
//    500            — server misconfiguration (JWT_SECRET missing)
//
//  Usage (admin/layout.tsx):
//    const res = await fetch("/api/admin/verify-access", {
//      headers: { Authorization: `Bearer ${token}` },
//    });
//    if (!res.ok) { ... redirect ... }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";

// Force dynamic rendering — this route must never be statically cached,
// as it performs live token verification on every request.
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  // verifySuperAdminRequest() calls jwt.verify() with the real JWT_SECRET,
  // checks expiry, and validates the "superAdmin" role claim.
  // Returns a NextResponse (401 or 403) on failure, or null on success.
  const authError = await verifySuperAdminRequest(req);
  if (authError) return authError;

  return NextResponse.json({ ok: true }, { status: 200 });
}