import mongoose from "mongoose";
import ContactMessage from "../models/ContactMessage.js";
import nodemailer from "nodemailer";

/* =========================================
   SUBMIT CONTACT MESSAGE
   POST /api/v1/contact
   Public (rate-limited)
========================================= */
const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

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

/* =========================================
   REPLY TO CUSTOMER
   POST /api/v1/contact/:id/reply
   Admin only
========================================= */


export const replyToContact = async (req, res) => {
    try {
        const { id } = req.params;
        const message = String(req.body.message || "").trim();

        // Validate contact ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID."
            });
        }

        // Validate reply
        if (!message || message.length < 2 || message.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Reply must contain 2–5000 characters."
            });
        }

        // Check email configuration
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            return res.status(503).json({
                success: false,
                message: "Email service is not configured."
            });
        }

        // Find customer message
        const contact = await ContactMessage.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Customer message not found."
            });
        }

        const senderName =
            process.env.CONTACT_FROM_NAME || "MIZUMI Aquatics";

        const sentAt = new Date();

        // Save reply before attempting email delivery
        contact.replies.push({
            message,
            sentAt,
            sentBy: req.admin?.email || "admin",
            emailStatus: "pending"
        });

        const replyRecord = contact.replies[
            contact.replies.length - 1
        ];

        contact.status = "replied";
        contact.lastRepliedAt = sentAt;

        await contact.save();

        // Escape HTML to prevent injected markup
        const escapeHtml = (value) =>
            String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        const safeName = escapeHtml(contact.name);
        const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

        let emailResult;

        // Attempt email delivery
        try {
            emailResult = await mailTransporter.sendMail({
                from: {
                    name: senderName,
                    address: process.env.GMAIL_USER
                },
                to: contact.email,
                replyTo: process.env.GMAIL_USER,
                subject: `Re: ${contact.topic} | MIZUMI Aquatics`,
                text:
                    `Hello ${contact.name},\n\n` +
                    `${message}\n\n` +
                    `Regards,\nMIZUMI Aquatics`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#263b35;line-height:1.7">
                        <h2 style="color:#173f35">MIZUMI Aquatics</h2>
                        <p>Hello ${safeName},</p>
                        <p>${safeMessage}</p>
                        <br>
                        <p>Regards,<br><strong>MIZUMI Aquatics</strong></p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error("Email delivery failed:", emailError);

            replyRecord.emailStatus = "failed";

            try {
                await contact.save();
            } catch (saveError) {
                console.error("Failed to save email failure status:", saveError);
            }

            return res.status(502).json({
                success: false,
                message: "Email delivery failed. The reply has been saved but was not sent."
            });
        }

        // Email sent successfully — update delivery record
        replyRecord.emailStatus = "sent";
        replyRecord.emailMessageId = emailResult.messageId || "";

        try {
            await contact.save();
        } catch (saveError) {
            console.error("Email sent but delivery status update failed:", saveError);

            return res.status(202).json({
                success: true,
                emailSent: true,
                message: "Email sent, but delivery status could not be updated. The reply remains pending in the database."
            });
        }

        return res.status(200).json({
            success: true,
            emailSent: true,
            message: "Reply sent successfully.",
            emailMessageId: emailResult.messageId,
            contact
        });

    } catch (error) {
        console.error("Customer reply error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process the email reply."
        });
    }
};

