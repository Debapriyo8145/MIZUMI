
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import Admin from "../models/Admin.js";

dotenv.config();

const rl = readline.createInterface({ input, output });

const resetPassword = async () => {
    try {
        const email = (await rl.question("Enter your admin email: "))
            .trim()
            .toLowerCase();

        const password = await rl.question("Enter your new admin password: ");

        if (!email || !password) {
            throw new Error("Email and password are required.");
        }

        if (Buffer.byteLength(password, "utf8") > 72) {
            throw new Error("Password must be 72 bytes or fewer.");
        }

        if (password.length < 12) {
            throw new Error("Use a password with at least 12 characters.");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        const admin = await Admin.findOne({ email });

        if (!admin) {
            throw new Error("No admin account found with that email.");
        }

        admin.password = await bcrypt.hash(password, 12);
        await admin.save();

        console.log("Admin password reset successfully.");

    } catch (error) {
        console.error("Password reset failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
};

resetPassword();
