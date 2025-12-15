import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/puppeteer-auth";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const data = await checkSession(sessionId);

    if (!data) {
        return NextResponse.json({ loggedIn: false });
    }

    // Reuse the same logic as login route to fetch student data
    let { token, uid, authPref } = data;
    
    // If UID is missing (e.g. from Cookie-only login), fetch it from profile
    if (!uid || uid === 0) {
        console.log(">> [Auth Check] UID missing (0). Attempting to fetch from /my-profile...");
        try {
            const tempHeaders = { 
                "Accept": "application/json", 
                "Authorization": `${authPref}${token}`,
                "Referer": "https://kiet.cybervidya.net/",
                "Origin": "https://kiet.cybervidya.net",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
            };
            
            console.log(">> [Auth Check] Request Headers:", JSON.stringify(tempHeaders, null, 2));

            const profRes = await fetch(`https://kiet.cybervidya.net/api/admin/user/my-profile`, { headers: tempHeaders });
            
            if (profRes.ok) {
                const profJson = await profRes.json();
                console.log(">> [Auth Check] Profile Response:", JSON.stringify(profJson).slice(0, 200)); 
                const profData = profJson.data || profJson;
                if (profData && profData.id) {
                    uid = profData.id;
                    console.log(">> [Auth Check] Retrieved UID from profile:", uid);
                }
            } else {
                console.log(">> [Auth Check] Failed to fetch profile for UID. Status:", profRes.status);
                const errText = await profRes.text();
                console.log(">> [Auth Check] Response Body:", errText.slice(0, 200));
            }
        } catch (e) {
            console.error(">> [Auth Check] Error fetching profile:", e);
        }
    }

    const headers = {
      Accept: "application/json",
      Authorization: `${authPref}${token}`,
      Uid: String(uid),
    };
    const CYBER_BASE = "https://kiet.cybervidya.net";

    // 1) Attendance Data
    const attRes = await fetch(`${CYBER_BASE}/api/attendance/course/component/student`, { headers });
    let attJson: any = {};
    if (attRes.ok) {
        attJson = await attRes.json().catch(() => ({}));
    }

    // 2) Registered Courses (for studentId/sessionId mapping)
    const regRes = await fetch(`${CYBER_BASE}/api/student/dashboard/registered-courses`, { headers });
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
                 if (courseCompId && Number(c.courseCompId) !== Number(courseCompId)) continue;
                 return {
                     studentId: c.studentId ?? item.studentId,
                     sessionId: c.sessionId ?? item.sessionId
                 };
             }
             return { studentId: item.studentId, sessionId: item.sessionId };
        }
        return { studentId: null, sessionId: null };
    };

    const attendanceCourses = (Array.isArray(attData.attendanceCourseComponentInfoList) ? attData.attendanceCourseComponentInfoList : []).map((c: any) => {
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

         const effectivePresent = present + special;
         
         let perc = Number(comp.presentPercentage || (typeof comp.presentPercentageWith === 'string' ? comp.presentPercentageWith.replace('%', '') : 0));
         if (total > 0) {
            perc = (effectivePresent / total) * 100;
         }

         const { studentId, sessionId } = findStudentInfo(c.courseId, comp.courseComponentId);

         return {
             courseCode: c.courseCode,
             courseName: c.courseName,
             componentName: comp.componentName || "THEORY",
             totalClasses: total,
             presentClasses: effectivePresent,
             specialAttendance: special,
             percentage: perc || 0,
             courseComponentId: comp.courseComponentId,
             courseId: c.courseId,
             studentId,
             sessionId
         };
    });

    const studentInfo = {
        fullName: attData.fullName || attData.studentName || `${attData.firstName || ""} ${attData.lastName || ""}`.trim(),
        registrationNumber: attData.registrationNumber || attData.enrollmentNumber,
        branchShortName: attData.branchShortName || attData.branchName,
        semesterName: attData.semesterName || attData.semester,
        admissionBatchName: attData.admissionBatchName || attData.batchName
    };

    return NextResponse.json({
        loggedIn: true,
        // Return updated variables (so UI gets the real UID, not 0)
        token, 
        uid, 
        authPref,
        student: studentInfo,
        courses: attendanceCourses
    });

  } catch (err: any) {
    console.error("Check Session Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check session" },
      { status: 500 }
    );
  }
}
