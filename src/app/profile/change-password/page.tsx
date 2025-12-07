// src/app/profile/change-password/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // ✅ Check login first – this page is only for logged‑in users
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.replace("/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password & confirm password do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.msg || "Failed to change password");
        return;
      }

      setMessage(data.msg || "Password changed successfully ✔");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-10">
          <p className="text-sm text-slate-600 dark:text-slate-400">Checking session…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />

      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Change Password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Change your account password for CollegeConnect.
        </p>

        {message && (
          <div className="mb-4 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 text-sm text-blue-800 dark:text-blue-200">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-sm bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border-2 border-black dark:border-slate-700"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Old Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Enter your current password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-semibold disabled:opacity-60 hover:bg-slate-800 dark:hover:bg-slate-200"
          >
            {loading ? "Changing…" : "Change Password"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="w-full mt-1 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            ← Back to Profile
          </button>
        </form>
      </main>
    </div>
  );
}
