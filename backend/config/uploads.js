
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";

const configuredDirectory =
    process.env.UPLOAD_DIRECTORY || "./uploads/products";

export const uploadDirectory = path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(process.cwd(), configuredDirectory);

export const publicApiUrl = (
    process.env.PUBLIC_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export function ensureUploadDirectory() {
    try {
        fs.mkdirSync(uploadDirectory, {
            recursive: true
        });

        console.log("Product image directory:", uploadDirectory);
    } catch (error) {
        console.error(
            "Failed to create product image directory:",
            error.message
        );

        throw error;
    }
}
