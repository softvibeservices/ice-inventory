// src/lib/superAdminAuth.ts

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

interface DecodedToken {
  userId: string;
  role: string;
  email?: string;
  iat?: number;
  exp?: number;
}

interface SuperAdminAuthResult {
  success: true;
  decoded: DecodedToken;
}

interface SuperAdminAuthError {
  success: false;
  response: NextResponse;
}

// ─── Original function (kept for backward compatibility) ──────────────────────
export async function superAdminAuth(
  req: NextRequest
): Promise<SuperAdminAuthResult | SuperAdminAuthError> {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Authorization header missing or malformed" },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Token not provided" },
          { status: 401 }
        ),
      };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined in environment variables");
      return {
        success: false,
        response: NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        ),
      };
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    } catch {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        ),
      };
    }

    if (decoded.role !== "superAdmin") {
      // ── BUG FIX (Bug 5): Removed "yourRole: decoded.role" from the response.
      //    The old response revealed the exact role of the token holder to any
      //    caller who receives a 403. This is unnecessary information disclosure —
      //    an attacker probing the system with a stolen token of any role could
      //    use this to map out the role hierarchy. The caller already knows their
      //    own role; this field only helps an attacker.
      return {
        success: false,
        response: NextResponse.json(
          { error: "Access denied. Insufficient privileges." },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      decoded,
    };
  } catch (error) {
    console.error("SuperAdmin auth error:", error);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

// ─── verifySuperAdminRequest ──────────────────────────────────────────────────
//  Used by all /api/admin/* route handlers.
//  Returns a NextResponse on auth failure (caller should return it immediately),
//  or null on success (caller can proceed).
//
//  Usage pattern in route handlers:
//    const auth = await verifySuperAdminRequest(req);
//    if (auth instanceof NextResponse) return auth;
// ─────────────────────────────────────────────────────────────────────────────
export async function verifySuperAdminRequest(
  req: Request | NextRequest
): Promise<NextResponse | null> {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or malformed" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { error: "Token not provided" },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "superAdmin") {
      // ── BUG FIX (Bug 5): Removed "yourRole: decoded.role" from the response.
      //    Returning the token holder's role in a 403 response body is
      //    unnecessary information disclosure. A legitimate user already knows
      //    their own role; this field only assists attackers mapping the system.
      return NextResponse.json(
        { error: "Access denied. Insufficient privileges." },
        { status: 403 }
      );
    }

    // Auth passed — return null so the caller can proceed
    return null;
  } catch (error) {
    console.error("SuperAdmin auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}