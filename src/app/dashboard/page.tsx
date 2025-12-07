"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import UserSearch from "@/components/UserSearch";
import { useEffect, useState } from "react";

interface User {
  username?: string;
  name?: string;
  studentId?: string;
  _id: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }
    fetchUser();
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Welcome back, {user?.name || "Student"}
          </p>
        </div>

        {/* User Search */}
        <div className="mb-8">
          <UserSearch />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Attendance */}
          <Link
            href="/attendance"
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
            href="/syllabus/search"
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

          {/* Messages / Chat (NEW) */}
          <Link
            href="/chat"
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

          {/* Profile */}
          <Link
            href={`/u/${user?.username || user?.studentId}`}
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
            href="/settings"
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
            href="/feedback"
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

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 underline underline-offset-2 transition-colors">
            Privacy Policy & Terms and Conditions
          </Link>
        </div>
      </main>
    </div>
  );
}
