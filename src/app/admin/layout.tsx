// ice-inventory\src\app\admin\layout.tsx

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
    const checkAuth = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (payload.role !== "superAdmin") {
          router.replace("/dashboard");
          return;
        }

        // Check token expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
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
      <div className="admin-loading">
        <div className="loading-spinner" />
        <p>Verifying access...</p>
        <style jsx>{`
          .admin-loading {
            min-height: 100vh;
            background: #080c12;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #4b5563;
            font-size: 13px;
            font-family: "Inter", sans-serif;
          }
          .loading-spinner {
            width: 28px;
            height: 28px;
            border: 2px solid #1e2530;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="admin-shell">
      <AdminNavbar />
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>

      <style jsx global>{`
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

        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        ::-webkit-scrollbar-track {
          background: #0d1117;
        }

        ::-webkit-scrollbar-thumb {
          background: #2d3748;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #4a5568;
        }
      `}</style>

      <style jsx>{`
        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: #080c12;
        }

        .admin-main {
          flex: 1;
          margin-left: 240px;
          min-height: 100vh;
          background: #080c12;
        }

        .admin-content {
          padding: 28px 32px;
          max-width: 1400px;
        }
      `}</style>
    </div>
  );
}