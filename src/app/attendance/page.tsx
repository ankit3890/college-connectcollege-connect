"use client";

import Navbar from "@/components/Navbar";

import DaywiseCalendarGrid from "@/components/DaywiseCalendarGrid";
import DaywiseTable from "@/components/DaywiseTable";
import WeeklyTimetable from "@/components/WeeklyTimetable";
import AttendanceGraph from "@/components/AttendanceGraph";
import { FormEvent, useEffect, useMemo, useState } from "react";

interface AttendanceCourse {
  courseCode: string;
  courseName: string;
  componentName: string;
  totalClasses: number;
  presentClasses: number;
  percentage: number;
  courseComponentId?: number;
  courseVariant?: string;
  courseId?: number;
  sessionId?: number | null;
  studentId?: number | null;
}

interface StudentInfo {
  fullName?: string;
  registrationNumber?: string;
  branchShortName?: string;
  semesterName?: string;
  admissionBatchName?: string;
}

interface DaywiseEntry {
  date: string | null;
  day: string | null;
  timeSlot: string | null;
  status: string | null;
  isUpcoming?: boolean;
}

interface ScheduleItem {
  courseName: string;
  courseCode: string;
  lectureDate: string; // "DD/MM/YYYY"
  dateTime: string;    // "DD/MM/YYYY : HH:MM AM - HH:MM PM"
  roomName?: string;
}

export default function AttendancePage() {
  const [cyberId, setCyberId] = useState("");
  const [cyberPass, setCyberPass] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);

  // daywise modal state
  const [daywiseOpen, setDaywiseOpen] = useState(false);
  const [daywiseCourse, setDaywiseCourse] =
    useState<AttendanceCourse | null>(null);
  const [daywiseLoading, setDaywiseLoading] = useState(false);
  const [daywiseError, setDaywiseError] = useState<string | null>(null);
  const [daywiseEntries, setDaywiseEntries] = useState<DaywiseEntry[]>([]);

  // Schedule modal state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCourse, setScheduleCourse] = useState<AttendanceCourse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleEntries, setScheduleEntries] = useState<DaywiseEntry[]>([]);


  const [projectionOpen, setProjectionOpen] = useState(false);
  const [projectionTarget, setProjectionTarget] = useState(75); // target %
  const [projectionInputs, setProjectionInputs] = useState<Record<string, number>>({});

  // --- NEW: Timetable state ---
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [fullSchedule, setFullSchedule] = useState<ScheduleItem[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableError, setTimetableError] = useState<string | null>(null);

  // --- NEW: Graph view state ---
  const [showGraph, setShowGraph] = useState(false);

  // auto‑hide "success" message after a few seconds
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // Check localStorage for remembered credentials
  useEffect(() => {
    const storedId = localStorage.getItem("cyberId");
    const storedPass = localStorage.getItem("cyberPass");
    if (storedId && storedPass) {
      setCyberId(storedId);
      setCyberPass(storedPass);
      setRememberMe(true);
      setAcceptedTerms(true); // If they remembered, they must have accepted terms before
    }
  }, []);

  function courseKey(c: AttendanceCourse): string {
    return `${c.courseCode || c.courseId || "C"}-${c.componentName || ""}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!cyberId || !cyberPass) {
      setError("Please enter your CyberVidya credentials.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms and Conditions to proceed.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/attendance/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cyberId, cyberPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "Failed to fetch attendance");
        setHasLoggedIn(false);
        setStudent(null);
        setCourses([]);
        return;
      }

      setMsg(data.msg || "Attendance loaded from CyberVidya");
      setStudent(data.student || null);
      setCourses(data.courses || []);
      setHasLoggedIn(true);

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem("cyberId", cyberId);
        localStorage.setItem("cyberPass", cyberPass);
      } else {
        localStorage.removeItem("cyberId");
        localStorage.removeItem("cyberPass");
      }

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setHasLoggedIn(false);
      setStudent(null);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setCyberPass("");
    setCyberId("");
    setHasLoggedIn(false);
    setStudent(null);
    setCourses([]);
    setMsg(null);
    setError(null);
    setRememberMe(false);
    setAcceptedTerms(false);
    localStorage.removeItem("cyberId");
    localStorage.removeItem("cyberPass");
  }

  const overallPercentage = useMemo(() => {
    const valid = courses.filter((c) => c.totalClasses > 0);
    if (!valid.length) return 0;
    const present = valid.reduce((sum, c) => sum + c.presentClasses, 0);
    const total = valid.reduce((sum, c) => sum + c.totalClasses, 0);
    if (!total) return 0;
    return (present / total) * 100;
  }, [courses]);



  // How many more classes can you miss and still stay above `target`?
  function bunkAllowance(c: AttendanceCourse, target: number): number {
    const t = c.totalClasses;
    const p = c.presentClasses;
    if (t === 0) return 0;
    const maxX = Math.floor((p * 100) / target - t);
    return Math.max(maxX, 0);
  }

  // How many classes you need to attend to reach `target`?
  function classesToAttend(c: AttendanceCourse, target: number): number {
    const t = c.totalClasses;
    const p = c.presentClasses;
    if (t === 0) return 0;

    const r = target / 100;
    if (r >= 1) return 0;

    const required = Math.ceil((r * t - p) / (1 - r));
    return Math.max(required, 0);
  }

  async function handleOpenDaywise(course: AttendanceCourse) {
    if (!course.courseComponentId || !course.courseId || !course.studentId) {
      setDaywiseError("Missing course / student details for daywise view.");
      setDaywiseOpen(true);
      setDaywiseCourse(course);
      setDaywiseEntries([]);
      return;
    }

    if (!cyberId || !cyberPass) {
      setError("CyberVidya login expired. Please login again.");
      return;
    }

    setDaywiseCourse(course);
    setDaywiseOpen(true);
    setDaywiseError(null);
    setDaywiseEntries([]);
    setDaywiseLoading(true);

    try {
      // 1. Fetch past attendance
      const res = await fetch("/api/attendance/daywise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCompId: course.courseComponentId,
          courseId: course.courseId,
          sessionId: course.sessionId ?? null,
          studentId: course.studentId,
          cyberId,
          cyberPass,
        }),
      });

      const data = await res.json();
      let entries: DaywiseEntry[] = [];

      if (res.ok) {
        entries = data.entries || [];
      } else {
        setDaywiseError(data.msg || "Failed to load attendance data");
      }

      // Sort Past Entries: Descending (Latest first)
      entries.sort((a, b) => {
        const dateA = a.date || "1970-01-01";
        const dateB = b.date || "1970-01-01";
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); // Descending
        }
        return 0;
      });

      setDaywiseEntries(entries);
    } catch (err) {
      console.error(err);
      setDaywiseError("Something went wrong while fetching details");
    } finally {
      setDaywiseLoading(false);
    }
  }

  function handleCloseDaywise() {
    setDaywiseOpen(false);
    setDaywiseCourse(null);
    setDaywiseEntries([]);
    setDaywiseError(null);
  }

  async function handleOpenSchedule(course: AttendanceCourse) {
    if (!cyberId || !cyberPass) {
      setError("CyberVidya login expired. Please login again.");
      return;
    }

    setScheduleCourse(course);
    setScheduleOpen(true);
    setScheduleError(null);
    setScheduleEntries([]);
    setScheduleLoading(true);

    try {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 30);

      const startStr = today.toISOString().split('T')[0];
      const endStr = nextMonth.toISOString().split('T')[0];

      const scheduleRes = await fetch(
        `/api/schedule?cyberId=${encodeURIComponent(cyberId)}&cyberPass=${encodeURIComponent(cyberPass)}&weekStartDate=${startStr}&weekEndDate=${endStr}`
      );

      if (scheduleRes.ok) {
        const scheduleJson = await scheduleRes.json();
        const scheduleData: ScheduleItem[] = scheduleJson.data || [];

        // Filter for this course
        const targetCode = (course.courseCode || "").toLowerCase();
        const targetName = (course.courseName || "").toLowerCase();

        const entries: DaywiseEntry[] = scheduleData
          .filter((cls: ScheduleItem) => {
            const clsName = (cls.courseName || "").toLowerCase();
            const clsCode = (cls.courseCode || "").toLowerCase();
            // Simple inclusion check
            return (targetCode && clsCode.includes(targetCode)) ||
              (targetName && clsName.includes(targetName)) ||
              (targetName && clsName === targetName);
          })
          .map((cls: ScheduleItem) => {
            // Parse date: "01/12/2025" -> "2025-12-01"
            const [dayPart, monthPart, yearPart] = (cls.lectureDate || "").split('/');
            let dateStr = "";
            let dayName = "";

            if (dayPart && monthPart && yearPart) {
              dateStr = `${yearPart}-${monthPart}-${dayPart}`;
              const d = new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart));
              dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
            }

            // Parse time: "01/12/2025 : 02:20 PM - 03:10 PM" -> "02:20 PM - 03:10 PM"
            let timeSlot = cls.dateTime || "";
            if (timeSlot.includes(':')) {
              const parts = timeSlot.split(':');
              if (parts.length > 1) {
                timeSlot = parts.slice(1).join(':').trim();
              }
            }

            return {
              date: dateStr,
              day: dayName,
              timeSlot: timeSlot,
              status: "Scheduled",
              isUpcoming: true
            };
          });

        // Sort Upcoming Entries: Ascending (Earliest first)
        entries.sort((a, b) => {
          const dateA = a.date || "1970-01-01";
          const dateB = b.date || "1970-01-01";
          if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
          }
          return 0;
        });

        setScheduleEntries(entries);
      } else {
        setScheduleError("Failed to fetch schedule.");
      }
    } catch (err) {
      console.error(err);
      setScheduleError("Something went wrong while fetching schedule.");
    } finally {
      setScheduleLoading(false);
    }
  }

  function handleCloseSchedule() {
    setScheduleOpen(false);
    setScheduleCourse(null);
    setScheduleEntries([]);
    setScheduleError(null);
  }

  // --- NEW: Projection handlers ---
  function handleOpenProjection() {
    const initial: Record<string, number> = {};
    courses.forEach((c) => {
      initial[courseKey(c)] = 0; // default: planning to bunk 0 more
    });
    setProjectionInputs(initial);
    setProjectionOpen(true);
  }

  function handleCloseProjection() {
    setProjectionOpen(false);
  }

  // --- NEW: Timetable handlers ---
  async function handleOpenTimetable() {
    if (!cyberId || !cyberPass) {
      setError("CyberVidya login expired. Please login again.");
      return;
    }

    setTimetableOpen(true);
    setTimetableError(null);
    setFullSchedule([]);
    setTimetableLoading(true);

    try {
      const today = new Date();
      // Calculate start of week (Monday)
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(today.setDate(diff + 6));

      const startStr = monday.toISOString().split('T')[0];
      const endStr = sunday.toISOString().split('T')[0];

      const scheduleRes = await fetch(
        `/api/schedule?cyberId=${encodeURIComponent(cyberId)}&cyberPass=${encodeURIComponent(cyberPass)}&weekStartDate=${startStr}&weekEndDate=${endStr}`
      );

      if (scheduleRes.ok) {
        const scheduleJson = await scheduleRes.json();
        setFullSchedule(scheduleJson.data || []);
      } else {
        setTimetableError("Failed to fetch timetable.");
      }
    } catch (err) {
      console.error(err);
      setTimetableError("Something went wrong while fetching timetable.");
    } finally {
      setTimetableLoading(false);
    }
  }

  function handleCloseTimetable() {
    setTimetableOpen(false);
  }

  function projectedPercent(c: AttendanceCourse, plannedBunks: number): number {
    const miss = Math.max(plannedBunks, 0);
    const newTotal = c.totalClasses + miss;
    const newPresent = c.presentClasses; // worst-case: you bunk all of these
    if (!newTotal) return 0;
    return (newPresent / newTotal) * 100;
  }

  function handleExport() {
    if (!courses.length) return;

    const headers = ["Course Code", "Course Name", "Component", "Total Classes", "Present Classes", "Percentage"];
    const rows = courses.map(c => [
      c.courseCode || "",
      `"${(c.courseName || "").replace(/"/g, '""')}"`, // Escape quotes
      c.componentName || "",
      c.totalClasses,
      c.presentClasses,
      c.percentage.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    // Store current view state
    const wasShowingGraph = showGraph;

    // Temporarily show graph to ensure charts are rendered
    if (!wasShowingGraph) {
      setShowGraph(true);
    }

    // Small delay to ensure charts are fully rendered before print dialog
    setTimeout(() => {
      window.print();

      // Restore original view after print dialog closes
      if (!wasShowingGraph) {
        // Wait for print dialog to close before restoring view
        setTimeout(() => {
          setShowGraph(false);
        }, 100);
      }
    }, 100);
  }

  const overallColor =
    overallPercentage >= 75
      ? "bg-accent"
      : overallPercentage >= 60
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Attendance</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          CyberVidya attendance is fetched live. Your credentials are not stored
          in our database – they are used only for this session.
        </p>

        {/* Login card */}
        {!hasLoggedIn && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <section className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-8 text-center border-b border-slate-50 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-900 dark:text-white">
                    <path d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12z" fill="currentColor" />
                    <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  Enter your CyberVidya credentials to access your attendance dashboard.
                </p>
              </div>

              {/* Form */}
              <div className="p-6 sm:p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Cybervidya ID
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all placeholder:text-slate-400"
                        value={cyberId}
                        onChange={(e) => setCyberId(e.target.value)}
                        placeholder="e.g. 202412345678901"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all placeholder:text-slate-400"
                        type="password"
                        value={cyberPass}
                        onChange={(e) => setCyberPass(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Remember Me</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="terms"
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-slate-200 dark:border-slate-600 transition-all checked:border-slate-900 dark:checked:border-white checked:bg-slate-900 dark:checked:bg-white hover:border-slate-300 dark:hover:border-slate-500"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <svg
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white dark:text-black opacity-0 transition-opacity peer-checked:opacity-100"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          width="14"
                          height="14"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400 select-none">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline focus:outline-none"
                        >
                          Terms and Conditions
                        </button>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-slate-900 dark:bg-white px-4 py-3.5 text-sm font-bold text-white dark:text-black shadow-lg shadow-slate-900/20 dark:shadow-white/20 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-xl hover:shadow-slate-900/30 dark:hover:shadow-white/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Fetching Data...</span>
                      </>
                    ) : (
                      "Access Dashboard"
                    )}
                  </button>
                </form>

                {error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}

                {msg && !error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 12l2.5 2.5L15.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p>{msg}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {rememberMe
                      ? "Credentials stored securely on your device."
                      : "Your credentials are never stored."}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}



        {/* Student card + summary */}
        {hasLoggedIn && (
          <>
            {/* Student profile / header */}
            <section className="rounded-xl p-4 sm:p-5 space-y-2 site-card-strong print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-black/10 flex items-center justify-center text-xl text-slate-900 font-bold">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-900">
                      <path d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12z" fill="currentColor" />
                      <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">{student?.fullName || "Student"}</h2>
                    <div className="text-[11px] sm:text-xs text-slate-500">
                      {student?.registrationNumber ?? ""} {student?.branchShortName ? `| ${student.branchShortName}` : ""} - {student?.semesterName ? `Sem ${student.semesterName}` : ""}
                    </div>
                  </div>
                </div>

                {/* NEW: Projection button + Logout */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenTimetable}
                    className="rounded-md inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide border-2 border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-600 hover:text-white shadow-sm transition-colors"
                    title="View Weekly Timetable"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    Timetable
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenProjection}
                    disabled={courses.length === 0}
                    className="rounded-md inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide border-2 border-sky-600 text-sky-600 bg-white hover:bg-sky-600 hover:text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Show projection"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 8l-6 6-4-4-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Projection
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={courses.length === 0}
                    className="rounded-md inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide border-2 border-emerald-600 text-emerald-600 bg-white hover:bg-emerald-600 hover:text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export as CSV"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-md inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide border-2 border-purple-600 text-purple-600 bg-white hover:bg-purple-600 hover:text-white shadow-sm transition-colors print:hidden"
                    title="Print Summary"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                      <path d="M6 9V2h12v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 14h12v8H6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide btn-danger"
                    title="Logout"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                      <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 12v8a2 2 0 0 1-2 2H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </section>

            {/* Overall attendance bar (animated) */}
            <div className={`transition-all duration-200 ease-out origin-top ${showGraph
              ? "opacity-0 max-h-0 overflow-hidden pointer-events-none"
              : "opacity-100 max-h-[600px]"
              }`}
            >
              <section className="rounded-xl p-4 sm:p-5 space-y-3 site-card-strong">
                <h2 className="text-sm font-semibold">Overall Attendance</h2>
                <div className="relative w-full">
                  <div className="w-full h-12 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full ${overallColor} transition-all`}
                      style={{
                        width: `${Math.min(
                          Math.max(overallPercentage, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  {/* centered percentage overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-xl md:text-2xl font-bold text-white drop-shadow-sm">
                      {overallPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Subject cards (table replaced by cards) / Graph view */}
            <section className="rounded-xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm p-4 sm:p-5 space-y-3 print:border-none print:shadow-none print:p-0">
              <div className="flex items-center justify-between mb-1 print:hidden">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {showGraph ? "Attendance Analytics" : "Subject-wise Attendance"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGraph(false)}
                    aria-pressed={!showGraph}
                    className={`px-3 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 ${!showGraph ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600"}`}
                  >
                    Show Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGraph(true)}
                    aria-pressed={showGraph}
                    className={`px-3 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 ${showGraph ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-600"}`}
                  >
                    Show Graph
                  </button>
                </div>
              </div>

              {courses.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No attendance data found for this account.
                </p>
              ) : (
                <>
                  {/* Graph View - Always render for print */}
                  <div className={`${showGraph ? 'block' : 'hidden'} print:block print:mb-8`}>
                    <h2 className="hidden print:block text-lg font-bold mb-4 text-slate-900">Attendance Analytics</h2>
                    <AttendanceGraph courses={courses} onOpenDaywise={handleOpenDaywise} />
                  </div>

                  {/* List View - Hide from print */}
                  <div className={`${!showGraph ? 'block' : 'hidden'} print:hidden`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
                      {courses.map((c) => {

                        const isSafe = c.percentage >= 75;
                        const maxBunk = bunkAllowance(c, 75);
                        const requiredAttend = classesToAttend(c, 75);

                        const percentClass = isSafe ? "text-accent" : "text-danger";

                        return (
                          <div key={`${c.courseCode}-${c.componentName}`} className="relative rounded-lg p-4 site-card-strong bg-white print:border print:border-slate-200 print:shadow-none print:break-inside-avoid">
                            <div className="mb-3">
                              <h3 className="text-xs font-semibold uppercase tracking-wide">{(c.courseName || '').toUpperCase()}</h3>
                              <div className="text-[11px] text-slate-500 mt-1">CODE: {c.courseCode}</div>
                            </div>

                            <hr className="border-slate-900 my-2 print:border-slate-200" />

                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-[11px] font-semibold text-slate-700">{(c.componentName || '').toUpperCase()}</div>
                              </div>
                              <div className={`text-sm font-bold ${percentClass} text-right`}>{c.percentage.toFixed(2)}%</div>
                            </div>

                            <div className="flex items-start justify-between gap-4 mt-3">
                              <div>
                                <div className="text-[11px] text-slate-500">Present: {c.presentClasses}/{c.totalClasses}</div>
                                <div className={`text-[11px] mt-2 flex items-center gap-2 ${isSafe ? 'text-accent' : 'text-danger'}`}>
                                  {isSafe ? (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" className="text-accent" fill="var(--accent-100)" />
                                        <path d="M9 12.5l1.9 1.9L16 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
                                      </svg>
                                      <span>You can miss {maxBunk} classes</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.4" className="text-danger" fill="var(--danger-100)" />
                                        <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-danger" />
                                      </svg>
                                      <span>You need to attend {requiredAttend} classes</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 print:hidden">
                              {c.courseComponentId ? (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDaywise(c)}
                                    className="flex-1 inline-flex justify-center items-center rounded uppercase tracking-wide border-2 border-black px-4 py-2 text-[12px] font-semibold hover:bg-slate-900 hover:text-white bg-white shadow-[4px_4px_0_rgba(0,0,0,0.08)]"
                                  >
                                    SEE DAYWISE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSchedule(c)}
                                    className="flex-1 inline-flex justify-center items-center rounded uppercase tracking-wide border-2 border-black px-4 py-2 text-[12px] font-semibold hover:bg-slate-900 hover:text-white bg-white shadow-[4px_4px_0_rgba(0,0,0,0.08)]"
                                  >
                                    SEE SCHEDULE
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">N/A</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>
            {/* Daywise page - merged calendar and table in single scrollable view */}
            {daywiseOpen && daywiseCourse && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="max-w-6xl w-full h-5/6 bg-white rounded-2xl shadow-lg p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                      Daywise Attendance for{" "}
                      <span className="font-bold">
                        {daywiseCourse.courseName}
                      </span>{" "}
                      -{" "}
                      <span className="text-slate-600">
                        {daywiseCourse.componentName}
                      </span>
                    </h3>
                    <button
                      onClick={handleCloseDaywise}
                      className="text-danger font-bold text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-2">
                    {daywiseLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Loading daywise data...
                      </div>
                    ) : daywiseError ? (
                      <div className="p-4 text-center text-sm text-red-500">
                        {daywiseError}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 1. Past Attendance Table */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 mb-2 px-1">Past Attendance</h4>
                          {daywiseEntries.length === 0 ? (
                            <p className="text-xs text-slate-500 px-1">No past attendance records found.</p>
                          ) : (
                            <>
                              <DaywiseCalendarGrid entries={daywiseEntries} />
                              <DaywiseTable entries={daywiseEntries} />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Modal */}
            {scheduleOpen && scheduleCourse && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="max-w-6xl w-full h-5/6 bg-white rounded-2xl shadow-lg p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                      Upcoming Schedule for{" "}
                      <span className="font-bold">
                        {scheduleCourse.courseName}
                      </span>
                    </h3>
                    <button
                      onClick={handleCloseSchedule}
                      className="text-danger font-bold text-lg leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-2">
                    {scheduleLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Loading schedule...
                      </div>
                    ) : scheduleError ? (
                      <div className="p-4 text-center text-red-500">
                        {scheduleError}
                      </div>
                    ) : (
                      <div>
                        {scheduleEntries.length === 0 ? (
                          <p className="text-xs text-slate-500 px-1">No upcoming classes scheduled.</p>
                        ) : (
                          <>
                            <DaywiseCalendarGrid entries={scheduleEntries} />
                            <DaywiseTable entries={scheduleEntries} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timetable Modal */}
            {timetableOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="max-w-6xl w-full h-5/6 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-5 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Weekly Timetable
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Your class schedule for this week.
                      </p>
                    </div>
                    <button
                      onClick={handleCloseTimetable}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 bg-white">
                    {timetableLoading ? (
                      <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-3">
                        <svg className="animate-spin h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading timetable...</span>
                      </div>
                    ) : timetableError ? (
                      <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg border border-red-100">
                        {timetableError}
                      </div>
                    ) : (
                      <WeeklyTimetable scheduleData={fullSchedule} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Projection Modal */}
            {projectionOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="max-w-3xl w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-5 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Attendance Projection
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Simulate how missing future classes affects your attendance.
                      </p>
                    </div>
                    <button
                      onClick={handleCloseProjection}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="p-5 border-b bg-white flex-shrink-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">
                        Target Attendance Goal
                      </label>
                      <span className="text-2xl font-bold text-slate-900">
                        {projectionTarget}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={projectionTarget}
                      onChange={(e) =>
                        setProjectionTarget(Number(e.target.value))
                      }
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Course List */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                    {courses.length === 0 ? (
                      <div className="text-center py-10 text-slate-500">
                        No courses available for projection.
                      </div>
                    ) : (
                      courses.map((c) => {
                        const key = courseKey(c);
                        const planned = projectionInputs[key] || 0;
                        const projected = projectedPercent(c, planned);
                        const maxBunk = bunkAllowance(c, projectionTarget);
                        const isSafe = projected >= projectionTarget;

                        // Progress bar widths
                        const currentWidth = Math.min(c.percentage, 100);
                        const projectedWidth = Math.min(projected, 100);

                        return (
                          <div
                            key={key}
                            className="bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                                  {c.courseName || "Unknown Course"}
                                </h4>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {c.courseCode} • {c.componentName}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1.5 border">
                                <button
                                  onClick={() =>
                                    setProjectionInputs((prev) => ({
                                      ...prev,
                                      [key]: Math.max(0, planned - 1),
                                    }))
                                  }
                                  className="w-8 h-8 flex items-center justify-center rounded bg-white border shadow-sm text-slate-600 hover:bg-slate-100 font-bold"
                                >
                                  -
                                </button>
                                <div className="text-center min-w-[3rem]">
                                  <div className="text-[10px] text-slate-400 uppercase font-bold">Bunk</div>
                                  <div className="text-sm font-bold text-slate-900">{planned}</div>
                                </div>
                                <button
                                  onClick={() =>
                                    setProjectionInputs((prev) => ({
                                      ...prev,
                                      [key]: planned + 1,
                                    }))
                                  }
                                  className="w-8 h-8 flex items-center justify-center rounded bg-white border shadow-sm text-slate-600 hover:bg-slate-100 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                              {/* Target Marker */}
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-black z-10 opacity-20"
                                style={{ left: `${projectionTarget}%` }}
                              />

                              {/* Current % Bar */}
                              <div
                                className="absolute top-0 left-0 h-full bg-slate-300 transition-all duration-500"
                                style={{ width: `${currentWidth}%` }}
                              />

                              {/* Projected % Bar (Overlay) */}
                              <div
                                className={`absolute top-0 left-0 h-full transition-all duration-500 opacity-80 ${isSafe ? "bg-emerald-500" : "bg-red-500"
                                  }`}
                                style={{ width: `${projectedWidth}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <div className="flex gap-3">
                                <div>
                                  <span className="text-slate-400">Current: </span>
                                  <span className="font-semibold text-slate-700">
                                    {c.percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Projected: </span>
                                  <span
                                    className={`font-bold ${isSafe ? "text-emerald-600" : "text-red-600"
                                      }`}
                                  >
                                    {projected.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                {isSafe ? (
                                  <span className="text-emerald-600 font-medium">
                                    Safe to miss {maxBunk} more
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-medium">
                                    Below target!
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Legend */}
                  <div className="p-3 bg-slate-50 border-t text-[10px] text-slate-400 flex justify-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Above Target</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Below Target</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-0.5 h-3 bg-black/20"></div>
                      <span>Target Line</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Terms and Conditions</h3>
              <button
                onClick={() => setShowTerms(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <p>
                <strong>Data Privacy:</strong> We do not store any of your personal data, including your CyberID or password, on our servers.
              </p>
              <p>
                <strong>Local Storage:</strong> If you choose to enable the &quot;Remember Me&quot; feature, your credentials will be stored locally on your own device to facilitate easier login in the future. You can clear this at any time by logging out or clearing your browser cache.
              </p>
              <p>
                <strong>Liability:</strong> We are not responsible for any misuse of this application. By using this service, you agree to use it responsibly and at your own risk.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTerms(false);
                  setAcceptedTerms(true);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
