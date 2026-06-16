import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

export const checkEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) throw new AppError("Email is required", 400);

        const snap = await db.collection("users").where("email", "==", email.trim().toLowerCase()).get();
        if (snap.empty) return res.json({ exists: false });

        const data = snap.docs[0].data();
        res.json({ exists: true, fullName: data.fullName || "" });
    } catch (err) { next(err); }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) throw new AppError("Email is required", 400);

        const snap = await db.collection("users").where("email", "==", email.trim().toLowerCase()).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            const token = crypto.randomBytes(48).toString("hex");
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await db.collection("users").doc(doc.id).update({
                resetPasswordToken: token,
                resetPasswordExpires: expiresAt,
            });

            const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
            const link = `${baseUrl}/reset-password?token=${token}`;
            const html = `
                <h2>Reset Your Password</h2>
                <p>You requested a password reset for your NP Car Rental account.</p>
                <p><a href="${link}" style="padding:10px 20px;background:#1C4F9C;color:#fff;border-radius:8px;text-decoration:none">Reset Password</a></p>
                <p style="margin-top:20px;color:#666">This link expires in 15 minutes. If you did not request this, you can safely ignore it.</p>
            `.trim();

            try {
                const nodemailer = (await import("nodemailer")).default;
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || "smtp.gmail.com",
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: false,
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
                await transporter.sendMail({
                    from: `"NP Car Rental" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: "Reset your password — NP Car Rental",
                    html,
                });
            } catch {
                console.log("\n=== DEV MODE — Password Reset ===\n  To:", email, "\n  Link:", link, "\n===================================\n");
            }
        }

        res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (err) {
        next(err);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) throw new AppError("Token and new password are required", 400);
        if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);

        const snap = await db.collection("users")
            .where("resetPasswordToken", "==", token)
            .get();

        if (snap.empty) throw new AppError("Invalid or expired reset link", 400);

        const doc = snap.docs[0];
        const data = doc.data();

        const expiresAt = data.resetPasswordExpires?.toDate ? data.resetPasswordExpires.toDate() : new Date(data.resetPasswordExpires);
        if (Date.now() > expiresAt.getTime()) {
            await doc.ref.update({ resetPasswordToken: null, resetPasswordExpires: null });
            throw new AppError("Reset link has expired. Please request a new one.", 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await doc.ref.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        });

        res.json({ message: "Password has been reset. You can now sign in." });
    } catch (err) {
        next(err);
    }
};
