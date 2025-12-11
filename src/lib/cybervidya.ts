// src/lib/cybervidya.ts

export interface CyberProfile {
  // core
  name: string;
  branch: string;
  year: number;

  // extra fields from CyberVidya
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  roles?: string;
  profilePhoto?: string;
}

const CYBER_BASE = "https://kiet.cybervidya.net";

interface LoginResult {
  token: string;
  uid: number;
  authPref: string; // usually "GlobalEducation "
}

export interface LoginResponseData {
  token?: string;
  id?: number;
  auth_pref?: string;
}

export interface LoginResponse {
  data?: LoginResponseData;
}

export interface ProfileData {
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNumber?: string | number;
  dateOfBirth?: string;
  gender?: string;
  roles?: string;
  studentName?: string;
  name?: string;
  fullName?: string;
  branch?: string;
  departmentName?: string;
  department?: string;
  year?: string | number;
  currentYear?: string | number;
  classYear?: string | number;
  profilePhoto?: string;
  profilePic?: string;
  profilePicture?: string;
  photoUrl?: string;
  imageUrl?: string;
  photo?: string;
  avatar?: string;
}

export interface AttendanceStudentData {
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  registrationNumber?: string;
  branchShortName?: string;
  branchName?: string;
  departmentName?: string;
  degreeBranchSemesterName?: string;
  admissionBatchName?: string;
  semesterName?: string | null;
  semester?: string;
  attendanceCourseComponentInfoList?: unknown[];
  profilePhoto?: string;
  profilePic?: string;
  profilePicture?: string;
  photoUrl?: string;
  imageUrl?: string;
  photo?: string;
  avatar?: string;
  enrollmentNumber?: string;
  batchName?: string;
  studentName?: string;
}

// small helper for Roman numerals like "I", "II", "III", ...
function romanToInt(roman: string | null | undefined): number {
  if (!roman) return 0;
  const s = roman.toUpperCase().trim();
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
  };
  return map[s] ?? 0;
}

/**
 * 1) Login to CyberVidya with plain ID + password
 *    POST https://kiet.cybervidya.net/api/auth/login
 */
export async function loginToCyberVidya(
  cyberId: string,
  cyberPass: string
): Promise<LoginResult | null> {
  try {
    console.log("⏩ CyberVidya login for:", cyberId);

    const res = await fetch(`${CYBER_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RQ3A.211001.001)",
        "Applicationlabel": "demo",
        "Correlationid": "demo",
      },
      body: JSON.stringify({
        userName: cyberId,
        password: cyberPass,
        device: "ANDROID",
        version: "VER 2.0",
      }),
    });

    console.log("🔎 /api/auth/login status:", res.status);
    const text = await res.text();
    console.log("📦 /api/auth/login raw:", text);

    if (!res.ok) {
      console.error("❌ CyberVidya login failed");
      return null;
    }

    let json: LoginResponse;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("❌ Could not parse login JSON");
      return null;
    }

    const data = json.data;
    if (!data) {
      console.error("❌ login JSON missing `data` field");
      return null;
    }

    const token: string | undefined = data.token;
    const uid: number | undefined = data.id;
    const authPref: string = data.auth_pref || "GlobalEducation ";

    if (!token || uid == null) {
      console.error("❌ token / id missing in login JSON");
      return null;
    }

    return { token, uid, authPref };
  } catch (err) {
    console.error("🔥 loginToCyberVidya error:", err);
    return null;
  }
}

/**
 * 2) Fetch profile: combine /my-profile (for email etc.)
 *    and /attendance/course/component/student (for name/branch/year)
 */
export async function getProfileFromCyberVidya(
  cyberId: string,
  cyberPass: string
): Promise<CyberProfile | null> {
  const login = await loginToCyberVidya(cyberId, cyberPass);
  if (!login) {
    console.error("⚠️ loginToCyberVidya returned null");
    return null;
  }

  const { token, uid, authPref } = login;
  console.log("✅ Got CyberVidya token + uid:", { uid });

  const headers: HeadersInit = {
    Accept: "application/json",
    Authorization: `${authPref}${token}`,
    Uid: String(uid),
  };

  try {
    // -----------------------------
    // 1) /api/admin/user/my-profile
    // -----------------------------
    const profileRes = await fetch(`${CYBER_BASE}/api/admin/user/my-profile`, {
      method: "GET",
      headers,
    });

    console.log("🔎 my-profile status:", profileRes.status);
    const profileText = await profileRes.text();
    console.log("📦 my-profile raw:", profileText);

    let profileData: ProfileData = {};
    try {
      const body = JSON.parse(profileText);
      profileData = body.data || body;
    } catch {
      console.error("❌ Could not parse my-profile JSON");
    }
    console.log("✅ my-profile data:", profileData);

    // ---------------------------------------------------------
    // 2) /api/attendance/course/component/student  (your JSON)
    // ---------------------------------------------------------
    const attendanceRes = await fetch(
      `${CYBER_BASE}/api/attendance/course/component/student`,
      {
        method: "GET",
        headers,
      }
    );

    console.log(
      "🔎 attendance/course/component/student status:",
      attendanceRes.status
    );
    const attendanceText = await attendanceRes.text();
    console.log("📦 attendance raw:", attendanceText);

    let attendanceData: AttendanceStudentData = {};
    try {
      const body = JSON.parse(attendanceText);
      attendanceData = body.data || body;
    } catch {
      console.error("❌ Could not parse attendance JSON");
    }

    console.log("✅ attendance data:", attendanceData);

    // This is exactly your sample:
    //
    // {
    //   "data": {
    //     "fullName": "ANKIT KUMAR SINGH",
    //     "firstName": "ANKIT",
    //     "middleName": "KUMAR",
    //     "lastName": "SINGH",
    //     "registrationNumber": "202501100300040",
    //     "branchShortName": "CSEAI",
    //     "semesterName": "I",
    //     "admissionBatchName": "2025-2029",
    //     ...
    //     "attendanceCourseComponentInfoList": [ ... ]
    //   }
    // }

    const student = attendanceData; // top-level data is "student-like"

    const courses = Array.isArray(student.attendanceCourseComponentInfoList)
      ? student.attendanceCourseComponentInfoList
      : [];
    const firstCourse = courses[0];

    console.log("✅ attendance.student (mapped):", student);
    console.log("✅ attendance.firstCourse:", firstCourse);

    // -------------------
    // NAME
    // -------------------
    const name: string =
      student.fullName ||
      `${student.firstName ?? ""} ${student.middleName ? student.middleName + " " : ""
        }${student.lastName ?? ""}`.trim() ||
      profileData.studentName ||
      profileData.fullName ||
      (profileData.firstName && profileData.lastName
        ? `${profileData.firstName} ${profileData.lastName}`
        : profileData.name || profileData.userName || "") ||
      "";

    // -------------------
    // BRANCH
    // -------------------
    const branch: string =
      student.branchShortName || // "CSEAI"
      student.branchName ||
      student.departmentName ||
      student.degreeBranchSemesterName || // "Bachelor of Technology - CSEAI - I"
      profileData.branch ||
      profileData.departmentName ||
      profileData.department ||
      "";

    // -------------------
    // YEAR
    // -------------------
    // 1) Try from admissionBatchName: "2025-2029"
    let year = 0;
    if (typeof student.admissionBatchName === "string") {
      const parts = student.admissionBatchName.split("-");
      const startYear = parseInt(parts[0], 10);
      if (!Number.isNaN(startYear)) {
        const nowYear = new Date().getFullYear();
        const diff = nowYear - startYear + 1;
        if (diff >= 1 && diff <= 4) {
          year = diff;
        }
      }
    }

    // 2) If still 0, derive from semesterName: "I" => 1, "II" => 2, etc.
    if (!year) {
      const semFromAttendance = romanToInt(student.semesterName);
      if (semFromAttendance > 0) {
        year = Math.ceil(semFromAttendance / 2);
      }
    }

    // 3) Fallback to any numeric year fields in profileData
    if (!year) {
      const yearRaw =
        profileData.year ||
        profileData.currentYear ||
        profileData.classYear;
      const n = Number(yearRaw);
      if (!Number.isNaN(n) && n > 0) {
        year = n;
      }
    }

    // -------------------
    // PHOTO (if available anywhere)
    // -------------------
    const profilePhotoUrl: string | undefined =
      student.profilePhoto ||
      student.profilePic ||
      student.profilePicture ||
      student.photoUrl ||
      student.imageUrl ||
      student.photo ||
      student.avatar ||
      profileData.profilePhoto ||
      profileData.profilePic ||
      profileData.profilePicture ||
      profileData.photoUrl ||
      profileData.imageUrl ||
      profileData.photo ||
      profileData.avatar;

    const profile: CyberProfile = {
      name,
      branch,
      year,
      userName: profileData.userName || student.registrationNumber,
      firstName: profileData.firstName || student.firstName,
      lastName: profileData.lastName || student.lastName,
      email: profileData.email,
      mobileNumber:
        profileData.mobileNumber != null
          ? String(profileData.mobileNumber)
          : undefined,
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      roles: profileData.roles,
      profilePhoto: profilePhotoUrl,
    };

    console.log("✅ Normalized CyberVidya profile (FINAL):", profile);

    return profile;
  } catch (err) {
    console.error("🔥 getProfileFromCyberVidya error:", err);
    return null;
  }
}
