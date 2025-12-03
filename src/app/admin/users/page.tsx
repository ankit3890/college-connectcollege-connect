"use client";

import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";

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

    // Current user state for permissions
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Edit form state
    const [editForm, setEditForm] = useState<{
        studentId: string;
        name: string;
        role: string;
        branch: string;
        year: number | string;
    }>({
        studentId: "",
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
            }
        } catch (err) {
            console.error("Failed to ban user:", err);
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
            }
        } catch (err) {
            console.error("Failed to update user:", err);
        }
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
                    <p className="text-slate-600">View and manage all registered users</p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-black">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by ID, email, or name..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter("all")}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow p-4 border-2 border-black">
                        <div className="text-2xl font-bold text-slate-900">{users.length}</div>
                        <div className="text-sm text-slate-600">Total Users</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 border-2 border-black">
                        <div className="text-2xl font-bold text-emerald-600">
                            {users.filter(u => u.role === "student" || !u.role).length}
                        </div>
                        <div className="text-sm text-slate-600">Students</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 border-2 border-black">
                        <div className="text-2xl font-bold text-blue-600">
                            {users.filter(u => u.role === "admin" || u.role === "superadmin").length}
                        </div>
                        <div className="text-sm text-slate-600">Admins</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 border-2 border-black">
                        <div className="text-2xl font-bold text-red-600">
                            {users.filter(u => u.isBanned).length}
                        </div>
                        <div className="text-sm text-slate-600">Banned</div>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-black">
                        <div className="text-slate-600">Loading users...</div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-black">
                        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                        <p className="text-slate-500 text-sm">
                            {searchQuery ? "Try adjusting your search query" : "No users registered yet"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-black">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">CyberVidya ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Branch/Year</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredUsers.map((user) => {
                                        const displayName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "No name";
                                        return (
                                            <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {user.profilePhoto ? (
                                                            <img src={user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                                <span className="text-slate-600 font-medium">{displayName.charAt(0)}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium text-slate-900">{displayName}</div>
                                                            <div className="text-sm text-slate-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm text-slate-700">{user.studentId}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-700">
                                                        {user.branch && <div>{user.branch}</div>}
                                                        {user.year && <div className="text-slate-500">Year {user.year}</div>}
                                                        {!user.branch && !user.year && <span className="text-slate-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(user.role)}`}>
                                                        {user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Student"}
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
                                                                        ? "bg-green-100 text-green-800 border-green-300"
                                                                        : "bg-slate-100 text-slate-600 border-slate-300"
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
                                                        <button
                                                            onClick={() => openProfileModal(user)}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                            title="View Profile"
                                                        >
                                                            View
                                                        </button>

                                                        {/* Only show Edit/Ban if allowed */}
                                                        {(currentUser?.role === "superadmin" || (currentUser?.role === "admin" && (user.role === "student" || user._id === currentUser._id))) && (
                                                            <>
                                                                <span className="text-slate-300">|</span>
                                                                <button
                                                                    onClick={() => openEditModal(user)}
                                                                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                                                                    title="Edit User"
                                                                >
                                                                    Edit
                                                                </button>
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

            {/* Profile Modal */}
            {showProfileModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-black">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-900">User Profile</h2>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                {selectedUser.profilePhoto ? (
                                    <img src={selectedUser.profilePhoto} alt="" className="w-20 h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                                        <span className="text-2xl text-slate-600 font-medium">
                                            {(selectedUser.name || selectedUser.firstName || "?").charAt(0)}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">
                                        {selectedUser.name || `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || "No name"}
                                    </h3>
                                    <p className="text-slate-600">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">CyberVidya ID</p>
                                    <p className="font-mono font-medium">{selectedUser.studentId}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Role</p>
                                    <p className="font-medium">
                                        {selectedUser.role === "superadmin" ? "Super Admin" : selectedUser.role === "admin" ? "Admin" : "Student"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Branch</p>
                                    <p className="font-medium">{selectedUser.branch || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Year</p>
                                    <p className="font-medium">{selectedUser.year || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Gender</p>
                                    <p className="font-medium">{selectedUser.gender || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Mobile</p>
                                    <p className="font-medium">{selectedUser.mobileNumber || "-"}</p>
                                </div>
                            </div>

                            {selectedUser.isBanned && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-semibold text-red-900">Banned</p>
                                    <p className="text-sm text-red-700">{selectedUser.bannedReason || "No reason provided"}</p>
                                    {selectedUser.bannedUntil && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Until: {new Date(selectedUser.bannedUntil).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-black">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-900">Edit User</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Student ID (Username)</label>
                                <input
                                    type="text"
                                    value={editForm.studentId}
                                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="202412345678901"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="student">Student</option>
                                    {currentUser?.role === "superadmin" && (
                                        <>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Branch</label>
                                <input
                                    type="text"
                                    value={editForm.branch}
                                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Computer Science"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                                <input
                                    type="number"
                                    value={editForm.year}
                                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value === "" ? "" : parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="1"
                                    max="5"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
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
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && selectedUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-black">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {selectedUser.isBanned ? "Unban User" : "Ban User"}
                                </h2>
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-700">
                                {selectedUser.isBanned
                                    ? `Are you sure you want to unban ${selectedUser.name || selectedUser.email}?`
                                    : `Are you sure you want to ban ${selectedUser.name || selectedUser.email}?`
                                }
                            </p>

                            {!selectedUser.isBanned && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Ban Duration</label>
                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={banDurationType === "permanent"}
                                                    onChange={() => setBanDurationType("permanent")}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">Permanent</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={banDurationType === "temporary"}
                                                    onChange={() => setBanDurationType("temporary")}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">Temporary</span>
                                            </label>
                                        </div>
                                    </div>

                                    {banDurationType === "temporary" && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes)</label>
                                            <select
                                                value={banDuration}
                                                onChange={(e) => setBanDuration(parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Reason (optional)</label>
                                        <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                            rows={3}
                                            placeholder="Enter reason for banning..."
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
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
            )}
        </div>
    );
}
