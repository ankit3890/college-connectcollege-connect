import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import User from "@/models/User";

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

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
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

        const requester = await User.findById(decoded.id);
        if (!requester) {
            return NextResponse.json({ msg: "Requester not found" }, { status: 404 });
        }

        const targetId = params.id;

        // Access Control:
        // 1. User can view their own profile
        // 2. Admin/SuperAdmin can view any profile
        const isSelf = requester._id.equals(targetId);
        const isAdmin = requester.role === "admin" || requester.role === "superadmin";

        if (!isSelf && !isAdmin) {
            return NextResponse.json({ msg: "Unauthorized" }, { status: 403 });
        }

        const targetUser = await User.findById(targetId).select("-passwordHash");
        if (!targetUser) {
            return NextResponse.json({ msg: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user: targetUser });
    } catch (err) {
        console.error("GET /api/user/[id] error:", err);
        return NextResponse.json({ msg: "Server error" }, { status: 500 });
    }
}
