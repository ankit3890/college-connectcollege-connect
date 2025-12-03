import React from "react";
import Navbar from "@/components/Navbar";
import { connectDb } from "@/lib/syllabus/db";
import { DocumentModel } from "@/models/syllabus/Document";

// Helper to get data directly from DB (Bypasses Vercel Auth issues)
async function getSubjectData(id: string) {
    try {
        await connectDb();
        const doc = await DocumentModel.findById(id).lean();

        if (!doc) return null;

        return {
            doc: JSON.parse(JSON.stringify(doc)),
            entries: doc.metadata?.entries || []
        };
    } catch (e) {
        console.error("[SubjectPage] DB Error:", e);
        return null;
    }
}

export default async function SubjectPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ entry?: string }> }) {
    const { id } = await params;
    const { entry: entryId } = await searchParams;
    const data = await getSubjectData(id);

    if (!data || !data.doc) {
        return (
            <>
                <Navbar />
                <div className="p-6 text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Subject not found</h1>
                    <div className="text-left max-w-lg mx-auto bg-slate-100 p-4 rounded-lg text-xs font-mono overflow-auto">
                        <p><strong>Debug Info:</strong></p>
                        <p>ID: {id}</p>
                        <p>Data: {JSON.stringify(data)}</p>
                        <p>Base URL: {process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}</p>
                        <p>Timestamp: {new Date().toISOString()}</p>
                    </div>
                    <div className="mt-6">
                        <a href="/syllabus/search" className="text-blue-600 hover:underline">Return to Search</a>
                    </div>
                </div>
            </>
        );
    }

    const { doc, entries } = data;
    // Use the specific entry if requested, otherwise fallback to first
    const entry = (entries && entries.length > 0)
        ? (entryId ? entries.find((e: any) => e.id === entryId) || entries[0] : entries[0])
        : null;
    const title = entry ? entry.subjectName : doc.title;
    const code = entry ? entry.subjectCode : "";
    const credits = entry ? entry.credits : "";
    const prerequisites = entry ? entry.prerequisites : "";
    const objectives = entry ? entry.objectives : [];
    const outcomes = entry ? entry.outcomes : [];
    const topics = entry ? entry.topics : [];
    const marks = entry ? entry.marksCriteria : null;

    return (
        <>
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Modern Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Syllabus Details</h1>
                    <p className="text-slate-600 mb-4">{title}</p>
                    <a href="/syllabus/search" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to search
                    </a>
                </div>

                {/* Syllabus Content Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-black">

                    {/* Header Row */}
                    <div className="grid grid-cols-12 border-b border-black text-sm">
                        <div className="col-span-3 border-r border-black p-1 font-bold bg-slate-100">Course Code: {code}</div>
                        <div className="col-span-6 border-r border-black p-1 font-bold text-center bg-slate-100">Course Name: {title}</div>
                        <div className="col-span-3 grid grid-cols-4 text-center font-bold bg-slate-100">
                            <div className="border-r border-black">L</div>
                            <div className="border-r border-black">T</div>
                            <div className="border-r border-black">P</div>
                            <div>C</div>
                        </div>
                    </div>
                    {/* Credits Values */}
                    <div className="grid grid-cols-12 border-b border-black text-sm">
                        <div className="col-span-9 border-r border-black p-1"></div>
                        <div className="col-span-3 grid grid-cols-4 text-center">
                            <div className="border-r border-black">{credits?.split(' ')[0] || '-'}</div>
                            <div className="border-r border-black">{credits?.split(' ')[1] || '-'}</div>
                            <div className="border-r border-black">{credits?.split(' ')[2] || '-'}</div>
                            <div>{credits?.split(' ')[3] || credits || '-'}</div>
                        </div>
                    </div>

                    {/* Prerequisites */}
                    {prerequisites && (
                        <div className="border-b border-black p-1 text-sm">
                            <span className="font-bold">Pre-requisite: </span>
                            {prerequisites}
                        </div>
                    )}

                    {/* Course Objectives */}
                    {objectives && objectives.length > 0 && (
                        <div className="border-b border-black p-1 text-sm">
                            <div className="font-bold mb-1">Course Objectives:</div>
                            <ul className="list-decimal list-inside">
                                {objectives.map((obj: string, i: number) => (
                                    <li key={i}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Course Outcomes */}
                    {outcomes && outcomes.length > 0 && (
                        <div className="border-b border-black p-1 text-sm">
                            <div className="font-bold mb-1">Course Outcome:</div>
                            <div className="mb-1">After completion of the course, the student will be able to</div>
                            <ul className="list-decimal list-inside">
                                {outcomes.map((out: string, i: number) => (
                                    <li key={i}>{out}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Topics / Units */}
                    {topics.map((topic: string, i: number) => {
                        // Format: Unit X || Title || Hours || Content
                        const parts = topic.split(' || ');
                        let unit = `Unit ${i + 1}`;
                        let title = "Topic";
                        let hours = "";
                        let content = topic;

                        if (parts.length >= 4) {
                            unit = parts[0];
                            title = parts[1];
                            hours = parts[2];
                            content = parts[3];
                        } else {
                            // Fallback for old data or unexpected format
                            const p = topic.split(':');
                            title = p[0] || "Topic";
                            content = p.slice(1).join(':') || topic;
                        }

                        return (
                            <div key={i} className="border-b border-black">
                                <div className="grid grid-cols-12 bg-slate-50 border-b border-black text-sm font-bold">
                                    <div className="col-span-2 p-1 border-r border-black">{unit}</div>
                                    <div className="col-span-8 p-1 border-r border-black">{title}</div>
                                    <div className="col-span-2 p-1 text-center">{hours}</div>
                                </div>
                                <div className="p-2 text-sm text-justify whitespace-pre-wrap">
                                    {content}
                                </div>
                            </div>
                        );
                    })}

                    {/* Evaluation Scheme */}
                    {marks && (
                        <div className="border-b border-black">
                            <div className="p-1 font-bold bg-slate-100 border-b border-black text-sm">Mode of Evaluation</div>
                            <div className="grid grid-cols-12 text-center text-sm">
                                <div className="col-span-12 font-bold border-b border-black p-1">Evaluation Scheme</div>

                                {/* Header */}
                                <div className="col-span-4 border-r border-black border-b border-black p-1 font-bold">MSE</div>
                                <div className="col-span-4 border-r border-black border-b border-black p-1 font-bold">CA</div>
                                <div className="col-span-2 border-r border-black border-b border-black p-1 font-bold">ESE</div>
                                <div className="col-span-2 border-b border-black p-1 font-bold">Total</div>

                                {/* Values */}
                                <div className="col-span-2 border-r border-black p-1">MSE 1</div>
                                <div className="col-span-2 border-r border-black p-1">MSE 2</div>
                                <div className="col-span-4 border-r border-black p-1 grid grid-cols-3">
                                    <div className="border-r border-black">CA1</div>
                                    <div className="border-r border-black">CA2</div>
                                    <div>CA3(ATT)</div>
                                </div>
                                <div className="col-span-2 border-r border-black p-1 row-span-2 flex items-center justify-center font-bold">{marks['ESE'] ?? 100}</div>
                                <div className="col-span-2 p-1 row-span-2 flex items-center justify-center font-bold">{marks['Total'] ?? 200}</div>

                                {/* Marks Row */}
                                <div className="col-span-2 border-r border-black border-t border-black p-1 font-bold">{marks['MSE 1'] ?? 40}</div>
                                <div className="col-span-2 border-r border-black border-t border-black p-1 font-bold">{marks['MSE 2'] ?? 40}</div>
                                <div className="col-span-4 border-r border-black border-t border-black p-1 grid grid-cols-3">
                                    <div className="border-r border-black">{marks['CA1'] ?? 8}</div>
                                    <div className="border-r border-black">{marks['CA2'] ?? 8}</div>
                                    <div>{marks['CA3'] ?? 4}</div>
                                </div>

                                {/* Subtotals Row */}
                                <div className="col-span-4 border-r border-black border-t border-black p-1 font-bold text-center">
                                    {(marks['MSE 1'] ?? 40) + (marks['MSE 2'] ?? 40)}
                                </div>
                                <div className="col-span-4 border-r border-black border-t border-black p-1 font-bold text-center">
                                    {(marks['CA1'] ?? 8) + (marks['CA2'] ?? 8) + (marks['CA3'] ?? 4)}
                                </div>
                                <div className="col-span-4 border-t border-black p-1"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-xs text-slate-500 text-center">
                    * Data extracted from {doc.filename} (Page {entry?.sourcePage})
                </div>
            </main>
        </>
    );
}
