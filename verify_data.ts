import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Ensure MONGODB_URI is set
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in .env.local");
    process.exit(1);
}

async function verify() {
    try {
        // Dynamic imports
        const { connectDb } = await import("./src/lib/syllabus/db");
        const { PageModel } = await import("./src/models/syllabus/Page");
        const { DocumentModel } = await import("./src/models/syllabus/Document");

        await connectDb();
        console.log("Connected to DB");

        const q = "MA101L";
        console.log(`Searching for '${q}'...`);

        // 1. Find raw page first
        const rawPage = await PageModel.findOne({
            $or: [
                { text: { $regex: q, $options: "i" } },
                { code: { $regex: q, $options: "i" } }
            ]
        });

        if (rawPage) {
            console.log("Raw Page found.");
            console.log("Raw docId:", rawPage.docId);

            if (rawPage.docId) {
                const doc = await DocumentModel.findById(rawPage.docId);
                console.log("Manual findById result:", doc ? doc.title : "null");
            }
        } else {
            console.log("No page found for query.");
        }

        // 2. Try populate
        const pages = await PageModel.find({
            $or: [
                { text: { $regex: q, $options: "i" } },
                { code: { $regex: q, $options: "i" } }
            ]
        }).limit(5).populate("docId");

        console.log(`Found ${pages.length} pages`);

        if (pages.length > 0) {
            const p = pages[0];
            const doc = p.docId as any;

            if (!doc) {
                console.error("Page found but docId is null!");
            } else {
                console.log(`Page points to Document ID: ${doc._id}`);
                console.log(`Document Title: ${doc.title}`);

                // Try to find the document directly
                const foundDoc = await DocumentModel.findById(doc._id);
                if (foundDoc) {
                    console.log("SUCCESS: Document found by ID directly.");
                } else {
                    console.error("FAILURE: Document NOT found by ID directly.");
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

verify();
