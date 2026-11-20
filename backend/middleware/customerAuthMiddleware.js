
import jwt from "jsonwebtoken";
import Customer from "../models/Customer.js";


/* -------------------- PROTECT CUSTOMER ROUTES -------------------- */

export const protectCustomer = async (req, res, next) => {
    try {
        const token = req.cookies?.mizumi_customer_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue."
            });
        }

        if (!process.env.CUSTOMER_JWT_SECRET) {
            throw new Error("CUSTOMER_JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(
            token,
            process.env.CUSTOMER_JWT_SECRET
        );

        if (
            decoded.role !== "customer" ||
            !decoded.customerId
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid customer authentication."
            });
        }

        const customer = await Customer.findById(
            decoded.customerId
        ).select("_id name email phone addresses accountStatus");

        if (!customer || customer.accountStatus !== "active") {
            return res.status(401).json({
                success: false,
                message: "Customer account is unavailable. Please log in again."
            });
        }

        req.customer = customer;

        return next();

    } catch (error) {

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            res.clearCookie("mizumi_customer_token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/v1"
            });

            return res.status(401).json({
                success: false,
                message: "Your session has expired. Please log in again."
            });
        }

        console.error("Customer authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
};


/* -------------------- OPTIONAL CUSTOMER AUTH -------------------- */

// Used by checkout.
// Guests can still place orders.
// Logged-in customers have their orders linked to their accounts.

export const optionalProtectCustomer = async (req, res, next) => {

    const token = req.cookies?.mizumi_customer_token;

    if (!token) {
        return next();
    }

    try {

        if (!process.env.CUSTOMER_JWT_SECRET) {
            throw new Error("CUSTOMER_JWT_SECRET is not configured.");
        }

        const decoded = jwt.verify(
            token,
            process.env.CUSTOMER_JWT_SECRET
        );

        if (
            decoded.role !== "customer" ||
            !decoded.customerId
        ) {
            return next();
        }

        const customer = await Customer.findById(
            decoded.customerId
        ).select("_id name email phone addresses accountStatus");

        if (customer && customer.accountStatus === "active") {
            req.customer = customer;
        }

        return next();

    } catch (error) {

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            res.clearCookie("mizumi_customer_token", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/v1"
            });

            return next();
        }

        console.error("Optional customer authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify customer session."
        });
    }
};
