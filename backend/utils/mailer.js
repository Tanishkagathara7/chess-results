const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('Email not configured: missing SMTP_HOST/SMTP_USER/SMTP_PASS. Skipping email send.');
    return null;
  }

  const t = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return t;
}

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

async function sendMail({ to, subject, text, html, from }) {
  const t = getTransporter();
  if (!t) {
    // Email not configured; pretend success to avoid leaking info to client
    logger.warn(`Skipped sending email to ${to} (transporter not configured). Subject: ${subject}`);
    return { skipped: true };
  }

  const mailFrom = from || process.env.SMTP_FROM || `no-reply@${new URL(process.env.BACKEND_URL || 'http://localhost:3001').hostname}`;

  try {
    const info = await t.sendMail({ from: mailFrom, to, subject, text, html });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error('Error sending email:', err);
    throw err;
  }
}

function buildResetUrl(token, frontendBase) {
  const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(to, token, options = {}) {
  const resetUrl = buildResetUrl(token, options.frontendUrl);
  const appName = process.env.APP_NAME || 'Chess Results';

  const subject = `Reset your ${appName} password`;
  const text = `You requested a password reset for your ${appName} account.

Click the link below to reset your password:
${resetUrl}

If you did not request this, you can safely ignore this email.
This link will expire in 1 hour.`;

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <h2>${appName} - Password Reset</h2>
    <p>You requested a password reset for your ${appName} account.</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p style="color:#666;font-size:12px">This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
  </div>`;

  return sendMail({ to, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  buildResetUrl,
};