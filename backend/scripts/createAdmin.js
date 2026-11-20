
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";

dotenv.config();

const createAdmin = async () => {
    try {
        const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error("Missing required environment variables.");
        }

        if (bcrypt.truncates(ADMIN_PASSWORD)) {
            throw new Error("Admin password exceeds bcrypt's 72-byte limit.");
        }

        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected.");

        const existingAdmin = await Admin.findOne({
            email: ADMIN_EMAIL.toLowerCase().trim()
        });

        if (existingAdmin) {
            console.log("An admin account with this email already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

        await Admin.create({
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: "admin"
        });

        console.log("Admin account created successfully.");
        console.log(`Admin email: ${ADMIN_EMAIL}`);
    } catch (error) {
        console.error("Admin creation failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
