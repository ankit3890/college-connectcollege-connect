import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Community from "@/models/Community";
import { getAuthUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { communityName, targetUser, action } = await req.json(); // action: 'kick' | 'ban' | 'unban'
  
  await connectDB();
  const community = await Community.findOne({ name: communityName });
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auth specific check: Only creator or subadmins
  const isCreator = community.creator === user.username;
  if (!isCreator && !community.subadmins?.includes(user.username)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Prevent acting on creator
  if (targetUser === community.creator) {
      return NextResponse.json({ error: "Cannot kick/ban creator" }, { status: 400 });
  }

  if (action === 'kick') {
      community.members = community.members.filter((m: string) => m !== targetUser);
  } else if (action === 'ban') {
      community.members = community.members.filter((m: string) => m !== targetUser);
      if (!community.bannedUsers) community.bannedUsers = [];
      if (!community.bannedUsers.some((u: any) => u.username === targetUser)) {
          community.bannedUsers.push({ username: targetUser, reason: "Banned by admin", bannedAt: new Date() });
      }
  } else if (action === 'unban') {
       if (community.bannedUsers) {
           community.bannedUsers = community.bannedUsers.filter((u: any) => u.username !== targetUser);
       }
  }

  await community.save();
  return NextResponse.json({ success: true });
}
