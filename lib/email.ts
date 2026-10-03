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

function shell(title: string, intro: string, body: string) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8f7f5;">
      <div style="background: #fff; border-radius: 12px; padding: 40px; border: 1px solid #e8e4e0;">
        <h1 style="font-size: 22px; color: #1a1523; margin: 0 0 8px;">${title}</h1>
        <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">${intro}</p>
        ${body}
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">Sent by Playora</p>
    </div>`;
}

/** Generic transactional send; silently no-ops when SMTP is not configured (dev/demo). */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`[email skipped] ${subject} → ${to}`);
    return false;
  }
  await getTransporter().sendMail({ from: `"Playora" <${process.env.GMAIL_USER}>`, to, subject, html });
  return true;
}

export async function sendMembershipExpiryEmail(to: string, firstName: string, planName: string, daysLeft: number, clubName: string, clubPhone: string | null) {
  const when = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return sendEmail(
    to,
    `Your ${planName} membership ends ${when}`,
    shell(
      `Your ${planName} ends ${when}`,
      `Hi ${firstName}, your ${clubName} membership expires ${when}. Renew at the front desk to keep your court discount and booking window.`,
      clubPhone ? `<p style="color:#1a1523;font-size:15px;">Call or WhatsApp <strong>${clubPhone}</strong> and we'll sort it in a minute.</p>` : ""
    )
  );
}

export async function sendOrderReadyEmail(to: string, name: string, orderNo: string, clubName: string) {
  return sendEmail(to, `Order ${orderNo} is ready for pickup`, shell("Ready for pickup", `Hi ${name}, your order ${orderNo} is waiting at the ${clubName} pro shop counter.`, ""));
}

export async function sendQuoteEmail(to: string, name: string, planName: string, billing: string, amount: string, clubName: string, clubPhone: string | null) {
  return sendEmail(
    to,
    `${clubName} — your ${planName} membership quote`,
    shell(
      `${planName} membership`,
      `Hi ${name}, thanks for your interest in ${clubName}. Here is the quote we discussed.`,
      `<div style="background:#f8f7f5;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
        <p style="margin:0;color:#6b7280;font-size:13px;">${billing.toLowerCase()} billing</p>
        <p style="margin:4px 0 0;color:#1a1523;font-size:28px;font-weight:700;">${amount}</p>
      </div>
      <p style="color:#1a1523;font-size:15px;">Reply to this email${clubPhone ? ` or call <strong>${clubPhone}</strong>` : ""} to book your free trial session.</p>`
    )
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Playora" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your Playora password",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f8f7f5;">
        <div style="background: #fff; border-radius: 12px; padding: 40px; border: 1px solid #e8e4e0;">
          <h1 style="font-size: 22px; color: #1a1523; margin: 0 0 8px;">Reset your password</h1>
          <p style="color: #6b7280; font-size: 15px; margin: 0 0 24px;">Hi ${name}, we received a request to reset your Playora password.</p>
          
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
    text: `Hi ${name},\n\nReset your Playora password here: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });
}
