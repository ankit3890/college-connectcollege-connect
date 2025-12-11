import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
      const { id } = await params;
      const post = await Post.findById(id);
      if(!post) return NextResponse.json({error: "Not found"}, {status: 404});
      return NextResponse.json(post);
  } catch {
      return NextResponse.json({error: "Invalid ID"}, {status: 400});
  }
}
