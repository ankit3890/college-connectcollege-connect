// src/app/reset-password/[token]/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  // token from dynamic route /reset-password/[token]
  const rawToken = params?.token;
  const token =
    typeof rawToken === "string" ? rawToken : Array.isArray(rawToken) ? rawToken[0] : "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage("Invalid or missing reset token.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setMessage("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New password & confirm password do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.msg || "Failed to reset password");
        return;
      }

      setMessage(data.msg || "Password reset successful! Redirecting to login…");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage("Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
        <p className="text-sm text-slate-600 mb-4">
          Set a new password for your CollegeConnect account using the reset link.
        </p>

        {message && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-sm bg-white p-4 rounded-xl shadow-sm border"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border rounded-md px-2 py-1 w-full"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border rounded-md px-2 py-1 w-full"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60 hover:bg-slate-800"
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Login
          </button>
        </form>
      </main>
    </div>
  );
}
