// src/app/api/admin/verify-access/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  SECURITY FIX (VUL-08): Corrected verifySuperAdminRequest guard logic
//
//  BEFORE (BROKEN):
//    const authError = await verifySuperAdminRequest(req);
//    if (authError) return authError;
//    // ❌ This ALWAYS returns early because auth object is truthy on success!
//
//  AFTER (FIXED):
//    const auth = await verifySuperAdminRequest(req);
//    if (auth instanceof NextResponse) return auth;
//    // ✅ Only returns early on actual error responses (401/403)
//
//  This endpoint is called by admin/layout.tsx to verify server-side that:
//    1. The JWT signature is cryptographically valid (not just base64-decoded)
//    2. The token hasn't expired
//    3. The role claim is "superAdmin"
//
//  Responses:
//    200 OK         — token is valid and role is superAdmin
//    401 Unauthorized — token is missing, malformed, or expired
//    403 Forbidden  — token is valid but role is not superAdmin
//    500            — server misconfiguration (JWT_SECRET missing)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import { verifySuperAdminRequest } from "@/lib/superAdminAuth";

// Force dynamic rendering — this route must never be statically cached,
// as it performs live token verification on every request.
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  // VUL-08 FIX: Use the correct guard pattern
  // verifySuperAdminRequest() returns NextResponse on failure, or the decoded
  // auth object on success. We only want to return early if it's an error response.
  const auth = await verifySuperAdminRequest(req);
  if (auth instanceof NextResponse) return auth; // 401 or 403

  // Auth successful — user is verified superAdmin
  return NextResponse.json({ ok: true }, { status: 200 });
}