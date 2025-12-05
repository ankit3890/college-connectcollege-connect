// src/app/page.tsx
"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
  _id?: string;
  studentId: string;
  name?: string;
  email?: string;
  username?: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const logActivity = async (action: string, details: string) => {
    try {
      await fetch("/api/log/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, details }),
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const raw = await res.json();
          const u: User | undefined = raw.user ?? raw;
          setUser(u ?? null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setCheckedAuth(true);
      }
    }

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Main heading */}
        <section className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to <span className="text-blue-600 dark:text-blue-400">CollegeConnect</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            One place for your college profile, upcoming chat system, AI
            assistance, attendance and announcements.
          </p>
        </section>

        {/* Only render auth‑dependent UI after we checked */}
        {checkedAuth && (
          <>
            {/* NOT LOGGED IN: show Login / Register buttons */}
            {!user && (
              <section className="text-center space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Login or create an account to access all features.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    href="/login"
                    className="rounded-md bg-black px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md border border-black dark:border-white px-4 py-1.5 text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              </section>
            )}

            {/* LOGGED IN: show quick info */}
            {user && (
              <section className="space-y-2 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You are logged in as{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {user.name || user.studentId}
                  </span>
                  .
                </p>
              </section>
            )}
          </>
        )}

        {/* Connect Card - available to everyone */}
        <section className="mt-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Connect with Friends</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Find classmates and follow their academic journey.</p>
              </div>
            </div>
            <Link
              href="/login"
              className="px-4 py-1.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Login to Access
            </Link>
          </div>
        </section>

        {/* Feature cards - available to everyone */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Attendance Card */}
          <Link
            href="/attendance"
            onClick={() => logActivity("ACCESS_ATTENDANCE", "Accessed Attendance (Welcome Page)")}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Attendance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  View your attendance records
                </p>
                <div className="mt-3 flex items-center text-blue-600 text-xs font-medium">
                  Open
                  <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Syllabus Card */}
          <Link
            href="/syllabus/search"
            onClick={() => logActivity("ACCESS_SYLLABUS", "Accessed Syllabus (Welcome Page)")}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Syllabus
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Search course syllabi
                </p>
                <div className="mt-3 flex items-center text-emerald-600 text-xs font-medium">
                  Open
                  <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Profile Card */}
          <Link
            href={`/u/${user?.username || user?.studentId}`}
            onClick={() => logActivity("ACCESS_PROFILE", "Accessed Profile (Welcome Page)")}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  View your public profile
                </p>
                <div className="mt-3 flex items-center text-purple-600 text-xs font-medium">
                  Open
                  <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Settings Card */}
          <Link
            href="/settings"
            onClick={() => logActivity("ACCESS_SETTINGS", "Accessed Settings (Welcome Page)")}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-400"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  App preferences
                </p>
              </div>
            </div>
          </Link>

          {/* Feedback Card */}
          <Link
            href="/feedback"
            onClick={() => logActivity("ACCESS_FEEDBACK", "Accessed Feedback (Welcome Page)")}
            className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Feedback
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Share your suggestions
                </p>
                <div className="mt-3 flex items-center text-blue-600 text-xs font-medium">
                  Open
                  <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <section className="text-center col-span-1 md:col-span-2 mt-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Created By-
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                Ankit Kumar singh , Nitin Kumar Singh, Sameer Sharma
              </span>
              .
            </p>
          </section>
        </section>
      </main>
    </div>
  );
}
