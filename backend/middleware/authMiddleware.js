
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export const protectAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "admin" || !decoded.adminId) {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }

        // Confirm the admin account still exists
        const admin = await Admin.findById(decoded.adminId).select("_id email role");

        if (!admin || admin.role !== "admin") {
            return res.status(401).json({
                success: false,
                message: "Admin account is invalid or no longer active."
            });
        }

        req.admin = admin;
        next();

    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token. Please log in again."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
};
