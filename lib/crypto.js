import bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';

const BCRYPT_ROUNDS = 12;

export function generatePortalToken() {
  return nanoid(48);
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenPrefix(token) {
  return token.slice(0, 8);
}

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), BCRYPT_ROUNDS);
}

export async function verifyPin(pin, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(pin), hash);
}

export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function buildPortalUrl(token) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/portal/${token}`;
}

function uploadTicketSecret() {
  return (
    process.env.UPLOAD_TICKET_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-upload-ticket-secret'
  );
}

/** Signed ticket proving the server authorized a specific storage upload slot. */
export function signUploadTicket(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', uploadTicketSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyUploadTicket(ticket, maxAgeMs = 2 * 60 * 60 * 1000) {
  if (!ticket || typeof ticket !== 'string' || !ticket.includes('.')) {
    throw new Error('Invalid upload ticket');
  }
  const [body, sig] = ticket.split('.');
  const expected = createHmac('sha256', uploadTicketSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid upload ticket signature');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.exp || Date.now() > payload.exp) {
    throw new Error('Upload ticket expired');
  }
  // Reject tickets minted with an absurdly long lifetime
  if (payload.exp - Date.now() > maxAgeMs) {
    throw new Error('Upload ticket lifetime is invalid');
  }
  return payload;
}
