// src/app/api/admin/update-user/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

import User from "../../../../models/User";
import AdminLog from "../../../../models/AdminLog";

interface TokenPayload {
  id: string;
  studentId: string;
}

function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith("token=")) {
      return decodeURIComponent(part.substring("token=".length));
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ msg: "Not logged in" }, { status: 401 });
    }

    const decoded = verifyToken<TokenPayload>(token);
    if (!decoded) {
      return NextResponse.json({ msg: "Invalid token" }, { status: 401 });
    }

    const adminUser = await User.findById(decoded.id);
    if (!adminUser || (adminUser.role !== "admin" && adminUser.role !== "superadmin")) {
      return NextResponse.json(
        { msg: "Only admin/superadmin can update users" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      userId,
      name,
      email,
      mobileNumber,
      branch,
      year,
      role, // only used if superadmin
    } = body as {
      userId: string;
      studentId?: string;
      name?: string;
      email?: string;
      mobileNumber?: string;
      branch?: string;
      year?: number;
      role?: "student" | "admin" | "superadmin";
    };

    if (!userId) {
      return NextResponse.json({ msg: "userId is required" }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    // 🔒 Security: Admins can ONLY edit students OR themselves
    const isSelf = adminUser._id.equals(targetUser._id);
    if (adminUser.role === "admin" && targetUser.role !== "student" && !isSelf) {
      return NextResponse.json(
        { msg: "Admin cannot edit role of other admin or superadmin" },
        { status: 403 }
      );
    }

    const oldData = {
      studentId: targetUser.studentId,
      name: targetUser.name,
      email: targetUser.email,
      mobileNumber: targetUser.mobileNumber,
      branch: targetUser.branch,
      year: targetUser.year,
      role: targetUser.role,
    };

    if (body.studentId && body.studentId !== targetUser.studentId) {
      const existing = await User.findOne({ studentId: body.studentId });
      if (existing) {
        return NextResponse.json({ msg: "Student ID already taken" }, { status: 400 });
      }
      targetUser.studentId = body.studentId;
    }

    if (typeof name === "string") targetUser.name = name;
    if (typeof email === "string") targetUser.email = email;
    if (typeof mobileNumber === "string") targetUser.mobileNumber = mobileNumber;
    if (typeof branch === "string") targetUser.branch = branch;
    if (typeof year === "number" || year === null) targetUser.year = year as any;

    let roleChanged = false;
    let oldRole: string | undefined;
    let newRole: string | undefined;

    if (role && adminUser.role === "superadmin") {
      if (role !== targetUser.role) {
        roleChanged = true;
        oldRole = targetUser.role;
        newRole = role;
      }
      targetUser.role = role;
    }

    await targetUser.save();

    // Build changedFields diff for UPDATE_USER
    const changedFields: Record<string, { from: any; to: any }> = {};
    (["studentId", "name", "email", "mobileNumber", "branch", "year"] as const).forEach(
      (key) => {
        const before = (oldData as any)[key];
        const after = (targetUser as any)[key];
        if (before !== after) {
          changedFields[key] = { from: before, to: after };
        }
      }
    );

    // Log UPDATE_USER if anything changed (including role)
    if (Object.keys(changedFields).length > 0 || roleChanged) {
      await AdminLog.create({
        action: "UPDATE_USER",
        actorId: adminUser._id,
        actorStudentId: adminUser.studentId,
        actorRole: adminUser.role,
        targetUserId: targetUser._id,
        targetStudentId: targetUser.studentId,
        details: `Updated user ${targetUser.studentId}`,
        metadata: {
          changedFields,
          roleChanged,
          oldRole,
          newRole,
        },
      });
    }

    // Separate CHANGE_ROLE log for clear filtering
    if (roleChanged && oldRole && newRole) {
      await AdminLog.create({
        action: "CHANGE_ROLE",
        actorId: adminUser._id,
        actorStudentId: adminUser.studentId,
        actorRole: adminUser.role,
        targetUserId: targetUser._id,
        targetStudentId: targetUser.studentId,
        details: `Changed role from ${oldRole} to ${newRole} for ${targetUser.studentId}`,
        metadata: {
          fromRole: oldRole,
          toRole: newRole,
        },
      });
    }

    return NextResponse.json({ msg: "OK", user: targetUser });
  } catch (err) {
    console.error("POST /api/admin/update-user error:", err);
    return NextResponse.json({ msg: "Server error" }, { status: 500 });
  }
}
