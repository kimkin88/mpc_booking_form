/**
 * Optional Slack Incoming Webhook alerts (server-only).
 * Set SLACK_WEBHOOK_URL in the environment to enable.
 */

export function isSlackConfigured() {
  return Boolean(String(process.env.SLACK_WEBHOOK_URL || '').trim());
}

/**
 * Post a simple text/blocks payload to the configured webhook.
 * No-ops when SLACK_WEBHOOK_URL is unset. Never throws to callers.
 */
export async function postSlackWebhook(payload) {
  const url = String(process.env.SLACK_WEBHOOK_URL || '').trim();
  if (!url) return { skipped: true };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Slack webhook failed', res.status, text.slice(0, 200));
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (err) {
    console.error('Slack webhook error', err);
    return { ok: false, error: err.message };
  }
}

/** Notify admins in Slack when a client sends a booking message. */
export async function notifySlackClientMessage({ booking, senderName, body }) {
  if (!isSlackConfigured()) return { skipped: true };

  const sb = booking?.sb_number || 'Booking';
  const campaign = booking?.campaign_name ? ` · ${booking.campaign_name}` : '';
  const who = senderName || 'Client';
  const preview = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 280);
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const link =
    booking?.id && appUrl ? `\n<${appUrl}/admin/bookings/${booking.id}|Open booking>` : '';

  return postSlackWebhook({
    text: `New client message on ${sb}${campaign}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New client message', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${sb}*${campaign}\n*From:* ${who}\n>${preview || '_(empty)_'}${link}`,
        },
      },
    ],
  });
}
