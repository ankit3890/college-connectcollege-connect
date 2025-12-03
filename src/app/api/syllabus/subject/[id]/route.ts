
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/syllabus/db";
import { DocumentModel } from "@/models/syllabus/Document";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDb();
        const { id } = await params;

        const doc = await DocumentModel.findById(id);
        if (doc) {
            return NextResponse.json({ doc, entries: doc.metadata.entries || [] });
        }
        return new NextResponse("not found", { status: 404 });
    } catch (err) {
        console.error(err);
        return new NextResponse("error", { status: 500 });
    }
}
