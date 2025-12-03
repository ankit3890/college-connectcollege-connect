// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

interface LoginBody {
  studentId?: string;
  email?: string;
  password?: string;
}

function jsonError(msg: string, status: number) {
  return NextResponse.json({ msg }, { status });
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const { studentId, email, password } = (await req.json()) as LoginBody;

    if ((!studentId && !email) || !password) {
      return jsonError(
        "Student ID or email and password are required",
        400
      );
    }

    // Find user by studentId or email
    const user = await User.findOne(
      studentId ? { studentId } : { email }
    );

    if (!user) {
      return jsonError("Invalid credentials", 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return jsonError("Invalid credentials", 401);
    }

    // 🔒 BAN CHECK
    if (user.isBanned) {
      const now = Date.now();
      const bannedUntil = user.bannedUntil
        ? user.bannedUntil.getTime()
        : null;

      if (bannedUntil && bannedUntil <= now) {
        // ban expired → auto‑unban
        user.isBanned = false;
        user.bannedReason = null;
        user.bannedUntil = null;
        await user.save();
      } else {
        // still banned (time‑limited in future OR permanent)
        return NextResponse.json(
          {
            msg: "Your account is currently banned.",
            banned: true,
            reason: user.bannedReason || null,
            bannedUntil: user.bannedUntil || null,
          },
          { status: 403 }
        );
      }
    }

    // Update last active time
    user.lastActiveAt = new Date();
    await user.save();

    // Create JWT token
    const token = createToken({
      id: user._id.toString(),
      studentId: user.studentId,
    });

    const res = NextResponse.json({
      msg: "Login successful",
      user: {
        id: user._id,
        studentId: user.studentId,
        email: user.email,
        role: user.role,
        username: user.username,
      },
    });

    // Set cookie
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return jsonError("Server error", 500);
  }
}
