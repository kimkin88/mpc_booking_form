/**
 * Email delivery via Gmail (Nodemailer).
 * Credentials are hard-coded for local/dev use — move to env before production.
 */

import nodemailer from 'nodemailer';

const GMAIL_USER = 'visionworx305@gmail.com';
const GMAIL_APP_PASSWORD = 'ztqo npnf gbvg ypbo';

export function emailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

export function getEmailFrom() {
  return `MPC Bookings <${GMAIL_USER}>`;
}

function createGmailTransporter() {
  const pass = String(GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  if (!GMAIL_USER || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass,
    },
  });
}

/**
 * @param {{
 *   to: string|string[],
 *   subject: string,
 *   text: string,
 *   html?: string,
 * }} payload
 * @returns {Promise<{ ok: boolean, provider: string, id?: string, skipped?: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((e) => String(e || '').trim().toLowerCase())
    .filter(Boolean);

  if (!recipients.length) {
    return { ok: false, provider: 'none', error: 'No recipient email' };
  }

  const transporter = createGmailTransporter();
  if (!transporter) {
    console.info('[email] Gmail not configured — skipping send', {
      to: recipients,
      subject,
    });
    return {
      ok: true,
      provider: 'stub',
      skipped: true,
      id: `stub-${Date.now()}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: getEmailFrom(),
      to: recipients.join(', '),
      subject,
      text,
      html: html || undefined,
    });
    console.log('[email] sent:', info.response);
    return {
      ok: true,
      provider: 'gmail',
      id: info.messageId || info.response,
    };
  } catch (err) {
    console.error('[email] send error:', err);
    return { ok: false, provider: 'gmail', error: err.message };
  }
}
