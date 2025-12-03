
import { NextRequest, NextResponse } from "next/server";
import { connectDb, getGridFSBucket } from "@/lib/syllabus/db";
import { parsePdfAndExtract } from "@/lib/syllabus/pdfParser";
import { DocumentModel } from "@/models/syllabus/Document";
import { PageModel } from "@/models/syllabus/Page";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";

// Mark this route as dynamic to prevent pre-rendering at build time
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        await connectDb();

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ msg: "missing file" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;

        // Create temp file for pdf-parse (it expects a path)
        const tempDir = path.join(process.cwd(), "temp_uploads");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `${Date.now()}-${filename}`);
        await writeFile(tempFilePath, buffer);

        // 1. Upload to GridFS
        const bucket = getGridFSBucket();
        const uploadStream = bucket.openUploadStream(filename);

        // Write buffer to stream
        const streamPromise = new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
            uploadStream.end(buffer);
        });

        await streamPromise;

        // 2. Parse PDF
        const docData = await parsePdfAndExtract(tempFilePath);

        // 3. Save Document Metadata
        const newDoc = await DocumentModel.create({
            title: docData.title,
            filename: filename,
            metadata: { ...docData.meta, entries: docData.entries }
        });

        // 4. Save Pages
        const pageDocs = docData.pages.map(p => ({
            docId: newDoc._id,
            pageNumber: p.pageNumber,
            text: p.text,
            subject: p.subject,
            code: p.code,
            topics: p.topics
        }));
        await PageModel.insertMany(pageDocs);

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);

        return NextResponse.json({ msg: "uploaded", doc: newDoc, pages: pageDocs.length });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ msg: "error", error: String(err) }, { status: 500 });
    }
}
