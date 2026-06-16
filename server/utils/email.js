import nodemailer from "nodemailer";
import { verificationEmail } from "./emailTemplates.js";

function getTransporter() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function send({ to, subject, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("\n=== DEV MODE ===");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log("===================================\n");
    return;
  }

  return transporter.sendMail({
    from: `"NP Car Rental" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(email, fullName, token) {
  const baseUrl = process.env.VERIFY_EMAIL_BASE_URL || "http://localhost:5173";
  const link = `${baseUrl}/verify-email?token=${token}`;
  const html = verificationEmail(fullName, link);
  await send({ to: email, subject: "Verify your email — NP Car Rental", html });
}

export async function sendReviewRequestEmail(email, fullName, vehicleName, vehicleId) {
  const baseUrl = process.env.VERIFY_EMAIL_BASE_URL || "http://localhost:5173";
  const reviewLink = `${baseUrl}/vehicles/${vehicleId}`;
  const html = `
    <h2>How was your rental experience with ${vehicleName}?</h2>
    <p>Hi ${fullName},</p>
    <p>Your rental of <strong>${vehicleName}</strong> has been marked as returned. We'd love to hear how it went!</p>
    <p><a href="${reviewLink}" style="padding:10px 20px;background:#1C4F9C;color:#fff;border-radius:8px;text-decoration:none">Write a Review</a></p>
    <p style="margin-top:20px;color:#666">Your feedback helps the community make better choices.</p>
  `.trim();
  await send({ to: email, subject: `How was your rental experience with ${vehicleName}?`, html });
}

export async function sendOverdueNotice(email, otherPartyName, vehicleName) {
  const html = `
    <h2>Late Return Notice — ${vehicleName}</h2>
    <p>The scheduled return time for <strong>${vehicleName}</strong> has passed.</p>
    <p>Please coordinate with <strong>${otherPartyName}</strong> to arrange the return.</p>
    <p style="margin-top:20px;color:#666">NP Car Rental does not handle overtime charges. Both parties should negotiate directly.</p>
  `.trim();
  await send({ to: email, subject: `Late Return — ${vehicleName}`, html });
}
