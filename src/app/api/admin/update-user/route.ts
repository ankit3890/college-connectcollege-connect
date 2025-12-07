import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

import User from "@/models/User";
import AdminLog from "@/models/AdminLog";

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
      username?: string;
      name?: string;
      email?: string;
      mobileNumber?: string;
      branch?: string;
      year?: number;
      role?: "student" | "admin" | "superadmin" | "tester";
    };

    if (!userId) {
      return NextResponse.json({ msg: "userId is required" }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ msg: "User not found" }, { status: 404 });
    }

    // 🔒 Security: Admins can ONLY edit students, testers OR themselves
    const isSelf = adminUser._id.equals(targetUser._id);
    if (adminUser.role === "admin" && targetUser.role !== "student" && targetUser.role !== "tester" && !isSelf) {
      return NextResponse.json(
        { msg: "Admin cannot edit role of other admin or superadmin" },
        { status: 403 }
      );
    }

    const oldData = {
      studentId: targetUser.studentId,
      username: targetUser.username,
      name: targetUser.name,
      email: targetUser.email,
      mobileNumber: targetUser.mobileNumber,
      branch: targetUser.branch,
      year: targetUser.year,
      role: targetUser.role,
    };

    // 🔒 Security: CyberVidya ID and Name are IMMUTABLE for everyone via this API
    // (Previously allowed for Super Admin, now restricted as per request)
    // if (adminUser.role === "superadmin") { ... } -> REMOVED

    // Username update (Allowed for Admin & Super Admin) -> DISABLED as per request
    /*
    if (body.username && body.username !== targetUser.username) {
      const existing = await User.findOne({ username: body.username });
      if (existing) {
        return NextResponse.json({ msg: "Username already taken" }, { status: 400 });
      }
      targetUser.username = body.username;
    }
    */

    // Update other allowed fields
    if (email !== undefined) targetUser.email = email;
    if (mobileNumber !== undefined) targetUser.mobileNumber = mobileNumber;
    if (branch !== undefined) targetUser.branch = branch;
    if (year !== undefined) targetUser.year = year;

    let roleChanged = false;
    let oldRole = "";
    let newRole = "";

    // Role update logic
    if (role) {
      console.log(`[DEBUG] Role update request: Admin=${adminUser.role}, Target=${targetUser.role}, NewRole=${role}`);

      // 🔒 CRITICAL SECURITY: Prevent Self-Role Update for BOTH Admin and SuperAdmin
      if (isSelf) {
        if (role !== targetUser.role) {
          return NextResponse.json({ msg: "You cannot change your own role" }, { status: 403 });
        }
      } else {
        // Super Admin can assign any role to OTHERS
        if (adminUser.role === "superadmin") {
          console.log(`[DEBUG] Superadmin Logic: TargetRole=${targetUser.role}, RequestedRole=${role}`);
          
          if (role !== targetUser.role) {
            // 🛡️ Security: One Super Admin cannot change role of another Super Admin
            // Check case-insensitive just in case
            if (String(targetUser.role).toLowerCase() === "superadmin") {
              console.log("[DEBUG] Blocked attempt to change superadmin role");
              return NextResponse.json(
                { msg: "Super admins cannot change the role of other super admins" },
                { status: 403 }
              );
            }

            roleChanged = true;
            oldRole = targetUser.role;
            newRole = role;
            targetUser.role = role;
          }
        }
        // Admin can only assign "student" or "tester" to OTHERS
        else if (adminUser.role === "admin") {
          console.log(`[DEBUG] Admin attempting to update role`);

          if (role === "student" || role === "tester") {
            if (role !== targetUser.role) {
              console.log(`[DEBUG] Role change allowed`);
              roleChanged = true;
              oldRole = targetUser.role;
              newRole = role;
              targetUser.role = role;
            } else {
              console.log(`[DEBUG] Role is same as target`);
            }
          } else if (role === "admin" || role === "superadmin") {
            console.log(`[DEBUG] Admin tried to promote to admin/superadmin`);
            return NextResponse.json({ msg: "Admin cannot promote users to admin/superadmin" }, { status: 403 });
          } else {
            console.log(`[DEBUG] Invalid role for admin: ${role}`);
          }
        }
      }
    } else {
      console.log(`[DEBUG] No role provided in body`);
    }

    await targetUser.save();

    // Calculate changed fields for logging
    const changedFields: any = {};
    if (targetUser.username !== oldData.username) changedFields.username = { from: oldData.username, to: targetUser.username };
    if (targetUser.email !== oldData.email) changedFields.email = { from: oldData.email, to: targetUser.email };
    if (targetUser.mobileNumber !== oldData.mobileNumber) changedFields.mobileNumber = { from: oldData.mobileNumber, to: targetUser.mobileNumber };
    if (targetUser.branch !== oldData.branch) changedFields.branch = { from: oldData.branch, to: targetUser.branch };
    if (targetUser.year !== oldData.year) changedFields.year = { from: oldData.year, to: targetUser.year };

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
    return NextResponse.json({ msg: `Server error: ${(err as Error).message}` }, { status: 500 });
  }
}
