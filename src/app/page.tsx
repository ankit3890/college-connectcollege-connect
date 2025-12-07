// src/app/page.tsx
"use client";

import Navbar from "@/components/Navbar";
import UserSearch from "@/components/UserSearch";
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

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Hero Section / Welcome Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            Welcome to
          </h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            College<span className="text-indigo-600 dark:text-indigo-400">Connect</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Your all-in-one academic companion. Track attendance, view syllabus, and connect with peers.
          </p>
        </div>

        {/* Guest Search/Actions */}
        {checkedAuth && !user && (
           <div className="max-w-4xl mx-auto mb-8">
             <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-black dark:border-slate-700">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/login" className="flex items-center justify-center p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
                    Login to Account
                  </Link>
                  <Link href="/register" className="flex items-center justify-center p-3 rounded-lg border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-semibold transition-colors">
                    Create Account
                  </Link>
               </div>
             </div>

             {/* Guest Search */}
             <div className="mt-8 mb-8">
               <UserSearch />
             </div>
           </div>
        )}

        {/* User Search (Only if logged in) */}
        {checkedAuth && user && (
          <div className="max-w-4xl mx-auto mb-8">
            <UserSearch />
          </div>
        )}

        {/* Main Grid (Always Visible) */}
        {checkedAuth && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Attendance */}
              <Link
                href={user ? "/attendance" : "/login"}
                onClick={() => logActivity("ACCESS_ATTENDANCE", "Accessed Attendance")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Attendance
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      View your attendance records
                    </p>
                  </div>
                </div>
              </Link>

              {/* Syllabus */}
              <Link
                href={user ? "/syllabus/search" : "/login"}
                onClick={() => logActivity("ACCESS_SYLLABUS", "Accessed Syllabus")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Syllabus
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Search course syllabi
                    </p>
                  </div>
                </div>
              </Link>

              {/* Exam Marks (External) */}
              <Link
                href="https://kiet-exams.codetantra.com/secure/home/view-results.jsp"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logActivity("ACCESS_EXAM_MARKS", "Accessed Exam Marks")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      Exam Marks
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Check your exam results
                    </p>
                  </div>
                </div>
              </Link>

              {/* Messages / Chat */}
              <Link
                href={user ? "/chat" : "/login"}
                onClick={() => logActivity("ACCESS_CHAT", "Accessed Chat")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
                    <svg className="w-8 h-8 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Messages
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Chat with friends
                    </p>
                  </div>
                </div>
              </Link>

              {/* Profile - Already done, skipping re-insertion loop risk, ensuring context match */}
              <Link
                href={user ? `/u/${user.username || user.studentId}` : "/login"}
                onClick={() => logActivity("ACCESS_PROFILE", "Accessed Profile")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Profile
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      View your public profile
                    </p>
                  </div>
                </div>
              </Link>

              {/* Settings */}
              <Link
                href={user ? "/settings" : "/login"}
                onClick={() => logActivity("ACCESS_SETTINGS", "Accessed Settings")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-400"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                    <svg className="w-8 h-8 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      Settings
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      App preferences
                    </p>
                  </div>
                </div>
              </Link>

              {/* Feedback */}
              <Link
                href={user ? "/feedback" : "/login"}
                onClick={() => logActivity("ACCESS_FEEDBACK", "Accessed Feedback")}
                className="group bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-all duration-200 border-2 border-black dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Feedback
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Share your suggestions
                    </p>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        )}


        {/* Footer */}
        <div className="mt-12 text-center pb-8">
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline underline-offset-2 transition-colors">
            Privacy Policy & Terms and Conditions
          </Link>
        </div>

      </main>
    </div>
  );
}
