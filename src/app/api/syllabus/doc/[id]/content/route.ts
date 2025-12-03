
import { NextRequest, NextResponse } from "next/server";
import { connectDb, getGridFSBucket } from "@/lib/syllabus/db";
import { DocumentModel } from "@/models/syllabus/Document";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDb();
        const { id } = await params;

        const doc = await DocumentModel.findById(id);
        if (!doc) return new NextResponse("not found", { status: 404 });

        const bucket = getGridFSBucket();
        const downloadStream = bucket.openDownloadStreamByName(doc.filename);

        // Convert stream to ReadableStream for NextResponse
        const stream = new ReadableStream({
            start(controller) {
                downloadStream.on("data", (chunk) => controller.enqueue(chunk));
                downloadStream.on("end", () => controller.close());
                downloadStream.on("error", (err) => controller.error(err));
            },
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "application/pdf",
            },
        });

    } catch (err) {
        console.error(err);
        return new NextResponse("error", { status: 500 });
    }
}
