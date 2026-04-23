// src/app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "../components/AdminNavbar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        // ── BUG FIX (Bug 4): Verify the token on the server instead of
        //    decoding it client-side with atob().
        //
        //    The old approach — JSON.parse(atob(token.split(".")[1])) —
        //    only decodes the Base64url payload. It does NOT verify the
        //    HMAC signature, so an attacker can craft a token with any
        //    payload (e.g. {"role":"superAdmin"}) and bypass this check.
        //
        //    The new approach sends the token to a lightweight server endpoint
        //    (/api/admin/verify-access) that calls jwt.verify() with the real
        //    JWT_SECRET. The admin UI only renders after the server has
        //    cryptographically confirmed both the signature and the role.
        const res = await fetch("/api/admin/verify-access", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // 401 = invalid/expired token  →  redirect to login
          // 403 = valid token but wrong role  →  redirect to dashboard
          localStorage.removeItem("token");
          router.replace(res.status === 403 ? "/dashboard" : "/login");
          return;
        }

        setIsAuthorized(true);
      } catch {
        // Network error or unexpected failure — treat as unauthenticated
        localStorage.removeItem("token");
        router.replace("/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#080c12] flex flex-col items-center justify-center gap-3.5 text-gray-600 text-[13px] font-sans">
        <div className="w-7 h-7 border-2 border-[#1e2530] border-t-blue-500 rounded-full animate-spin" />
        <p>Verifying access...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen bg-[#080c12]">
      <AdminNavbar />
      <main className="flex-1 ml-[240px] min-h-screen bg-[#080c12]">
        <div className="px-8 py-7 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}

/*
  ─── IMPORTANT ──────────────────────────────────────────────────────────────
  The following global styles that were previously in <style jsx global>
  must now live in your  src/app/globals.css  (or equivalent global CSS file):

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: #080c12;
    color: #e2e8f0;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar        { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track  { background: #0d1117; }
  ::-webkit-scrollbar-thumb  { background: #2d3748; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #4a5568; }
  ─────────────────────────────────────────────────────────────────────────────
*/