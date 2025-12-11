// src/app/api/attendance/login/route.ts
import { NextResponse } from "next/server";
import { AttendanceStudentData } from "@/lib/cybervidya";
import { loginWithPuppeteer } from "@/lib/puppeteer-auth";

const CYBER_BASE = "https://kiet.cybervidya.net";

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

interface StudentCourseCompDetail {
  courseCompId?: number | string;
  studentId?: number | null;
  sessionId?: number | null;
}

interface RegisteredCourse {
  courseId?: number | string;
  studentId?: number | null;
  sessionId?: number | null;
  studentCourseCompDetails?: StudentCourseCompDetail[];
}

interface RegisteredCoursesResponse {
  data?: RegisteredCourse[];
}

interface AttendanceComponentInfo {
  componentName?: string;
  numberOfPeriods?: number | string;
  numberOfPresent?: number | string;
  presentPercentage?: number | string;
  presentPercentageWith?: string;
  courseComponentId?: number;
  courseVariant?: string;
}

interface AttendanceCourseInfo {
  courseCode?: string;
  courseName?: string;
  courseId?: number;
  attendanceCourseComponentNameInfoList?: AttendanceComponentInfo[];
}

interface AttendanceResponse {
  data?: AttendanceStudentData;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})); // Handle empty body
    const { cyberId, cyberPass } = body;

    // validation removed for manual login strategy
    // if (!cyberId || !cyberPass) ...

    // 1) Login to CyberVidya using Puppeteer (Browser Automation)
    const login = await loginWithPuppeteer(cyberId, cyberPass);
    if (!login) {
      return NextResponse.json(
        { msg: "Invalid CyberVidya credentials" },
        { status: 401 }
      );
    }

    const { token, uid, authPref } = login;

    const headers: HeadersInit = {
      Accept: "application/json",
      Authorization: `${authPref}${token}`,
      Uid: String(uid),
    };

    // 2) Attendance data
    const attRes = await fetch(
      `${CYBER_BASE}/api/attendance/course/component/student`,
      {
        method: "GET",
        headers,
      }
    );

    const attText = await attRes.text();
    console.log("📦 CyberVidya attendance raw:", attText);

    if (!attRes.ok) {
      return NextResponse.json(
        { msg: "Failed to fetch attendance from CyberVidya" },
        { status: 500 }
      );
    }

    let attJson: AttendanceResponse;
    try {
      attJson = JSON.parse(attText);
    } catch {
      return NextResponse.json(
        { msg: "Could not parse attendance JSON" },
        { status: 500 }
      );
    }

    const attData = attJson.data ?? (attJson as unknown as AttendanceStudentData);
    const list: AttendanceCourseInfo[] = Array.isArray(
      attData.attendanceCourseComponentInfoList
    )
      ? (attData.attendanceCourseComponentInfoList as AttendanceCourseInfo[])
      : [];

    // 3) Registered courses => get studentId / sessionId per course
    const regRes = await fetch(
      `${CYBER_BASE}/api/student/dashboard/registered-courses`,
      {
        method: "GET",
        headers,
      }
    );

    const regText = await regRes.text();
    console.log("📦 Registered-courses raw:", regText);

    let regJson: RegisteredCoursesResponse = {};
    try {
      regJson = JSON.parse(regText);
    } catch {
      // not fatal; we just won’t have studentId mapping
      regJson = {};
    }

    const regList: RegisteredCourse[] = Array.isArray(regJson.data) ? regJson.data : [];

    // Helper to find studentId & sessionId
    function findStudentInfo(courseId?: number, courseCompId?: number) {
      if (!courseId) return { studentId: null, sessionId: null };
      for (const item of regList) {
        if (Number(item.courseId) !== Number(courseId)) continue;
        const comps: StudentCourseCompDetail[] = Array.isArray(item.studentCourseCompDetails)
          ? item.studentCourseCompDetails
          : [];
        for (const c of comps) {
          if (
            courseCompId &&
            Number(c.courseCompId) !== Number(courseCompId)
          ) {
            continue;
          }
          return {
            studentId: c.studentId ?? item.studentId ?? null,
            sessionId: c.sessionId ?? item.sessionId ?? null,
          };
        }
        // fallback: same courseId, any comp
        return {
          studentId: item.studentId ?? null,
          sessionId: item.sessionId ?? null,
        };
      }
      return { studentId: null, sessionId: null };
    }

    const courses: AttendanceCourse[] = list.map((courseItem) => {
      const comps: AttendanceComponentInfo[] = Array.isArray(
        courseItem.attendanceCourseComponentNameInfoList
      )
        ? courseItem.attendanceCourseComponentNameInfoList
        : [];

      const comp = comps[0] ?? {};

      const total = Number(comp.numberOfPeriods ?? 0) || 0;
      const present = Number(comp.numberOfPresent ?? 0) || 0;

      let perc = Number(
        comp.presentPercentage ??
        (typeof comp.presentPercentageWith === "string"
          ? comp.presentPercentageWith.replace("%", "")
          : 0)
      );
      if (!perc && total > 0) {
        perc = (present / total) * 100;
      }

      const courseId = courseItem.courseId as number | undefined;
      const courseComponentId = comp.courseComponentId as
        | number
        | undefined;

      const { studentId, sessionId } = findStudentInfo(
        courseId,
        courseComponentId
      );

      return {
        courseCode: courseItem.courseCode ?? "",
        courseName: courseItem.courseName ?? "",
        componentName: comp.componentName ?? "THEORY",
        totalClasses: total,
        presentClasses: present,
        percentage: perc || 0,
        courseComponentId,
        courseVariant: comp.courseVariant,
        courseId,
        sessionId,
        studentId,
      };
    });

    const student = attData;

    const studentInfo = {
      fullName:
        student.fullName ??
        student.studentName ??
        `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
      registrationNumber:
        student.registrationNumber ?? student.enrollmentNumber, // enrollmentNumber might not be in AttendanceStudentData, but let's assume it might be there or add it.
      branchShortName:
        student.branchShortName ??
        student.branchName ??
        student.departmentName,
      semesterName: student.semesterName ?? student.semester, // semester might not be in AttendanceStudentData
      admissionBatchName: student.admissionBatchName ?? student.batchName, // batchName might not be in AttendanceStudentData
    };

    return NextResponse.json({
      msg: "Attendance loaded from CyberVidya",
      student: studentInfo,
      courses,
      token,
      uid,
      authPref,
    });
  } catch (err) {
    console.error("POST /api/attendance/login error:", err);
    return NextResponse.json(
      { msg: "Server error while fetching attendance" },
      { status: 500 }
    );
  }
}
