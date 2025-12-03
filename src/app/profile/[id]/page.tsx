"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useParams } from "next/navigation";

interface User {
    _id?: string;
    studentId: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    branch?: string;
    year?: number;
    cyberUserName?: string;
    mobileNumber?: string;
    dateOfBirth?: string;
    gender?: string;
    role?: string;
    profilePhoto?: string;
    hasSyncedFromCyberVidya?: boolean;
    username?: string;
    hideContacts?: boolean;
}

export default function UserProfileView() {
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch(`/api/user/${userId}`);
                const raw = await res.json();
                console.log(`/api/user/${userId} response:`, raw);

                if (res.ok) {
                    if (raw.user) {
                        setUser(raw.user);
                    } else {
                        setMessage("User not found in response");
                    }
                } else {
                    setMessage(raw.msg || "Failed to load user");
                }
            } catch (err) {
                console.error(err);
                setMessage("Error loading user");
            } finally {
                setLoading(false);
            }
        }

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-10">
                    <p className="text-sm text-slate-700">Loading profile...</p>
                </main>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-100">
                <Navbar />
                <main className="max-w-4xl mx-auto px-4 py-10">
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {message || "User not found."}
                    </p>
                </main>
            </div>
        );
    }

    const displayName =
        user.name ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        "Not set";

    // role badge styling
    let roleBadgeLabel: string | null = null;
    let roleBadgeClass =
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";

    if (user.role === "superadmin") {
        roleBadgeLabel = "Super Admin";
        roleBadgeClass += " bg-purple-50 border-purple-300 text-purple-800";
    } else if (user.role === "admin") {
        roleBadgeLabel = "Admin";
        roleBadgeClass += " bg-blue-50 border-blue-300 text-blue-800";
    } else {
        roleBadgeLabel = "Student";
        roleBadgeClass += " bg-emerald-50 border-emerald-300 text-emerald-800";
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* heading */}
                <header className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">User Profile</h1>
                    <p className="text-slate-600">
                        Viewing profile details for {user.studentId}
                    </p>
                </header>

                {/* global message */}
                {message && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        {message}
                    </div>
                )}

                {/* TOP CARD: avatar + quick info */}
                <section className="rounded-xl border-2 border-black bg-white px-4 py-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                        {/* avatar */}
                        <div className="flex items-center gap-3">
                            {user.profilePhoto ? (
                                <img
                                    src={user.profilePhoto}
                                    alt="Profile photo"
                                    className="h-16 w-16 rounded-full border object-cover"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full border bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                                    No photo
                                </div>
                            )}
                        </div>

                        {/* main info */}
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-slate-900">
                                    {displayName}
                                </p>
                                {roleBadgeLabel && (
                                    <span className={roleBadgeClass}>{roleBadgeLabel}</span>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                <span className="rounded-full bg-slate-100 px-2 py-[2px]">
                                    ID: <span className="font-mono">{user.studentId}</span>
                                </span>
                                {user.branch && (
                                    <span className="rounded-full bg-slate-100 px-2 py-[2px]">
                                        {user.branch}
                                    </span>
                                )}
                                {user.year != null && (
                                    <span className="rounded-full bg-slate-100 px-2 py-[2px]">
                                        Year {user.year}
                                    </span>
                                )}
                                {user.gender && (
                                    <span className="rounded-full bg-slate-100 px-2 py-[2px]">
                                        {user.gender}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* DETAILS */}
                <section className="rounded-xl border-2 border-black bg-white px-4 py-4 shadow-lg">
                    <h2 className="text-sm font-semibold text-slate-900 mb-3">
                        Account details
                    </h2>

                    <div className="space-y-3 text-sm text-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500">Name</p>
                                <p>{displayName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">CyberVidya ID</p>
                                <p className="font-mono">{user.studentId}</p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">Username</p>
                                <p>{user.username ? `@${user.username}` : "Not set"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Role</p>
                                <p>{roleBadgeLabel}</p>
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 my-1" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Email</p>
                                <p>{user.hideContacts ? "Hidden" : user.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Mobile</p>
                                <p>
                                    {user.hideContacts
                                        ? "Hidden"
                                        : user.mobileNumber || "Not set"}
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 my-1" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <p className="text-xs text-slate-500">Gender</p>
                                <p>{user.gender || "Not set"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Branch</p>
                                <p>{user.branch || "Not set"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Year</p>
                                <p>{user.year ?? "Not set"}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Synced Status */}
                {user.hasSyncedFromCyberVidya && (
                    <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between text-sm text-emerald-800">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span>Profile is synced with CyberVidya ✅</span>
                            {user.cyberUserName && (
                                <span className="text-xs">
                                    Linked ID:{" "}
                                    <span className="font-mono">{user.cyberUserName}</span>
                                </span>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
