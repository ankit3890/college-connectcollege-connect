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
  specialAttendance?: number; // Added field
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

  // --- NEW: Captcha Relay State ---
  const [sessionId, setSessionId] = useState("");
  const [captchaImg, setCaptchaImg] = useState<string | null>(null);
  const [captchaNeeded, setCaptchaNeeded] = useState(true); // Default to true
  const [captchaInput, setCaptchaInput] = useState("");
  const [checkingLogin, setCheckingLogin] = useState(false);

  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [authUid, setAuthUid] = useState<number | null>(null);
  const [authPref, setAuthPref] = useState("");
  
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

  // --- NEW: Manual Login State ---
  const [isManualLogin, setIsManualLogin] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [manualUid, setManualUid] = useState("");
  
  // --- NEW: Graph view state ---
  const [showGraph, setShowGraph] = useState(false);

  // --- NEW: Role restriction ---
  const [userRole, setUserRole] = useState<string>("");
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch user role on mount
  useEffect(() => {
      fetch('/api/user/me')
        .then(res => res.json())
        .then(data => {
            if(data.user && data.user.role) {
                setUserRole(data.user.role);
                // If not admin/superadmin, force manual login
                if(data.user.role !== 'admin' && data.user.role !== 'superadmin') {
                    setIsManualLogin(true); 
                }
            } else {
                 // Fallback if no user found (maybe force manual?)
                 setIsManualLogin(true);
            }
        })
        .catch(err => {
            console.error("Failed to fetch role", err);
            setIsManualLogin(true); // Default to manual on error
        })
        .finally(() => setRoleLoading(false));
  }, []);

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
    const storedToken = localStorage.getItem("manual_token");
    const storedUid = localStorage.getItem("manual_uid");

    if (storedToken && storedUid) {
        setIsManualLogin(true);
        setManualToken(storedToken);
        setManualUid(storedUid);
        setRememberMe(true);
        setAcceptedTerms(true);
    } else if (storedId && storedPass) {
      setCyberId(storedId);
      setCyberPass(storedPass);
      setRememberMe(true);
      setAcceptedTerms(true); // If they remembered, they must have accepted terms before
    }
  }, []);

  function courseKey(c: AttendanceCourse): string {
    return `${c.courseCode || c.courseId || "C"}-${c.componentName || ""}`;
  }

  async function handleInitSession() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/attendance/auth/init", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to init session");
      
      setSessionId(data.sessionId);
      setCaptchaImg(data.screenshot);
      setCaptchaNeeded(data.captchaNeeded !== false); // Default to true if undefined
      setMsg(data.captchaNeeded === false ? "Session started. No Captcha detected." : "Session started. Please solve the captcha.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to CyberVidya");
    } finally {
      setLoading(false);
    }
  }

  // --- NEW: Interactive Click Handler ---
  const [imageLoading, setImageLoading] = useState(false);

  async function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
      if (imageLoading || !sessionId) return;
      
      // Calculate relative coordinates
      const img = e.currentTarget;
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Scale coordinates to the actual image resolution (1280x800 viewport standard)
      // Displayed Image: rect.width x rect.height
      // Viewport: 1280 x 800
      // We send the RAW click for the viewport.
      // Scaling factor:
      const scaleX = 1280 / rect.width;
      const scaleY = 800 / rect.height;
      
      const actualX = Math.round(x * scaleX);
      const actualY = Math.round(y * scaleY);
      
      console.log(`Click at client(${x},${y}) -> scaled(${actualX},${actualY})`);
      
      setImageLoading(true);
      setMsg("Interacting...");

      try {
          const res = await fetch("/api/attendance/auth/interact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, action: 'click', x: actualX, y: actualY })
          });
          
          if (res.ok) {
              const data = await res.json();
              if (data.screenshot) {
                  setCaptchaImg(data.screenshot);
                  setMsg("Updated! You can click again or type credentials.");
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setImageLoading(false);
      }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    setLoading(true);

    try {
      // 0) Initialize session if needed (only for standard login)
      let currentSessionId = sessionId;
      if (!isManualLogin && !sessionId && captchaNeeded) {
          // ... (existing session init logic if needed, but usually handleInitSession does this)
          // For now, assume session initialized or not needed yet
      }

      // 1) Post credentials
      const res = await fetch("/api/attendance/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cyberId: isManualLogin ? "" : cyberId,
          cyberPass: isManualLogin ? "" : cyberPass,
          sessionId: currentSessionId, 
          captcha: captchaInput, // Might be empty if not needed
          // Manual credentials
          authToken: isManualLogin ? manualToken : undefined,
          authUid: isManualLogin ? manualUid : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If 401/403, might need captcha (if standard login)
        throw new Error(data.msg || data.error || "Login failed");
      }

      // Success
      await fetchInitialData(data.token, data.uid, data.authPref, data);

      setMsg("Login successful!");
      
      // Save credentials if Remember Me is checked
      if (rememberMe) {
          if (isManualLogin) {
              localStorage.setItem("manual_token", manualToken);
              localStorage.setItem("manual_uid", manualUid);
          } else {
              localStorage.setItem("cyber_id", cyberId);
              localStorage.setItem("cyber_pass", cyberPass);
          }
      } else {
         // Clear if not remembered
         localStorage.removeItem("cyber_id");
         localStorage.removeItem("cyber_pass");
         localStorage.removeItem("manual_token");
         localStorage.removeItem("manual_uid");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Poll for manual login
  useEffect(() => {
    if (!sessionId || hasLoggedIn) return;
    
    const interval = setInterval(async () => {
         await handleCheckLogin(true); // silent check
    }, 1000); // Check every 1 second for snappy response
    
    return () => clearInterval(interval);
  }, [sessionId, hasLoggedIn]);

  async function handleCheckLogin(silent = false) {
    if (!sessionId) return;
    if (!silent) {
        setCheckingLogin(true);
        setError(null);
    }
    
    try {
        const res = await fetch("/api/attendance/auth/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        
        if (data.loggedIn && data.token) {
            if (!silent) setMsg("Login Detected! Loading data...");
            // Found it!
            await fetchInitialData(data.token, data.uid, data.authPref, data); // Pass full data to use student info
        } else {
            if (!silent) setMsg("Not logged in yet. Please login in the popup window.");
        }
    } catch (e) {
        if (!silent) console.error(e);
    } finally {
        if (silent) {
             // no-op
        } else {
             setCheckingLogin(false);
        }
    }
  }

  // Helper to fetch data after login
  async function fetchInitialData(token: string, uid: number, authPref: string, fullData?: any) {
       setHasLoggedIn(true);
       setAuthToken(token);
       setAuthUid(uid);
       setAuthPref(authPref);
       
       if (fullData) {
           if (fullData.student) setStudent(fullData.student);
           if (fullData.courses) setCourses(fullData.courses);
       }
       
       // NEW: Save tokens for other pages (like Profile)
       localStorage.setItem("att_token", token);
       localStorage.setItem("att_uid", String(uid));
       localStorage.setItem("att_authPref", authPref);
       
       if (rememberMe) {
        localStorage.setItem("cyberId", cyberId);
        localStorage.setItem("cyberPass", cyberPass);
       } else {
        localStorage.removeItem("cyberId");
        localStorage.removeItem("cyberPass");
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

    if (!hasLoggedIn) {
      setError("Please login first.");
      return;
    }

    setDaywiseCourse(course);
    setDaywiseOpen(true);
    setDaywiseError(null);
    setDaywiseEntries([]);
    setDaywiseLoading(true);

    try {
      // 1. Fetch past attendance with TOKEN
      const res = await fetch("/api/attendance/daywise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCompId: course.courseComponentId,
          courseId: course.courseId,
          sessionId: course.sessionId ?? null,
          studentId: course.studentId,
          token: authToken,
          uid: authUid,
          authPref: authPref
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
    if (!hasLoggedIn) {
      setError("Please login first.");
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
        `/api/schedule?token=${encodeURIComponent(authToken||"")}&uid=${authUid}&authPref=${encodeURIComponent(authPref||"")}&weekStartDate=${startStr}&weekEndDate=${endStr}`
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
    if (!hasLoggedIn) {
      setError("Please login first.");
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
        `/api/schedule?token=${encodeURIComponent(authToken||"")}&uid=${authUid}&authPref=${encodeURIComponent(authPref||"")}&weekStartDate=${startStr}&weekEndDate=${endStr}`
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
                  Connect to CyberVidya to access your dashboard.
                </p>
              </div>

              {/* Form */}
              <div className="p-6 sm:p-8 space-y-6">

                {/* Mobile Warning - Top */}
                 <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Note: Manual Login does not work on mobile. Use PC/Laptop.
                 </div>
                
                {/* MODE TOGGLE - Moved to Top */}
                {!roleLoading && ['admin', 'superadmin'].includes(userRole) ? (
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg mb-6">
                       <button
                          type="button"
                          onClick={() => setIsManualLogin(false)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isManualLogin ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                       >
                          CyberVidya Login
                       </button>
                       <button
                          type="button"
                          onClick={() => setIsManualLogin(true)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isManualLogin ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                       >
                          Manual Token
                       </button>
                    </div>
                ) : (
                   <div className="mb-6 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V10C20 8.89543 19.1046 8 18 8H6C4.89543 8 4 8.89543 4 10V19C4 20.1046 4.89543 21 6 21ZM16 8V5C16 2.79086 14.2091 1 12 1C9.79086 1 8 2.79086 8 5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Manual Token Mode
                   </div>
                )}
                
                {/* AUTOMATED LOGIN UI */}
                {!isManualLogin && (
                    <>
                    {/* STEP 1: INITIALIZE or LOADING SCREENSHOT */}
                {!captchaImg && (
                  <div className="space-y-4">
                     <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 border border-slate-100 dark:border-slate-600">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-3">
                        How it works:
                      </h3>
                      <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">1</span>
                          <span>Click <strong>Connect</strong> below.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                           <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">2</span>
                          <span>We will show you the <strong>CyberVidya Captcha</strong>.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                           <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">3</span>
                          <span>Enter your ID, Password & Captcha Answer.</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleInitSession}
                      disabled={loading}
                      className="w-full rounded-lg bg-slate-900 dark:bg-white px-4 py-3.5 text-sm font-bold text-white dark:text-black shadow-lg shadow-slate-900/20 dark:shadow-white/20 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-xl hover:shadow-slate-900/30 dark:hover:shadow-white/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading Page...</span>
                        </>
                      ) : (
                        "Connect to CyberVidya"
                      )}
                    </button>
                  </div>
                )}

                {/* STEP 2: FILL CREDENTIALS & CAPTCHA */}
                {captchaImg && (
                  <form onSubmit={handleLoginSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="relative bg-slate-100 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex justify-center overflow-hidden min-h-96">
                        <img 
                            src={captchaImg} 
                            alt="CyberVidya Captcha" 
                            onClick={handleImageClick}
                            className={`w-full h-auto rounded shadow-sm transition-opacity cursor-crosshair ${imageLoading ? "opacity-50 pointer-events-none" : "hover:opacity-100 opacity-90"}`} 
                        />
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/75 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">
                                    Clicking...
                                </span>
                            </div>
                        )}
                     </div>
                     <p className="text-xs text-center text-slate-500">
                        {imageLoading ? "Sending click to remote browser..." : "Click on the image to solve visual captchas interactively."}
                     </p>

                    {captchaNeeded && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          User ID
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                          value={cyberId}
                          onChange={(e) => setCyberId(e.target.value)}
                          placeholder="ID"
                          required
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Password
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                          type="password"
                          value={cyberPass}
                          onChange={(e) => setCyberPass(e.target.value)}
                          placeholder="pass"
                          required
                        />
                      </div>
                    </div>
                    )}

                    {captchaNeeded && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                        <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                          Captcha Answer
                        </label>
                        <input
                          className="w-full rounded-lg border-2 border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-lg font-mono tracking-widest bg-indigo-50/50 dark:bg-indigo-900/20 text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          placeholder="ENTER CAPTCHA"
                          autoFocus
                          required
                        />
                      </div>
                    )}

                    {!captchaNeeded && (
                         <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl text-center space-y-3 animate-pulse">
                            <div className="flex justify-center">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Waiting for login...
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Please login in the popup window.<br/>
                                    We will sync automatically.
                                </p>
                            </div>
                         </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !captchaNeeded} // Disable main button in auto-mode
                      className={`w-full rounded-lg px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                        ${!captchaNeeded ? 'bg-slate-400 cursor-default opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-600/20'}`}
                    >
                      {loading ? (
                         <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        captchaNeeded ? "Verify & Login" : "Auto-Syncing..."
                      )}
                    </button>
                    
                    {/* Only show secondary sync link if we are in captcha mode (as backup) */}
                    <div className="text-center pt-2">
                        <button 
                            type="button" 
                            onClick={() => handleCheckLogin(false)}
                            className="text-indigo-500 hover:text-indigo-600 text-xs font-medium hover:underline"
                        >
                            {checkingLogin ? "Checking status..." : "Click here if not syncing automatically"}
                        </button>
                    </div>
                    
                     <button
                      type="button"
                      onClick={() => { setCaptchaImg(null); setSessionId(""); setMsg(null); setError(null); }}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Cancel / Retry Screenshot
                    </button>
                  </form>
                    )}
                    </>
                )}

                {error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 text-sm animate-in fade-in slide-in-from-top-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}
                
                 {msg && !error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-sm">
                    <p>{msg}</p>
                  </div>
                )}
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                  {isManualLogin ? "Paste your Authorization token and UID manually." : "Login securely via CyberVidya portal."}
                </p>
              </div>



              {/* MANUAL LOGIN FORM */}
              {isManualLogin && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                       <div className="space-y-1.5">
                         <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            Authorization Token
                         </label>
                         <input
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="Basic ... or GlobalEducation ..."
                            required
                         />
                         <p className="text-[10px] text-slate-400">Paste the full value (e.g. "GlobalEducation 612...")</p>
                       </div>
                       
                       <div className="space-y-1.5">
                         <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            UID
                         </label>
                         <input
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 font-mono"
                            value={manualUid}
                            onChange={(e) => setManualUid(e.target.value)}
                            type="number"
                            placeholder="e.g. 19500"
                            required
                         />
                       </div>
                       
                       {/* HOW TO GUIDE */}
                       {/* HOW TO GUIDE */}
                       <details className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-100 dark:border-slate-700 group cursor-pointer">
                           <summary className="font-medium hover:text-indigo-600 select-none flex items-center justify-between">
                             <span>How to get these details? (Visual Guide)</span>
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-open:rotate-180 transition-transform text-slate-400">
                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                             </svg>
                           </summary>
                           <div className="mt-4 space-y-5 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
                               


                               <div className="space-y-2">
                                  <p>1. Step one: Open the CyberVidya website</p>
                                  <img src="/images/guide-step2.png" alt="Open Website" className="rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full" />
                               </div>

                               <div className="space-y-2">
                                  <p>2. Press F12 to open DevTools</p>
                                  <img src="/images/guide-step3.png" alt="Open DevTools" className="rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full" />
                               </div>

                               <div className="space-y-2">
                                  <p>3. Select <strong>Network</strong> at the top and then <strong>Fetch/XHR</strong></p>
                                  <img src="/images/guide-step1.png" alt="Select Network Tab" className="rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full" />
                               </div>

                               <div className="space-y-1">
                                  <p>4. Login with your ID and Password</p>
                               </div>

                               <div className="space-y-2">
                                  <p>5. Under DevTools sidebar, select <strong>user-details</strong></p>
                                </div>

                               <div className="space-y-2">
                                  <p>6. Scroll down and copy the long <strong>Authorization</strong> token (e.g. GlobalEducation...) and <strong>UID</strong> (e.g. 5134)</p>
                               </div>

                           </div>
                       </details>

                       <button
                          type="submit"
                          disabled={loading}
                          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? "Verifying..." : "Login with Token"}
                        </button>
                        
                         {error && (
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 text-sm animate-in fade-in slide-in-from-top-2">
                             <p>{error}</p>
                          </div>
                        )}
                  </form>
              )}

              {/* STANDARD LOGIN STEPS */}
              {!isManualLogin && (
                <>
                {/* STEP 1: INITIALIZE SESSION */}
                {!captchaImg && !loading && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm rounded-lg flex gap-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p>
                        We use a secure proxy to connect to CyberVidya. Your credentials are processed locally and never stored permanently.
                      </p>
                    </div>

                    <button
                      onClick={handleInitSession}
                      disabled={loading}
                      className="w-full rounded-lg bg-slate-900 dark:bg-white px-4 py-3.5 text-sm font-bold text-white dark:text-black shadow-lg shadow-slate-900/20 dark:shadow-white/20 hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-xl hover:shadow-slate-900/30 dark:hover:shadow-white/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Loading Page...</span>
                        </>
                      ) : (
                        "Connect to CyberVidya"
                      )}
                    </button>
                  </div>
                )}

                {/* STEP 2: FILL CREDENTIALS & CAPTCHA */}
                {captchaImg && (
                  <form onSubmit={handleLoginSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="relative bg-slate-100 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex justify-center overflow-hidden min-h-96">
                        <img 
                            src={captchaImg} 
                            alt="CyberVidya Captcha" 
                            onClick={handleImageClick}
                            className={`w-full h-auto rounded shadow-sm transition-opacity cursor-crosshair ${imageLoading ? "opacity-50 pointer-events-none" : "hover:opacity-100 opacity-90"}`} 
                        />
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-black/75 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">
                                    Clicking...
                                </span>
                            </div>
                        )}
                     </div>
                     <p className="text-xs text-center text-slate-500">
                        {imageLoading ? "Sending click to remote browser..." : "Click on the image to solve visual captchas interactively."}
                     </p>

                    {captchaNeeded && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          User ID
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                          value={cyberId}
                          onChange={(e) => setCyberId(e.target.value)}
                          placeholder="ID"
                          required
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Password
                        </label>
                        <input
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 outline-none transition-all"
                          type="password"
                          value={cyberPass}
                          onChange={(e) => setCyberPass(e.target.value)}
                          placeholder="pass"
                          required
                        />
                      </div>
                    </div>
                    )}

                    {captchaNeeded && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                        <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                          Captcha Answer
                        </label>
                        <input
                          className="w-full rounded-lg border-2 border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-lg font-mono tracking-widest bg-indigo-50/50 dark:bg-indigo-900/20 text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value)}
                          placeholder="ENTER CAPTCHA"
                          autoFocus
                          required
                        />
                      </div>
                    )}

                    {!captchaNeeded && (
                         <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl text-center space-y-3 animate-pulse">
                            <div className="flex justify-center">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Waiting for login...
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Please login in the popup window.<br/>
                                    We will sync automatically.
                                </p>
                            </div>
                         </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !captchaNeeded} // Disable main button in auto-mode
                      className={`w-full rounded-lg px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                        ${!captchaNeeded ? 'bg-slate-400 cursor-default opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-600/20'}`}
                    >
                      {loading ? (
                         <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        captchaNeeded ? "Verify & Login" : "Auto-Syncing..."
                      )}
                    </button>
                    
                    {/* Only show secondary sync link if we are in captcha mode (as backup) */}
                    <div className="text-center pt-2">
                        <button 
                            type="button" 
                            onClick={() => handleCheckLogin(false)}
                            className="text-indigo-500 hover:text-indigo-600 text-xs font-medium hover:underline"
                        >
                            {checkingLogin ? "Checking status..." : "Click here if not syncing automatically"}
                        </button>
                    </div>
                    
                     <button
                      type="button"
                      onClick={() => { setCaptchaImg(null); setSessionId(""); setMsg(null); setError(null); }}
                      className="w-full text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Cancel / Retry Screenshot
                    </button>
                  </form>
                )}


                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Your credentials form a one-time session.
                  </p>
                </div>
                </>
              )}
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
                                    className="flex-1 inline-flex justify-center items-center rounded uppercase tracking-wide border-2 border-black dark:border-slate-600 px-4 py-2 text-[12px] font-semibold hover:bg-slate-900 hover:text-white bg-white dark:bg-slate-700 dark:text-white shadow-[4px_4px_0_rgba(0,0,0,0.08)]"
                                  >
                                    SEE DAYWISE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSchedule(c)}
                                    className="flex-1 inline-flex justify-center items-center rounded uppercase tracking-wide border-2 border-black dark:border-slate-600 px-4 py-2 text-[12px] font-semibold hover:bg-slate-900 hover:text-white bg-white dark:bg-slate-700 dark:text-white shadow-[4px_4px_0_rgba(0,0,0,0.08)]"
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
                <div className="max-w-6xl w-full h-5/6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                      Daywise Attendance for{" "}
                      <span className="font-bold">
                        {daywiseCourse.courseName}
                      </span>{" "}
                      -{" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {daywiseCourse.componentName}
                      </span>
                    </h3>
                    <button
                      onClick={handleCloseDaywise}
                      className="text-danger dark:text-red-400 font-bold text-lg leading-none hover:text-red-700 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 border dark:border-slate-700 rounded-lg p-2">
                    {daywiseLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 px-1">Past Attendance</h4>
                          {daywiseEntries.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 px-1">No past attendance records found.</p>
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
                <div className="max-w-6xl w-full h-5/6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                      Upcoming Schedule for{" "}
                      <span className="font-bold">
                        {scheduleCourse.courseName}
                      </span>
                    </h3>
                    <button
                      onClick={handleCloseSchedule}
                      className="text-danger dark:text-red-400 font-bold text-lg leading-none hover:text-red-700 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 border dark:border-slate-700 rounded-lg p-2">
                    {scheduleLoading ? (
                      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
                <div className="max-w-3xl w-full max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="p-5 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Attendance Projection
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Simulate how missing future classes affects your attendance.
                      </p>
                    </div>
                    <button
                      onClick={handleCloseProjection}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-300 transition-colors font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="p-5 border-b dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Target Attendance Goal
                      </label>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">
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
