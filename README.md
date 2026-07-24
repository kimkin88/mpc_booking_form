# MPC Booking — Client-Editable Booking Form

Secure booking management for the internal admin team, with a shareable client portal for permitted edits, multi-file uploads, activity history, and version revert.

## Tech stack

- **Next.js** (App Router) + **JavaScript**
- **Styled Components**
- **Radix UI**
- **Supabase** (Auth, Postgres, Storage, RLS)
- **ESLint** + **Prettier**

## Features

- Full admin booking form (reference, client, JCD contact, schedule, sites, invoice, notes)
- Field-level client permissions (hidden / read-only / editable / required)
- Secure portal links with token-only client access, lock/disable/expiry controls
- Multi-file uploads per category with drag-and-drop, replace, soft-delete, restore, versions
- Immutable activity log with filters and before/after diffs
- Optimistic concurrency via booking version numbers
- Version history with full/section/field/file revert (creates a new version)
- In-app notifications for portal and file events
- Near-realtime admin ↔ portal sync (fields, shoots, files, lock/permissions)
- Auto-lock + missing-field reminders (cron)

## How to use

See **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** for admin and client step-by-step flows.

1. Node.js 20+
2. A [Supabase](https://supabase.com) project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in values from Supabase → **Settings → API**:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**server only**) |
| `NEXT_PUBLIC_APP_URL` | Public app origin used in portal links (e.g. `https://your-domain.com`). Required on Vercel — do not leave as `localhost` in production. |

Optional:

- `MAX_FILE_SIZE_BYTES` (default `26214400` / 25MB)
- `MALWARE_SCAN_ENABLED` (default off — see assumptions)
- `CRON_SECRET` — shared secret for `/api/cron/portal-automation` (Vercel Cron uses `Authorization: Bearer <CRON_SECRET>`)
- `AUTO_LOCK_ENABLED` — default `true`; set `false` to disable auto-lock globally
- `REMINDER_OFFSETS_DAYS` — default `3,1` (days before lock date to send missing-field reminders)
- Gmail credentials are currently hard-coded in `lib/email.js` for local use (`GMAIL_USER` / app password). Move to env before production.

### 3. Database & storage

In the Supabase SQL editor, run:

```text
supabase/migrations/001_initial_schema.sql
```

Safe to re-run. Creates tables, RLS policies, the `booking-files` storage bucket, portal tokens, per-portal field permissions, and an auth trigger that creates an admin profile on signup.

### 4. Admin login (Supabase Auth)

Admin access uses **Supabase Auth** (not a local password file).

1. In the [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Users**, create a user (email + password).
2. The `handle_new_user` trigger inserts a row into `profiles` with `role = 'admin'`.
3. Open `/login` and sign in with that **email** and **password**.

Optional: set the display name after creating the user:

```sql
UPDATE profiles SET full_name = 'Admin User' WHERE email = 'admin@example.com';
```

While logged in, use **Change password** in Settings to update the Supabase Auth password (minimum 6 characters).

Required env vars (already used for data):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; portal + privileged writes)

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/admin`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |

## Project structure

```text
app/                  # App Router pages & API routes
components/           # UI, layout, booking, files, portal, activity
features/             # Feature hooks
hooks/                # Shared React hooks
lib/                  # Supabase clients, constants, permissions, validation, crypto
services/             # Business logic (booking, portal, files, activity, versions, revert)
styles/               # Theme, global styles, styled-components registry
contexts/             # Auth provider
utils/                # Formatters & helpers
supabase/migrations/  # SQL schema + RLS
public/               # Static assets
```

## Admin workflow

1. Create a booking (`SB Number` + currency required; **MPC Chooses Sites** defaults to on)
2. Fill sections and save
3. Configure client field permissions
4. Generate portal link → copy / preview → send the unique link to the client
5. Client updates permitted fields and uploads files
6. Client submits → status becomes **Ready for Review** (portal stays open)
7. Review activity, compare versions, revert if needed
8. Lock or disable the portal when complete

## Client portal

- URL: `/portal/[token]`
- Scoped to one booking; token is unguessable and hashed at rest
- No client login is required; the unique link is the only credential
- Save Progress and Submit **do not** lock, expire, or invalidate the link
- Internal notes, admin controls, and full activity log are never exposed
- Client file removal is a soft-delete (admin can restore)

## Security notes

- Service role key is used only in server routes — never shipped to the browser
- Portal access is validated in API routes using the hashed unique token; clients have no direct table JWT
- File downloads use signed, time-limited Storage URLs
- File uploads use signed Storage upload URLs (browser → Supabase), so large files work on Vercel
- Portal tokens are SHA-256 hashed before storage
- Server re-validates field permissions on every client write

## Assumptions (open decisions from the requirements)

1. **Default client-editable fields:** campaign details, client contacts, schedule, sites, invoice/PO, files, client notes. JCD contact & budget default to read-only. Internal notes / portal / status stay hidden.
2. **Client file deletion:** soft-delete only; clients may remove their own uploads.
3. **Max file size:** 25MB. Allowed types: common images, PDF, Office docs, CSV, TXT, ZIP/RAR/7Z. Uploads go **direct to Supabase Storage** (signed URLs) so they work on Vercel despite the 4.5MB serverless body limit.
4. **Booking status → portal editability:** configurable per portal (defaults: editable through review/changes; read-only after approval/completion).
5. **Automated portal lock:** enabled when `portal_lock_date` is set (from campaign start / in-charge). Daily cron + lazy lock on portal open. Per-booking toggle available. Reminder offsets default to 3 and 1 days before lock.
6. **Client access:** token-only via the unique link.
7. **File version history:** admin-only.
8. **Comments:** booking-level client notes only (no per-field comments).
9. **Submit:** does **not** auto-lock editing.
10. **Audit retention:** indefinite (no auto-purge).
11. **Client identity:** single portal identity per booking via the unique link, not multi-user client accounts.
12. **Notifications:** persisted in-app; email via Gmail (Nodemailer) when `GMAIL_USER` + `GMAIL_APP_PASSWORD` are set (otherwise stubbed/logged).
13. **Malware scanning:** stubbed behind `MALWARE_SCAN_ENABLED` — wire a real engine before production.

## Acceptance criteria coverage

| Area | Covered |
|---|---|
| Portal generate / copy / regenerate / lock / unlock / disable | Yes |
| Portal stays open after save & submit; no default expiry | Yes |
| MPC Chooses Sites default `true` + logged changes | Yes |
| Multi-file per category, add more, restore, versions | Yes |
| Activity log + actor/source + before/after | Yes |
| Revert field/section/file/full version (new version) | Yes |
| Internal notes never in portal; server-side permission checks | Yes |
