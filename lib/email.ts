/**
 * lib/email.ts
 *
 * Nodemailer-based email utility using Gmail SMTP.
 * Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env
 * (use a Gmail App Password, not your regular password).
 */

import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"LDXODOO" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your LDXODOO password",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8f7f5;">
        <div style="background: #fff; border-radius: 12px; padding: 40px; border: 1px solid #e8e4e0;">
          <h1 style="font-size: 22px; color: #1a1523; margin: 0 0 8px;">Reset your password</h1>
          <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">Hi ${name}, we received a request to reset your LDXODOO password.</p>
          
          <a href="${resetUrl}" 
             style="display: inline-block; background: #714B67; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
            Reset Password
          </a>
          
          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px;">This link expires in <strong>1 hour</strong>.</p>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #f0ece8; margin: 28px 0 20px;" />
          <p style="color: #d1ccc8; font-size: 12px; margin: 0;">
            Or copy this link: <span style="color: #714B67;">${resetUrl}</span>
          </p>
        </div>
      </div>
    `,
    text: `Hi ${name},\n\nReset your LDXODOO password here: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });
}
