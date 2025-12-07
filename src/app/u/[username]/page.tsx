"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface Profile {
    _id?: string;
    name?: string;
    displayName?: string;
    username?: string;
    branch?: string;
    year?: number;
    gender?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    accentColor?: string;
    bio?: string;
    statusText?: string;
    interests?: string[];
    skills?: string[];
    socials?: {
        github?: string;
        linkedin?: string;
        website?: string;
        instagram?: string;
        twitter?: string;
    };
    followersCount?: number;
    followingCount?: number;
    role?: string;
    hasSyncedFromCyberVidya?: boolean;
    studentId?: string;
    email?: string;
    showBranchYear?: boolean;
}

interface UserList {
    _id: string;
    name: string;
    displayName?: string;
    username?: string;
    studentId?: string;
    avatarUrl?: string;
    role?: string;
}

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(null);

    // Follow System State
    const [isFollowing, setIsFollowing] = useState(false);
    const [isMutual, setIsMutual] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showUserListModal, setShowUserListModal] = useState<"followers" | "following" | null>(null);
    const [userList, setUserList] = useState<UserList[]>([]);
    const [userListLoading, setUserListLoading] = useState(false);

    useEffect(() => {
        // Fetch current user
        fetch("/api/profile/me", { cache: "no-store" })
            .then((res) => {
                if (res.ok) return res.json();
                return null;
            })
            .then((data) => {
                if (data && data.profile) {
                    setCurrentUserUsername(data.profile.username);
                }
            })
            .catch(() => { });

        // Fetch public profile
        fetch(`/api/profile/${username}?t=${Date.now()}`, { cache: "no-store" })
            .then(async (res) => {
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.msg || "Failed to load profile");
                }
                return res.json();
            })
            .then((data) => {
                setProfile(data.profile);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });

        // Check follow status
        fetch(`/api/users/${username}/follow?t=${Date.now()}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => {
                setIsFollowing(data.isFollowing);
                setIsMutual(data.isMutual);
            })
            .catch(() => { });

        // Log View Profile
        const logView = async () => {
            try {
                await fetch("/api/log/activity", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "VIEW_PROFILE",
                        details: `Viewed profile of ${username}`
                    })
                });
            } catch (e) {
                // ignore
            }
        };
        logView();

    }, [username]);

    const handleFollowToggle = async () => {
        if (!currentUserUsername) {
            router.push("/login");
            return;
        }
        setFollowLoading(true);
        try {
            const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
            const data = await res.json();

            if (res.ok) {
                setIsFollowing(data.isFollowing);
                setIsMutual(data.isMutual);
                // Update counts locally
                setProfile(prev => prev ? {
                    ...prev,
                    followersCount: (prev.followersCount || 0) + (data.isFollowing ? 1 : -1)
                } : null);
            } else {
                alert(data.msg || "Something went wrong");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update follow status");
        } finally {
            setFollowLoading(false);
        }
    };

    const fetchUserList = async (type: "followers" | "following") => {
        setUserListLoading(true);
        setShowUserListModal(type);
        try {
            const res = await fetch(`/api/users/${username}/${type}`);
            const data = await res.json();
            if (res.ok) {
                setUserList(data.users);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUserListLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            document.cookie = "token=; Max-Age=0; path=/";
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            window.location.href = "/";
        } catch (err) {
            console.error("Logout failed:", err);
            window.location.href = "/";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
                <Navbar />
                <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
                <Navbar />
                <div className="max-w-4xl mx-auto px-4 py-6 text-center">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Profile not found</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error || "The user you are looking for does not exist or is private."}</p>
                    <div className="flex flex-col items-center gap-4">
                        <Link href="/dashboard" className="text-blue-600 hover:underline font-bold">
                            Go back to Dashboard
                        </Link>
                        <div className="text-sm text-slate-500">
                            <span>Know this person? </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + "/register");
                                    alert("Registration link copied to clipboard!");
                                }}
                                className="text-blue-600 hover:underline font-bold"
                            >
                                Invite them to join
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isOwnProfile = currentUserUsername === profile.username;
    const accentColor = profile.accentColor || "#3b82f6";

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-4 transition-colors duration-300">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 space-y-3">
                {/* HEADER CARD */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border-2 border-black dark:border-slate-700">
                    {/* Banner */}
                    <div
                        className="h-24 sm:h-32 w-full bg-cover bg-center relative"
                        style={{
                            backgroundColor: accentColor,
                            backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
                        }}
                    >
                        {!profile.bannerUrl && (
                            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
                        )}
                    </div>

                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 relative">
                        {/* Avatar */}
                        <div className="absolute -top-10 left-4 sm:left-6">
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                                {profile.avatarUrl ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt={profile.displayName || profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-white"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        {(profile.displayName || profile.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex justify-end pt-2 min-h-[40px] gap-2">
                            {isOwnProfile ? (
                                <>
                                    <Link
                                        href="/profile/edit"
                                        className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                    >
                                        Edit Profile
                                    </Link>
                                </>
                            ) : (
                                <div className="flex gap-2">
                                    {/* Message Button - Only if mutual */}
                                    {isMutual && (
                                        <Link
                                            href={`/chat?friendId=${profile._id}`}
                                            className="px-3 py-1 bg-indigo-600 border border-indigo-700 rounded-lg text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Message
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={followLoading}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm border ${isFollowing
                                            ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800"
                                            : "bg-black dark:bg-white border-black dark:border-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200"
                                            }`}
                                    >
                                        {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="mt-3 sm:mt-12">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {profile.name}
                                </h1>
                                {profile.hasSyncedFromCyberVidya ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 mb-1 border border-green-200 dark:border-green-800">
                                        Details synced to CyberVidya ✅
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 mb-1 border border-red-200 dark:border-red-800">
                                        Details not synced to CyberVidya ❌
                                    </span>
                                )}
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">@{profile.username}</p>

                            {profile.statusText && (
                                <p className="text-slate-600 dark:text-slate-400 mt-1 italic text-xs sm:text-sm">"{profile.statusText}"</p>
                            )}

                            {/* Follow Counts */}
                            <div className="flex gap-3 sm:gap-5 mt-2 text-xs sm:text-sm">
                                <button onClick={() => fetchUserList("following")} className="hover:underline">
                                    <span className="font-bold text-slate-900 dark:text-white">{profile.followingCount || 0}</span> <span className="text-slate-500 dark:text-slate-400">Following</span>
                                </button>
                                <button onClick={() => fetchUserList("followers")} className="hover:underline">
                                    <span className="font-bold text-slate-900 dark:text-white">{profile.followersCount || 0}</span> <span className="text-slate-500 dark:text-slate-400">Followers</span>
                                </button>
                            </div>

                            {/* Chips Row */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {profile.role && profile.role !== "student" && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 capitalize">
                                        {profile.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* DETAILS CARD (Split Layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* LEFT: College Details (Locked) */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-black dark:border-slate-700 p-4 sm:col-span-1 h-fit">
                        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h2 className="font-bold text-sm text-slate-900 dark:text-white">College Details</h2>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">CyberVidya ID</label>
                                <p className="font-medium text-slate-900 dark:text-white font-mono text-xs bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                    {profile.studentId}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Branch</label>
                                <p className="font-medium text-slate-900 dark:text-white font-mono text-xs bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded w-fit mt-0.5">{profile.branch || "Not set"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Year</label>
                                <p className="font-medium text-slate-900 dark:text-white font-mono text-xs bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded w-fit mt-0.5">{profile.year || "Not set"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">College Email</label>
                                <p className="font-medium text-slate-900 dark:text-white font-mono text-xs bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded w-fit mt-0.5 break-all">{profile.email}</p>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Gender</label>
                                <p className="font-medium text-slate-900 dark:text-white font-mono text-xs bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded w-fit mt-0.5 capitalize">{profile.gender || "Not set"}</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Personal Profile */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-black dark:border-slate-700 p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h2 className="font-bold text-sm text-slate-900 dark:text-white">About</h2>
                        </div>

                        <div className="space-y-3">
                            {/* Username in About */}
                            <div>
                                <h3 className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Username</h3>
                                <p className="font-medium text-slate-900 dark:text-white text-sm">@{profile.username}</p>
                            </div>
                            <div className="border-b border-slate-200 dark:border-slate-700"></div>

                            {/* Bio */}
                            <div>
                                <h3 className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">Bio</h3>
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
                                    {profile.bio || "No bio added yet."}
                                </p>
                            </div>
                            <div className="border-b border-slate-200 dark:border-slate-700"></div>

                            {/* Interests & Skills */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <h3 className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5">Interests</h3>
                                    {profile.interests && profile.interests.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.interests.map((tag, i) => {
                                                const colors = [
                                                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                                                    "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                                                    "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
                                                    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
                                                    "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
                                                    "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
                                                ];
                                                const colorClass = colors[i % colors.length];
                                                return (
                                                    <span key={i} className={`px-2 py-0.5 rounded-md border text-xs font-medium ${colorClass}`}>
                                                        {tag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">None added</p>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5">Skills</h3>
                                    {profile.skills && profile.skills.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.skills.map((tag, i) => {
                                                const colors = [
                                                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                                                    "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                                                    "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
                                                    "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
                                                    "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
                                                    "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
                                                ];
                                                const colorClass = colors[(i + 2) % colors.length];
                                                return (
                                                    <span key={i} className={`px-2 py-0.5 rounded-md border text-xs font-medium ${colorClass}`}>
                                                        {tag}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">None added</p>
                                    )}
                                </div>
                            </div>
                            <div className="border-b border-slate-50"></div>

                            {/* Socials */}
                            <div>
                                <h3 className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Connect</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.socials?.github && (
                                        <a href={profile.socials.github} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-black dark:hover:border-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all bg-white dark:bg-slate-800 group">
                                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-black dark:group-hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-black dark:group-hover:text-white">GitHub</span>
                                        </a>
                                    )}
                                    {profile.socials?.linkedin && (
                                        <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-[#0077b5] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all bg-white dark:bg-slate-800 group">
                                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#0077b5]">LinkedIn</span>
                                        </a>
                                    )}
                                    {profile.socials?.twitter && (
                                        <a href={profile.socials.twitter} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-[#1DA1F2] hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all bg-white dark:bg-slate-800 group">
                                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#1DA1F2]">Twitter</span>
                                        </a>
                                    )}
                                    {profile.socials?.instagram && (
                                        <a href={profile.socials.instagram} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-[#E1306C] hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all bg-white dark:bg-slate-800 group">
                                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-[#E1306C]">Instagram</span>
                                        </a>
                                    )}
                                    {profile.socials?.website && (
                                        <a href={profile.socials.website} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all bg-white dark:bg-slate-800 group">
                                            <svg className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 16.057v-3.057h2.994c-.059 1.143-.212 2.183-.442 3.057h-2.552zm-2 0h-2.552c-.23-.874-.383-1.914-.442-3.057h2.994v3.057zm0-5.057v-3h2.994c.059 1.143.212 2.184.442 3.057h-3.436zm2-5.057v3.057h-2.994c.059-1.143.212-2.184.442-3.057h2.552zm-4.994 3.057h-2.906c.279-1.65.9-3.008 1.72-4.057h1.186c-.23.874-.383 1.914-.442 3.057zm0 2h-3.006c-.056-.656-.094-1.325-.094-2s.038-1.344.094-2h3.006c-.059 1.143-.212 2.184-.442 3.057v-1.057zm0 2.057v1.057c.23.874.383 1.914.442 3.057h-1.186c-.82-1.049-1.441-2.407-1.72-4.057h2.906zm7.994 1.057c.059-1.143.212-2.184.442-3.057h2.906c-.279 1.65-.9 3.008-1.72 4.057h-1.186zm0-2.057v-1.057c-.23-.874-.383-1.914-.442-3.057h3.006c.056.656.094 1.325.094 2s-.038 1.344-.094 2h-3.006zm0-3.057h2.906c.279 1.65.9 3.008 1.72 4.057h-1.186c-.23.874-.383 1.914-.442 3.057z" /></svg>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-500">Website</span>
                                        </a>
                                    )}

                                    {!profile.socials?.github && !profile.socials?.linkedin && !profile.socials?.twitter && !profile.socials?.instagram && !profile.socials?.website && (
                                        <p className="text-xs text-slate-400 italic">No social links added</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Actions (Bottom) */}
                {isOwnProfile && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-black dark:border-slate-700 p-4">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Account Actions</h2>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Link
                                href="/profile/change-password"
                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
                            >
                                Change Password
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* User List Modal */}
            {showUserListModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{showUserListModal}</h2>
                            <button onClick={() => setShowUserListModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 flex-1">
                            {userListLoading ? (
                                <div className="flex justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : userList.length > 0 ? (
                                userList.map((user) => {
                                    const displayName = user.displayName || user.name || "User";
                                    return (
                                        <Link key={user._id} href={`/u/${user.username || user.studentId}`} onClick={() => setShowUserListModal(null)} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                                {user.avatarUrl ? (
                                                    <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username || user.studentId}</p>
                                            </div>
                                        </Link>
                                    );
                                })
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">No users found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
