import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const FILE_PATH = "C:/Users/ankit/Desktop/college-connect/syllabus-tool/backend/uploads/bookbtech118092025.pdf";

async function cleanAndIngest() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env.local");
        }

        // Dynamic imports
        const { connectDb, getGridFSBucket } = await import("./src/lib/syllabus/db");
        const { parsePdfAndExtract } = await import("./src/lib/syllabus/pdfParser");
        const { DocumentModel } = await import("./src/models/syllabus/Document");
        const { PageModel } = await import("./src/models/syllabus/Page");

        console.log("Step 1: Connecting to DB...");
        await connectDb();
        console.log("Step 1: Connected.");

        // CLEANUP
        console.log("Step 2: Cleaning up old data...");
        await DocumentModel.deleteMany({});
        await PageModel.deleteMany({});
        console.log("Step 2: Database cleared.");

        if (!fs.existsSync(FILE_PATH)) {
            console.error("File not found:", FILE_PATH);
            return;
        }

        const filename = path.basename(FILE_PATH);
        const buffer = fs.readFileSync(FILE_PATH);

        // Upload to GridFS
        console.log("Step 3: Uploading to GridFS...");
        const bucket = getGridFSBucket();
        // Optional: Clean old files in GridFS if needed, but for now just upload new one

        const uploadStream = bucket.openUploadStream(filename);
        const streamPromise = new Promise((resolve, reject) => {
            uploadStream.on("finish", resolve);
            uploadStream.on("error", reject);
            uploadStream.end(buffer);
        });
        await streamPromise;
        console.log("Step 3: Uploaded to GridFS");

        // Parse PDF
        console.log("Step 4: Parsing PDF...");
        const docData = await parsePdfAndExtract(FILE_PATH);
        console.log("Step 4: PDF Parsed. Pages:", docData.pages.length);

        // Save Document Metadata
        console.log("Step 5: Saving Metadata...");
        const newDoc = await DocumentModel.create({
            title: docData.title || "Manual Upload",
            filename: filename,
            uploadedAt: new Date(),
            metadata: {
                entries: docData.entries
            }
        });
        console.log("Step 5: Document created with ID:", newDoc._id);

        // Save Pages
        console.log("Step 6: Saving Pages...");
        const pageDocs = docData.pages.map((p: any) => ({
            docId: newDoc._id,
            pageNumber: p.pageNumber,
            text: p.text,
            subject: p.subject,
            code: p.code,
            topics: p.topics
        }));

        await PageModel.insertMany(pageDocs);
        console.log(`Step 6: Saved ${pageDocs.length} pages.`);

        console.log("SUCCESS: Clean ingestion complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

cleanAndIngest();
