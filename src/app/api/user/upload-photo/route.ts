// src/app/api/user/upload-photo/route.ts
import { NextResponse } from "next/server";
import multer from "multer";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Configure multer to store file locally
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // unique filename
  },
});

const upload = multer({ storage });

// Modern Next.js App Router configuration
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ msg: "Not logged in" }, { status: 401 });

    const decoded = verifyToken<{ id: string }>(token);
    if (!decoded) return NextResponse.json({ msg: "Invalid token" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("photo") as File;

    if (!file) return NextResponse.json({ msg: "No file uploaded" }, { status: 400 });

    const filePath = `/uploads/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to /public/uploads
    const fs = require("fs");
    fs.writeFileSync(`public${filePath}`, buffer);

    // Update user profile photo
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { profilePhoto: filePath },
      { new: true }
    );

    return NextResponse.json({ msg: "Photo updated", user });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ msg: "Server error" }, { status: 500 });
  }
}
