// ice-inventory\src\lib\superAdminAuth.ts

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
    } catch (jwtError) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        ),
      };
    }

    // Hard role check — only superAdmin can pass
    if (decoded.role !== "superAdmin") {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Access denied. SuperAdmin privileges required.",
            yourRole: decoded.role,
          },
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