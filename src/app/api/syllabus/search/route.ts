
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/syllabus/db";
import { PageModel } from "@/models/syllabus/Page";
import { DocumentModel } from "@/models/syllabus/Document"; // Ensure schema is registered

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDb();

        const searchParams = req.nextUrl.searchParams;
        const q = searchParams.get("q") || "";

        if (!q) return NextResponse.json({ q, results: [] });

        // Full text search on Pages
        // Full text search on Pages
        let pages = await PageModel.find(
            { $text: { $search: q } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(100)
            .populate("docId", "title metadata");

        // Fallback to Regex if no results (Text index might be lagging or not matching)
        if (pages.length === 0) {
            console.log("Text search empty, trying regex...");
            pages = await PageModel.find({
                $or: [
                    { text: { $regex: q, $options: "i" } },
                    { code: { $regex: q, $options: "i" } },
                    { subject: { $regex: q, $options: "i" } }
                ]
            })
                .limit(50)
                .populate("docId", "title metadata");
        }

        // Group by Subject Code
        const groupedResults = new Map<string, any>();

        for (const p of pages) {
            const doc = p.docId as any;
            if (!doc) continue;

            const entries = doc.metadata?.entries || [];
            const entry = entries.find((e: any) => e.subjectCode === p.code);

            const key = p.code || p.subject || p._id.toString();

            const resultItem = {
                ref: `${doc._id}::${p.pageNumber}`,
                id: doc._id,
                entryId: entry?.id,
                matchData: {
                    metadata: {
                        title: doc.title,
                        subject: p.subject,
                        code: p.code,
                        pageNumber: p.pageNumber,
                        text: p.text.substring(0, 200) + "..."
                    }
                }
            };

            if (!groupedResults.has(key)) {
                groupedResults.set(key, resultItem);
            }
        }

        const results = Array.from(groupedResults.values()).slice(0, 20);

        return NextResponse.json({ q, results });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ msg: "error" }, { status: 500 });
    }
}
