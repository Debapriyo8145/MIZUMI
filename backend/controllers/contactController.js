import mongoose from "mongoose";
import ContactMessage from "../models/ContactMessage.js";

/* =========================================
   SUBMIT CONTACT MESSAGE
   POST /api/v1/contact
   Public (rate-limited)
========================================= */

export const submitContact = async (req, res) => {
    try {
        // Honeypot field — real users never fill this.
        // Bots do. Silently accept to avoid tipping them off.
        if (req.body.website && String(req.body.website).trim()) {
            return res.status(201).json({
                success: true,
                message: "Your message has been received."
            });
        }

        const { name, email, phone, topic, message } = req.body;

        if (
            !name?.trim() ||
            !email?.trim() ||
            !topic?.trim() ||
            !message?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide your name, email, enquiry type and message."
            });
        }

        if (message.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "Message must be at least 10 characters long."
            });
        }

        if (message.trim().length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Message cannot exceed 2000 characters."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        const contact = await ContactMessage.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || "",
            topic: topic.trim(),
            message: message.trim(),
            ipAddress: req.ip || "",
            userAgent: (req.get("user-agent") || "").slice(0, 500)
        });

        return res.status(201).json({
            success: true,
            message:
                "Thank you — your message has reached MIZUMI. We'll respond soon.",
            contact: {
                id: contact._id,
                status: contact.status,
                createdAt: contact.createdAt
            }
        });

    } catch (error) {
        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Submit contact error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send your message right now. Please try again."
        });
    }
};


/* =========================================
   LIST CONTACT MESSAGES
   GET /api/v1/contact
   Admin
========================================= */

export const listContacts = async (req, res) => {
    try {
        const {
            status,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (status && status !== "all") {
            if (!["new", "read", "replied"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status filter."
                });
            }
            filter.status = status;
        }

        if (search && search.trim()) {
            const escaped = search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");

            filter.$or = [
                { name: regex },
                { email: regex },
                { phone: regex },
                { topic: regex },
                { message: regex }
            ];
        }

        const currentPage = Number(page);
        const pageSize = Number(limit);

        if (
            !Number.isInteger(currentPage) ||
            !Number.isInteger(pageSize) ||
            currentPage < 1 ||
            pageSize < 1 ||
            pageSize > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters."
            });
        }

        const totalContacts = await ContactMessage.countDocuments(filter);

        const contacts = await ContactMessage.find(filter)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * pageSize)
            .limit(pageSize)
            .lean();

        return res.status(200).json({
            success: true,
            count: contacts.length,
            totalContacts,
            currentPage,
            totalPages: Math.ceil(totalContacts / pageSize),
            pageSize,
            contacts
        });

    } catch (error) {
        console.error("List contacts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch contact messages."
        });
    }
};


/* =========================================
   GET SINGLE CONTACT
   GET /api/v1/contact/:id
   Admin
========================================= */

export const getContact = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID."
            });
        }

        const contact = await ContactMessage.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact message not found."
            });
        }

        return res.status(200).json({
            success: true,
            contact
        });

    } catch (error) {
        console.error("Get contact error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch contact message."
        });
    }
};


/* =========================================
   UPDATE CONTACT STATUS
   PATCH /api/v1/contact/:id
   Admin
========================================= */

export const updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID."
            });
        }

        if (!["new", "read", "replied"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be new, read or replied."
            });
        }

        const contact = await ContactMessage.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact message not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Status updated.",
            contact
        });

    } catch (error) {
        console.error("Update contact status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update contact message."
        });
    }
};


/* =========================================
   DELETE CONTACT
   DELETE /api/v1/contact/:id
   Admin
========================================= */

export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID."
            });
        }

        const contact = await ContactMessage.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact message not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Contact message deleted."
        });

    } catch (error) {
        console.error("Delete contact error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete contact message."
        });
    }
};