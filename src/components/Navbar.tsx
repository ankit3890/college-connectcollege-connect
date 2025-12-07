// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CurrentUser {
  name?: string;
  studentId?: string;
  role?: "student" | "admin" | "superadmin";
  username?: string;
  hasSyncedFromCyberVidya?: boolean;
}

interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [maintenance, setMaintenance] = useState<MaintenanceConfig>({
    maintenanceMode: false,
    maintenanceMessage: "",
  });

  async function fetchUser() {
    try {
      const res = await fetch("/api/user/me");
      console.log("🔍 Navbar fetchUser response:", res.status, res.ok);
      if (!res.ok) {
        setUser(null);
        console.log("✅ User set to null (not logged in)");
        return;
      }
      const data = await res.json();
      const u = data.user ?? data;
      setUser({
        name: u.name || u.username || "",
        studentId: u.studentId,
        role: u.role,
        username: u.username,
        hasSyncedFromCyberVidya: u.hasSyncedFromCyberVidya,
      });
      console.log("✅ User set:", u);
    } catch (err) {
      console.error("❌ fetchUser error:", err);
      setUser(null);
    } finally {
      setLoadingUser(false);
      console.log("🏁 loadingUser set to false");
    }
  }

  async function fetchMaintenance() {
    try {
      const res = await fetch("/api/system/config");
      if (!res.ok) return;
      const data = await res.json();
      setMaintenance({
        maintenanceMode: !!data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage || "",
      });
    } catch {
      // ignore banner errors
    }
  }

  useEffect(() => {
    fetchUser();
    fetchMaintenance();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {
      // ignore
    } finally {
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/");
    }
  }

  function linkClass(path: string, mobile = false) {
    const active = pathname === path;
    if (mobile) {
      return (
        "block px-4 py-2 text-base font-medium rounded-md " +
        (active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100")
      );
    }
    return (
      "px-3 py-1.5 text-sm font-medium rounded-md " +
      (active
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100")
    );
  }

  const isAdmin =
    user?.role === "admin" || user?.role === "superadmin";

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      {/* Maintenance banner */}
      {maintenance.maintenanceMode && (
        <div className="w-full bg-amber-100 border-b border-amber-200 px-4 py-2">
          <p className="text-xs sm:text-sm text-amber-900">
            <span className="font-semibold mr-1">Maintenance:</span>
            {maintenance.maintenanceMessage
              ? maintenance.maintenanceMessage
              : "The system is currently under maintenance. Some features may be limited."}
          </p>
        </div>
      )}

      {/* Sync Profile Banner */}
      {user && !user.hasSyncedFromCyberVidya && (
        <div className="w-full bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-700 transition-colors">
          <Link 
            href="/profile/edit" 
            className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-red-700 dark:text-white hover:text-red-800 dark:hover:text-red-100 hover:underline transition-all group"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-800 text-red-600 dark:text-white">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <span>Your profile is not synced with CyberVidya. <span className="font-bold">Sync Now</span></span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      )}

      <nav className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">
                College<span className="text-blue-600">Connect</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {user && (
              <>
                <Link href="/dashboard" className={linkClass("/dashboard")}>
                  Dashboard
                </Link>

                <Link href={`/u/${user.username || user.studentId}`} className={linkClass(`/u/${user.username || user.studentId}`)}>
                  Profile
                </Link>

                {isAdmin && (
                  <>
                    <Link href="/admin" className={linkClass("/admin")}>
                      Admin
                    </Link>
                    <Link
                      href="/admin/logs"
                      className={linkClass("/admin/logs")}
                    >
                      Logs
                    </Link>
                    <Link
                      href="/admin/settings"
                      className={linkClass("/admin/settings")}
                    >
                      Settings
                    </Link>
                  </>
                )}
              </>
            )}

            {!loadingUser && !user && (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  Login
                </Link>
                <Link href="/register" className={linkClass("/register")}>
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 space-y-1">
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className={linkClass("/dashboard", true)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>

                <Link
                  href={`/u/${user.username || user.studentId}`}
                  className={linkClass(`/u/${user.username || user.studentId}`, true)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      className={linkClass("/admin", true)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/admin/logs"
                      className={linkClass("/admin/logs", true)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Logs
                    </Link>
                    <Link
                      href="/admin/settings"
                      className={linkClass("/admin/settings", true)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md"
                >
                  Logout
                </button>
              </>
            )}

            {!loadingUser && !user && (
              <>
                <Link
                  href="/login"
                  className={linkClass("/login", true)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={linkClass("/register", true)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
