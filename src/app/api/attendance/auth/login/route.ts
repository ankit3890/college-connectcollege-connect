import { NextResponse } from "next/server";
import { submitCredentials } from "@/lib/puppeteer-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, user, pass, captcha } = body;

    if (!sessionId || !user || !pass || !captcha) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const data = await submitCredentials(sessionId, user, pass, captcha);

    // --- NEW: Fetch Initial Data using the fresh token ---
    // We need to fetch (1) Attendance Data and (2) Registered Courses
    // This is copied/adapted from the original login route logic.

    const { token, uid, authPref } = data;
    const headers = {
      Accept: "application/json",
      Authorization: `${authPref}${token}`,
      Uid: String(uid),
    };
    const CYBER_BASE = "https://kiet.cybervidya.net";

    // 1) Attendance Data
    const attRes = await fetch(
      `${CYBER_BASE}/api/attendance/course/component/student`,
      { headers }
    );
    let attJson: any = {};
    if (attRes.ok) {
      attJson = await attRes.json().catch(() => ({}));
    }

    // 2) Registered Courses (for studentId/sessionId mapping)
    const regRes = await fetch(
      `${CYBER_BASE}/api/student/dashboard/registered-courses`,
      { headers }
    );
    let regJson: any = {};
    if (regRes.ok) {
      regJson = await regRes.json().catch(() => ({}));
    }

    // Process Data (Simplified version of the logic in original route)
    const attData = attJson.data || {};
    const regList = Array.isArray(regJson.data) ? regJson.data : [];

    // Helper to find studentInfo
    const findStudentInfo = (courseId: any, courseCompId: any) => {
      if (!courseId) return { studentId: null, sessionId: null };
      for (const item of regList) {
        if (Number(item.courseId) !== Number(courseId)) continue;
        const comps = item.studentCourseCompDetails || [];
        for (const c of comps) {
          if (courseCompId && Number(c.courseCompId) !== Number(courseCompId))
            continue;
          return {
            studentId: c.studentId ?? item.studentId,
            sessionId: c.sessionId ?? item.sessionId,
          };
        }
        return { studentId: item.studentId, sessionId: item.sessionId };
      }
      return { studentId: null, sessionId: null };
    };

    const attendanceCourses = (
      Array.isArray(attData.attendanceCourseComponentInfoList)
        ? attData.attendanceCourseComponentInfoList
        : []
    ).map((c: any) => {
      const comp = (c.attendanceCourseComponentNameInfoList || [])[0] || {};
      const total = Number(comp.numberOfPeriods || 0);
      const present = Number(comp.numberOfPresent || 0);
            // Robustly find special attendance key
         const extra = Number(comp.numberOfExtraAttendance || 0);
         let special = extra;

         if (special === 0) {
            // Fuzzy search keys
            const keys = Object.keys(comp);
            for (const k of keys) {
                const lower = k.toLowerCase();
                // Skip known standard fields, percentages, and total periods
                if (lower.includes('percent') || lower.includes('total') || lower === 'numberofpresent' || lower === 'numberofperiods' || lower.includes('absent')) continue;
                
                // Look for related keywords
                if (lower.includes('extra') || lower.includes('special') || lower.includes('adjust') || lower.includes('duty') || lower.includes('medical') || (lower.includes('od') && !lower.includes('period'))) {
                    const val = Number(comp[k]);
                    if (!isNaN(val) && val > 0) {
                        special = val;
                        break;
                    }
                }
            }
         }
      
      // Fix: Add special attendance to present count
      const effectivePresent = present + special;
      
      let perc = Number(comp.presentPercentage || (typeof comp.presentPercentageWith === 'string' ? comp.presentPercentageWith.replace('%', '') : 0));
      
      // Recalculate percentage if possible
      if (total > 0) {
          perc = (effectivePresent / total) * 100;
      }

      const { studentId, sessionId } = findStudentInfo(c.courseId, comp.courseComponentId);

      return {
          courseCode: c.courseCode,
          courseName: c.courseName,
          componentName: comp.componentName || "THEORY",
          totalClasses: total,
          presentClasses: effectivePresent, // Use the new total
          specialAttendance: special, // Pass it through if needed
          percentage: perc || 0,
          courseComponentId: comp.courseComponentId,
          courseId: c.courseId,
          studentId,
          sessionId,
      };
    });

    const studentInfo = {
      fullName:
        attData.fullName ||
        attData.studentName ||
        `${attData.firstName || ""} ${attData.lastName || ""}`.trim(),
      registrationNumber:
        attData.registrationNumber || attData.enrollmentNumber,
      branchShortName: attData.branchShortName || attData.branchName,
      semesterName: attData.semesterName || attData.semester,
      admissionBatchName: attData.admissionBatchName || attData.batchName,
    };

    return NextResponse.json({
      ...data,
      student: studentInfo,
      courses: attendanceCourses,
    });
  } catch (err: any) {
    console.error("Submit Login Error:", err);
    return NextResponse.json(
      { error: "Login failed: " + err.message },
      { status: 401 }
    );
  }
}
