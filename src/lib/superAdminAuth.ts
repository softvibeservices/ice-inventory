// src/lib/superAdminAuth.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  SuperAdmin Auth Middleware
//
//  This is a thin wrapper around verifyUserRequest() that additionally
//  enforces that the caller has role === "superAdmin".
//
//  Import and use this at the top of every /api/admin/** route handler
//  instead of verifyUserRequest() directly.
//
//  Usage:
//    const auth = await verifySuperAdminRequest(req);
//    if (auth instanceof NextResponse) return auth;
//    // auth.userId, auth.role === "superAdmin" guaranteed past this point
//
//  Security contract:
//    - Returns 401 if the token is missing, invalid, or expired.
//    - Returns 403 if the authenticated user is NOT a superAdmin.
//    - Returns the AuthPayload if all checks pass.
//
//  This ensures that no admin (role: "admin") or manager (role: "manager")
//  can ever access any superAdmin API route, even if they have a valid JWT.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { verifyUserRequest, AuthPayload } from "@/lib/userAuth";

// ─────────────────────────────────────────────────────────────────────────────
//  verifySuperAdminRequest()
//
//  @param req — The incoming Next.js Request object
//  @returns   — AuthPayload (role guaranteed "superAdmin") or NextResponse error
// ─────────────────────────────────────────────────────────────────────────────
export async function verifySuperAdminRequest(
  req: Request
): Promise<AuthPayload | NextResponse> {
  // Step 1: Run the standard auth check (JWT verify, device check, etc.)
  const auth = await verifyUserRequest(req);

  // Step 2: If verifyUserRequest returned an error response, bubble it up
  if (auth instanceof NextResponse) {
    return auth;
  }

  // Step 3: Enforce superAdmin role
  if (auth.role !== "superAdmin") {
    return NextResponse.json(
      {
        error:
          "Access denied. This endpoint is restricted to superAdmin accounts only.",
      },
      { status: 403 }
    );
  }

  // Step 4: All checks passed — return the verified payload
  return auth;
}