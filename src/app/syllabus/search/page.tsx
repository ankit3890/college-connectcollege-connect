"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBox from "@/components/syllabus_components/SearchBox";
import Link from "next/link";

export default function SyllabusSearchPage() {
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        // Fetch all subjects on mount
        const fetchAll = async () => {
            try {
                const res = await fetch('/api/syllabus/search');
                const data = await res.json();
                if (data.results) {
                    setResults(data.results);
                }
            } catch (e) {
                console.error("Failed to fetch subjects", e);
            }
        };
        fetchAll();
    }, []);

    return (
        <div className="min-h-screen bg-slate-100">
            <Navbar />

            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Syllabus Search</h1>
                    <p className="text-slate-600">
                        Search for course syllabi by subject code or name
                    </p>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-2xl shadow-lg px-8 py-8 mb-8">
                    <SearchBox
                        onResults={(r) => {
                            setResults(r);
                            setSearching(false);
                        }}
                    />
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Subjects ({results.length})
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                            Subject Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                            Subject Name
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {results.map((res: any) => {
                                        const meta = res.matchData.metadata;
                                        const link = `/syllabus/subject/${res.id}${res.entryId ? `?entry=${res.entryId}` : ""}`;
                                        return (
                                            <tr key={res.ref} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm font-medium text-slate-900">
                                                        {meta.code || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-700">
                                                        {meta.subject || meta.title}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Link
                                                        href={link}
                                                        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                                    >
                                                        View Details
                                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {results.length === 0 && !searching && (
                    <div className="bg-white rounded-2xl shadow-lg px-8 py-12 text-center">
                        <div className="flex justify-center mb-4">
                            <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No results yet</h3>
                        <p className="text-slate-500 text-sm">
                            Try searching by Subject Code (e.g., MA101) or subject name
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
