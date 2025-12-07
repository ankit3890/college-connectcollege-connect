"use client";

import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
    _id: string;
    studentId: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    branch?: string;
    year?: number;
    role?: string;
    isBanned?: boolean;
    bannedReason?: string;
    bannedUntil?: string;
    lastActiveAt?: string;
    mobileNumber?: string;
    gender?: string;
    profilePhoto?: string;
    avatarUrl?: string; // Correct field for Base64 images
    username?: string;
}

function UserAvatar({ src, alt, fallbackChar }: { src?: string, alt: string, fallbackChar: string }) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                <span className="text-slate-600 dark:text-slate-200 font-medium">{fallbackChar}</span>
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className="w-10 h-10 rounded-full object-cover" 
            onError={() => setError(true)}
        />
    );
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Current user state for permissions
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState<{
        studentId: string;
        username: string;
        name: string;
        role: string;
        branch: string;
        year: number | string;
    }>({
        studentId: "",
        username: "",
        name: "",
        role: "",
        branch: "",
        year: 0,
    });

    // Ban form state
    const [banReason, setBanReason] = useState("");
    const [banDurationType, setBanDurationType] = useState<"permanent" | "temporary">("permanent");
    const [banDuration, setBanDuration] = useState<number>(60); // minutes

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers();
    }, []);

    async function fetchCurrentUser() {
        try {
            const res = await fetch("/api/user/me");
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user);
            }
        } catch (err) {
            console.error("Failed to fetch current user:", err);
        }
    }

    async function fetchUsers() {
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    }

    const filteredUsers = users.filter(user => {
        if (filter !== "all" && user.role !== filter) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                user.studentId?.toLowerCase().includes(query) ||
                user.email?.toLowerCase().includes(query) ||
                user.name?.toLowerCase().includes(query) ||
                user.firstName?.toLowerCase().includes(query) ||
                user.lastName?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const getRoleBadge = (role?: string) => {
        switch (role) {
            case "superadmin":
                return "bg-purple-100 text-purple-800 border-purple-300";
            case "admin":
                return "bg-blue-100 text-blue-800 border-blue-300";
            case "tester":
                return "bg-orange-100 text-orange-800 border-orange-300";
            default:
                return "bg-emerald-100 text-emerald-800 border-emerald-300";
        }
    };

    function openProfileModal(user: User) {
        setSelectedUser(user);
        setShowProfileModal(true);
    }

    function openEditModal(user: User) {
        setSelectedUser(user);
        setEditForm({
            studentId: user.studentId || "",
            username: user.username || "",
            name: user.name || "",
            role: user.role || "student",
            branch: user.branch || "",
            year: user.year || 1,
        });
        setShowEditModal(true);
    }

    function openBanModal(user: User) {
        setSelectedUser(user);
        setBanReason("");
        setBanDurationType("permanent");
        setBanDuration(60);
        setShowBanModal(true);
    }

    function openDeleteModal(user: User) {
        setSelectedUser(user);
        setShowDeleteModal(true);
    }

    async function handleBanUser() {
        if (!selectedUser) return;

        const durationMinutes = banDurationType === "temporary" ? banDuration : undefined;

        try {
            const res = await fetch("/api/admin/ban-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser._id,
                    ban: !selectedUser.isBanned,
                    reason: banReason,
                    durationMinutes: selectedUser.isBanned ? undefined : durationMinutes
                }),
            });

            if (res.ok) {
                await fetchUsers();
                setShowBanModal(false);
                setSelectedUser(null);
            } else {
                const data = await res.json();
                alert(data.msg || "Failed to ban user");
            }
        } catch (err) {
            console.error("Failed to ban user:", err);
            alert("An error occurred while banning the user");
        }
    }

    async function handleUpdateUser() {
        if (!selectedUser) return;

        try {
            const res = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser._id,
                    ...editForm,
                    year: editForm.year === "" ? null : Number(editForm.year)
                }),
            });

            if (res.ok) {
                await fetchUsers();
                setShowEditModal(false);
                setSelectedUser(null);
            } else {
                const data = await res.json();
                alert(data.msg || "Failed to update user");
            }
        } catch (err) {
            console.error("Failed to update user:", err);
            alert("An error occurred while updating the user");
        }
    }

    async function handleDeleteUser() {
        if (!selectedUser) return;

        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: selectedUser._id
                }),
            });

            if (res.ok) {
                await fetchUsers();
                setShowDeleteModal(false);
                setSelectedUser(null);
            } else {
                const data = await res.json();
                alert(data.msg || "Failed to delete user");
            }
        } catch (err) {
            console.error("Failed to delete user:", err);
            alert("Failed to delete user");
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-4">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">User Management</h1>
                    <p className="text-slate-600 dark:text-slate-400">View and manage all registered users</p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-4 border-2 border-black dark:border-slate-700">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ID, email, or name..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === "all" ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter("student")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === "student" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => setFilter("admin")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === "admin" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    }`}
                            >
                                Admins
                            </button>
                            <button
                                onClick={() => setFilter("tester")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === "tester" ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                    }`}
                            >
                                Testers
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border-2 border-black dark:border-slate-700">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border-2 border-black dark:border-slate-700">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {users.filter(u => u.role === "student" || !u.role).length}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Students</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border-2 border-black dark:border-slate-700">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {users.filter(u => u.role === "admin" || u.role === "superadmin").length}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Admins</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border-2 border-black dark:border-slate-700">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {users.filter(u => u.isBanned).length}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Banned</div>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center border-2 border-black dark:border-slate-700">
                        <div className="text-slate-600 dark:text-slate-400">Loading users...</div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center border-2 border-black dark:border-slate-700">
                        <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No users found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {searchQuery ? "Try adjusting your search query" : "No users registered yet"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border-2 border-black dark:border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">CyberVidya ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Branch/Year</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredUsers.map((user) => {
                                        const displayName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "No name";
                                        const displayImage = user.avatarUrl || user.profilePhoto; // Prioritize new avatar field

                                        return (
                                            <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar 
                                                            src={displayImage} 
                                                            alt={displayName} 
                                                            fallbackChar={displayName.charAt(0)} 
                                                        />
                                                        <div>
                                                            <div className="font-medium text-slate-900 dark:text-white">{displayName}</div>
                                                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{user.studentId}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-700 dark:text-slate-300">
                                                        {user.branch && <div>{user.branch}</div>}
                                                        {user.year && <div className="text-slate-500 dark:text-slate-400">Year {user.year}</div>}
                                                        {!user.branch && !user.year && <span className="text-slate-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(user.role)}`}>
                                                        {user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : user.role === "tester" ? "Tester" : "Student"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.isBanned ? (
                                                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
                                                            Banned
                                                        </span>
                                                    ) : (
                                                        (() => {
                                                            const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
                                                            const isActive = lastActive && (new Date().getTime() - lastActive.getTime() < 5 * 60 * 1000); // 5 mins

                                                            const timeAgo = (date: Date) => {
                                                                const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
                                                                let interval = seconds / 31536000;
                                                                if (interval > 1) return Math.floor(interval) + "y ago";
                                                                interval = seconds / 2592000;
                                                                if (interval > 1) return Math.floor(interval) + "mo ago";
                                                                interval = seconds / 86400;
                                                                if (interval > 1) return Math.floor(interval) + "d ago";
                                                                interval = seconds / 3600;
                                                                if (interval > 1) return Math.floor(interval) + "h ago";
                                                                interval = seconds / 60;
                                                                if (interval > 1) return Math.floor(interval) + "m ago";
                                                                return "Just now";
                                                            };

                                                            return (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${isActive
                                                                        ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                                                                        : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                                                                        }`}>
                                                                        {isActive ? "Active" : "Offline"}
                                                                    </span>
                                                                    {lastActive && (
                                                                        <span className="text-xs text-slate-500 ml-1">
                                                                            {timeAgo(lastActive)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link
                                                            href={`/u/${user.username || user.studentId}`} // Fallback to studentId if username missing, though username should exist
                                                            target="_blank"
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                                                            title="View Profile"
                                                        >
                                                            View
                                                        </Link>

                                                        {/* Only show Edit/Ban if allowed */}
                                                        {/* Edit Button */}
                                                        {(currentUser?.role === "superadmin" || (currentUser?.role === "admin" && (user.role === "student" || user.role === "tester" || user._id === currentUser._id))) && (
                                                            <>
                                                                <span className="text-slate-300">|</span>
                                                                <button
                                                                    onClick={() => openEditModal(user)}
                                                                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium text-sm"
                                                                    title="Edit User"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Ban Button - NEVER show for self, and Super Admin cannot ban other Super Admins */}
                                                        {user._id !== currentUser?._id && (
                                                            (currentUser?.role === "superadmin" && user.role !== "superadmin") ||
                                                            (currentUser?.role === "admin" && (user.role === "student" || user.role === "tester"))
                                                        ) && (
                                                                <>
                                                                    <span className="text-slate-300">|</span>
                                                                    <button
                                                                        onClick={() => openBanModal(user)}
                                                                        className={`font-medium text-sm ${user.isBanned ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"
                                                                            }`}
                                                                        title={user.isBanned ? "Unban User" : "Ban User"}
                                                                    >
                                                                        {user.isBanned ? "Unban" : "Ban"}
                                                                    </button>
                                                                </>
                                                            )}

                                                        {/* Delete button for Super Admin only, and NOT for admins */}
                                                        {currentUser?.role === "superadmin" && user.role !== "admin" && user.role !== "superadmin" && (
                                                            <>
                                                                <span className="text-slate-300">|</span>
                                                                <button
                                                                    onClick={() => openDeleteModal(user)}
                                                                    className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium text-sm"
                                                                    title="Delete User"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Profile Modal - Kept for reference but unused if we only use Link? 
                Actually, let's keep it if I want to support "View" via modal as fallback?
                No, user asked for new tab. I'll remove the modal render to clean up.
                Wait, I kept the state `showProfileModal` and `openProfileModal` function.
                I'll keep the modal code just in case, but it won't be triggered by the "View" button anymore.
                Actually, I'll remove the modal JSX to avoid clutter, since it's not reachable.
            */}

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-black dark:border-slate-700">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit User</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">CyberVidya ID</label>
                                <input
                                    type="text"
                                    value={editForm.studentId}
                                    disabled={true}
                                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    placeholder="202412345678901"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    disabled={true}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={editForm.username}
                                    disabled={true}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    placeholder="@username"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Role</label>
                                <select
                                    value={editForm.role}
                                    disabled={currentUser?._id === selectedUser?._id || (selectedUser?.role === "superadmin")}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${currentUser?._id === selectedUser?._id || selectedUser?.role === "superadmin" ? "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed" : ""}`}
                                >
                                    <option value="student">Student</option>
                                    <option value="tester">Tester</option>
                                    {currentUser?.role === "superadmin" && (
                                        <>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Branch</label>
                                <input
                                    type="text"
                                    value={editForm.branch}
                                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    placeholder="e.g., Computer Science"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Year</label>
                                <input
                                    type="number"
                                    value={editForm.year}
                                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value === "" ? "" : parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    min="1"
                                    max="5"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateUser}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div >
            )
            }

            {/* Delete Modal */}
            {
                showDeleteModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-black dark:border-slate-700">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Delete User</h2>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <h3 className="text-red-800 dark:text-red-300 font-semibold">Warning: Irreversible Action</h3>
                                        <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                                            You are about to permanently delete <strong>{selectedUser.name || selectedUser.studentId}</strong>. This action cannot be undone.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteUser}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                                    >
                                        Delete User
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Ban Modal */}
            {
                showBanModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-black dark:border-slate-700">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {selectedUser.isBanned ? "Unban User" : "Ban User"}
                                    </h2>
                                    <button
                                        onClick={() => setShowBanModal(false)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-slate-700 dark:text-slate-300">
                                    {selectedUser.isBanned
                                        ? `Are you sure you want to unban ${selectedUser.name || selectedUser.email}?`
                                        : `Are you sure you want to ban ${selectedUser.name || selectedUser.email}?`
                                    }
                                </p>

                                {!selectedUser.isBanned && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ban Duration</label>
                                            <div className="space-y-2">
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        checked={banDurationType === "permanent"}
                                                        onChange={() => setBanDurationType("permanent")}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">Permanent</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        checked={banDurationType === "temporary"}
                                                        onChange={() => setBanDurationType("temporary")}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">Temporary</span>
                                                </label>
                                            </div>
                                        </div>

                                        {banDurationType === "temporary" && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Duration (minutes)</label>
                                                <select
                                                    value={banDuration}
                                                    onChange={(e) => setBanDuration(parseInt(e.target.value))}
                                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                >
                                                    <option value={60}>1 hour</option>
                                                    <option value={360}>6 hours</option>
                                                    <option value={720}>12 hours</option>
                                                    <option value={1440}>1 day</option>
                                                    <option value={10080}>1 week</option>
                                                    <option value={43200}>30 days</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason (optional)</label>
                                            <textarea
                                                value={banReason}
                                                onChange={(e) => setBanReason(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                                rows={3}
                                                placeholder="Enter reason for banning..."
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowBanModal(false)}
                                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBanUser}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${selectedUser.isBanned
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-red-600 hover:bg-red-700"
                                            }`}
                                    >
                                        {selectedUser.isBanned ? "Unban User" : "Ban User"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
