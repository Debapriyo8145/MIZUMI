
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Customer from "../models/Customer.js";
import { sendVerificationEmail } from "../config/mailer.js";

const VERIFICATION_TTL_MS = 30 * 60 * 1000;

const createVerificationToken = () => crypto.randomBytes(32).toString("hex");

const hashVerificationToken = token =>
    crypto.createHash("sha256").update(token).digest("hex");

const getVerificationUrl = token => {
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
        throw new Error("FRONTEND_URL is not configured.");
    }

    return `${frontendUrl.replace(/\\/$/, "")}/verify-email.html?token=${encodeURIComponent(token)}`;
};

const issueVerificationEmail = async customer => {
    const rawToken = createVerificationToken();

    customer.emailVerificationTokenHash = hashVerificationToken(rawToken);
    customer.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
    await customer.save();

    await sendVerificationEmail({
        to: customer.email,
        name: customer.name,
        verificationUrl: getVerificationUrl(rawToken)
    });
};

const COOKIE_NAME = "mizumi_customer_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const getCustomerSecret = () => {
    if (!process.env.CUSTOMER_JWT_SECRET) {
        throw new Error("CUSTOMER_JWT_SECRET is not configured.");
    }

    return process.env.CUSTOMER_JWT_SECRET;
};

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/api/v1"
});

const setCustomerCookie = (res, customer) => {

    // Clear the previous cookie scoped to customer-auth only.
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/customer-auth"
    });

    const token = jwt.sign(
        {
            customerId: customer._id.toString(),
            role: "customer"
        },
        getCustomerSecret(),
        { expiresIn: "7d" }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions());
};

/* -------------------- CUSTOMER REGISTRATION -------------------- */

export const registerCustomer = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, mobile number and password are required."
            });
        }

        const cleanName = String(name).trim();
        const cleanEmail = String(email).trim().toLowerCase();
        const cleanPhone = String(phone).trim();
        const cleanPassword = String(password);

        if (cleanName.length < 2 || cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must contain between 2 and 100 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (cleanPassword.length < 8 || Buffer.byteLength(cleanPassword, "utf8") > 72) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes."
            });
        }

        if (!/^\+?[0-9\s()-]{10,20}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid mobile number."
            });
        }

        const existingCustomer = await Customer.findOne({
            email: cleanEmail
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(cleanPassword, 12);

        const customer = await Customer.create({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password: hashedPassword,
            emailVerified: false
        });

        try {
            await issueVerificationEmail(customer);
        } catch (mailError) {
            console.error("Verification email delivery failed:", mailError.message);
            return res.status(503).json({
                success: false,
                accountCreated: true,
                message: "Your account was created, but the verification email could not be sent. Please use Resend verification email."
            });
        }

        return res.status(201).json({
            success: true,
            verificationRequired: true,
            message: "Account created. Check your inbox for the verification link."
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        console.error("Customer registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create customer account."
        });
    }
};


/* -------------------- VERIFY CUSTOMER EMAIL -------------------- */

export const verifyCustomerEmail = async (req, res) => {
    try {
        const token = String(req.body.token || "").trim();

        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({
                success: false,
                message: "This verification link is invalid or incomplete."
            });
        }

        const customer = await Customer.findOne({
            emailVerificationTokenHash: hashVerificationToken(token),
            emailVerificationExpiresAt: { $gt: new Date() },
            emailVerified: false
        }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

        if (!customer) {
            return res.status(400).json({
                success: false,
                message: "This verification link is invalid or has expired. Request a new one."
            });
        }

        customer.emailVerified = true;
        customer.emailVerificationTokenHash = undefined;
        customer.emailVerificationExpiresAt = undefined;
        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Your email has been verified. You can now sign in."
        });
    } catch (error) {
        console.error("Customer email verification error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to verify your email address."
        });
    }
};


/* -------------------- RESEND VERIFICATION EMAIL -------------------- */

export const resendCustomerVerification = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const customer = await Customer.findOne({ email })
            .select("+emailVerificationTokenHash +emailVerificationExpiresAt");

        // Keep the response identical to avoid revealing registered addresses.
        if (!customer || customer.emailVerified || customer.accountStatus !== "active") {
            return res.status(200).json({
                success: true,
                message: "If an unverified account exists for that email, a new verification link will be sent."
            });
        }

        await issueVerificationEmail(customer);

        return res.status(200).json({
            success: true,
            message: "If an unverified account exists for that email, a new verification link will be sent."
        });
    } catch (error) {
        console.error("Resend verification email error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Unable to send the verification email right now. Please try again later."
        });
    }
};


/* -------------------- CUSTOMER LOGIN -------------------- */

export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        const customer = await Customer.findOne({
            email: cleanEmail
        }).select("+password");

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const isPasswordValid = await bcrypt.compare(
            String(password),
            customer.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (customer.accountStatus !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is currently unavailable."
            });
        }

        if (!customer.emailVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email address before signing in."
            });
        }

        setCustomerCookie(res, customer);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                addresses: customer.addresses
            }
        });

    } catch (error) {
        console.error("Customer login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to log in."
        });
    }
};


/* -------------------- GET LOGGED-IN CUSTOMER -------------------- */

export const getMyCustomerProfile = async (req, res) => {
    try {
        const customer = await Customer.findById(req.customer._id);

        if (!customer || customer.accountStatus !== "active") {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        return res.status(200).json({
            success: true,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                addresses: customer.addresses,
                createdAt: customer.createdAt
            }
        });

    } catch (error) {
        console.error("Customer profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve customer profile."
        });
    }
};


/* -------------------- UPDATE CUSTOMER PROFILE -------------------- */

export const updateMyCustomerProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        const updates = {};

        if (name !== undefined) {
            const cleanName = String(name).trim();

            if (cleanName.length < 2 || cleanName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Name must contain between 2 and 100 characters."
                });
            }

            updates.name = cleanName;
        }

        if (phone !== undefined) {
            const cleanPhone = String(phone).trim();

            if (!/^\+?[0-9\s()-]{10,20}$/.test(cleanPhone)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid mobile number."
                });
            }

            updates.phone = cleanPhone;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid profile information was provided."
            });
        }

        const customer = await Customer.findOneAndUpdate(
            {
                _id: req.customer._id,
                accountStatus: "active"
            },
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                addresses: customer.addresses
            }
        });

    } catch (error) {
        console.error("Customer profile update error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to update customer profile."
        });
    }
};


/* -------------------- CUSTOMER LOGOUT -------------------- */

export const logoutCustomer = (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1"
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully."
    });
};
