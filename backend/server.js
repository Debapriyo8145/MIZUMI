
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import customerAuthRoutes from "./routes/customerAuthRoutes.js";
import customerAddressRoutes from "./routes/customerAddressRoutes.js";

import contactRoutes from "./routes/contactRoutes.js";

import {
    uploadDirectory,
    ensureUploadDirectory
} from "./config/uploads.js";

// =====================================================
// MIZUMI AQUATICS — EXPRESS SERVER
// =====================================================

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

// =====================================================
// SECURITY AND REQUEST MIDDLEWARE
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(helmet({
    crossOriginResourcePolicy: {
        policy: "cross-origin"
    }
}));

// =====================================================
// LOCAL PRODUCT IMAGE STORAGE
// =====================================================

// Create the upload directory if it does not exist.
ensureUploadDirectory();

// Serve product images from the local uploads directory.
app.use(
    "/uploads/products",
    express.static(uploadDirectory, {
        maxAge: "7d",
        immutable: true
    })
);

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/v1/products", productRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/customer-auth", customerAuthRoutes);
app.use("/api/v1/customer-addresses", customerAddressRoutes);
app.use("/api/v1/contact", contactRoutes);
// =====================================================
// WELCOME ROUTE
// =====================================================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to MIZUMI Aquatics API 🐠",
        version: "1.0.0"
    });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/v1/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "MIZUMI backend is running!",
        database: "Connected"
    });
});

// =====================================================
// START SERVER
// =====================================================

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log("----------------------------------------");
            console.log("🚀 MIZUMI Aquatics API is running");
            console.log(`🌐 Server: http://localhost:${PORT}`);
            console.log(`📦 API: http://localhost:${PORT}/api/v1`);
            console.log(`🖼️ Product images: ${uploadDirectory}`);
            console.log("----------------------------------------");
        });

    } catch (error) {
        console.error("❌ Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
