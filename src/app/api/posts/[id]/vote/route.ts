import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getAuthUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await req.json(); // 'up' or 'down'

  await connectDB();
  const { id } = await params;
  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove existing vote
  post.upvotes = post.upvotes.filter((u: string) => u !== user.username);
  post.downvotes = post.downvotes.filter((u: string) => u !== user.username);

  if (type === 'up') {
      post.upvotes.push(user.username);
  } else if (type === 'down') {
      post.downvotes.push(user.username);
  }

  await post.save();
  return NextResponse.json({ success: true });
}
