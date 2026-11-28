import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;

    const { SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error("SMTP_USER and SMTP_PASS must be configured.");
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    return transporter;
};

export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
    const mailer = getTransporter();

    return mailer.sendMail({
        from: {
            name: "MIZUMI Aquatics",
            address: process.env.SMTP_USER
        },
        to,
        subject: "Verify your MIZUMI Aquatics email",
        text: `Hello ${name},\n\nPlease verify your email address by opening this link:\n${verificationUrl}\n\nThis link expires in 30 minutes. If you did not create this account, you can ignore this email.\n\nMIZUMI Aquatics`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#17211d">
                <h2 style="margin-bottom:8px">Welcome to MIZUMI Aquatics</h2>
                <p>Hello ${String(name).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[character]))},</p>
                <p>Please verify your email address to activate your customer account.</p>
                <p style="margin:28px 0">
                    <a href="${verificationUrl}" style="background:#123f35;color:#fff;padding:13px 22px;text-decoration:none;border-radius:6px;display:inline-block">Verify Email Address</a>
                </p>
                <p>This link expires in 30 minutes. If you did not create this account, you can ignore this email.</p>
                <p style="margin-top:30px">MIZUMI Aquatics</p>
            </div>
        `
    });
};
