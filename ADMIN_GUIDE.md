# Administrator Guide

**Product:** MPC Booking  
**Audience:** Application administrators (MPC booking owners and operators)  
**Last reviewed against codebase:** August 2026  

This guide describes only features implemented in the application. Where something could not be confirmed from the codebase, that is stated explicitly.

---

## 1. Introduction

### Purpose of the application

MPC Booking is an internal booking control system with a secure client portal. Administrators create and manage shoot bookings (SB numbers), share a unique portal link with clients, collect required information and files, track status through production, and keep a full activity and version history.

### Intended users

| Role | How they access | What they do |
|------|-----------------|--------------|
| **Main administrator** | `/login` (Supabase Auth; `profiles.role = main_admin`) | Sees all bookings; can reassign ownership; manages Team roles |
| **Administrator** | `/login` (Supabase Auth; `profiles.role = admin`) | Sees/manages only bookings assigned to them (`created_by`) |
| **Client (portal user)** | Unique portal URL `/portal/[token]` (+ optional PIN) | Complete permitted fields, upload files, submit for review |

Admins are provisioned in Supabase Auth. A database trigger assigns new profiles `role = 'admin'` (scoped). Main admins can also create staff from **Team** (`/admin/team`). Bootstrap the first main admin with SQL if needed:

```sql
UPDATE public.profiles SET role = 'main_admin' WHERE email = 'you@example.com';
```

### Main capabilities

- Booking list with search, status filter, sort, pagination
- Full booking form (brand, contacts, shoot days, sites, files, notes)
- Live-format calendar and preferred shoot days
- Client portal link lifecycle (generate, PIN, expiry, lock, disable)
- Per-field portal permissions (Hidden / Read-only / Editable / Required)
- Document autofill from Excel media plans / MPC briefs (optional OpenAI)
- Files by category with status workflow
- Activity log and version compare / revert
- In-app admin notifications
- Auto-lock and missing-field email reminders (cron + manual send)
- Theme (light/dark) and account password change

---

## 2. Getting Started

### Logging in

1. Open the application URL and go to **Sign in** (`/login`).
2. Enter your **Email** and **Password**.
3. Click **Sign in**.
4. On success you land on **Bookings** (`/admin`).

**Preconditions:** Your account must exist in Supabase Auth and `profiles.role` must be `admin` or `main_admin`. Non-staff accounts are signed out with an error such as “This account is not an admin.”

**Tip:** If you were redirected to login from a deep link, after sign-in you return to that page when `?redirect=` is present.

### Password reset

- **In-app:** Header **Settings** (gear) → **Change password** (current password + new password, minimum 6 characters).
- **Forgot password / email reset link:** This behavior could not be confirmed from the codebase (no dedicated forgot-password UI). Use your organization’s Supabase Auth / IT process if needed.

### Two-factor authentication

Not available in this application.

### Dashboard overview

There is no separate analytics dashboard. After login, **Bookings** is the home page:

- Search box (SB number, campaign, client)
- Status filter
- Sort controls
- Table of bookings (SB, Campaign, Client, Status, Budget, Updated)
- **New Booking** button
- Header: **Refresh**, **Help (?)**, notifications bell, theme, settings

![Screenshot: Bookings list](screenshots/admin-bookings-list.png)

---

## 3. Navigation

Primary navigation (header on desktop; under header on mobile):

| Menu item | Path | Purpose |
|-----------|------|---------|
| **Bookings** | `/admin` | List and open bookings (scoped by role) |
| **Sent Links** | `/admin/links` | Portal URLs for accessible bookings |
| **New Booking** | `/admin/bookings/new` | Create a booking (you become owner) |
| **Team** | `/admin/team` | Main admin only — create admins; promote/demote |

Header utilities (left to right after nav):

| Control | Purpose |
|---------|---------|
| Refresh | Reloads data on the current page |
| **?** Help | Opens “How to use MPC Booking” tips |
| Bell | In-app notifications |
| Theme | Light / dark |
| Gear | Settings (account, OpenAI usage, password, sign out) |

### Bookings

**Purpose:** Find and open bookings.  
**How to access:** **Bookings** in the header.  
**Available actions:** Search, filter by status, sort, paginate (20 per page), open booking, delete with confirmation, create new.  
**Common use cases:** Daily queue of open bookings; find by SB or client.  
**Permissions required:** Admin session.

![Screenshot: Bookings](screenshots/nav-bookings.png)

### Sent Links

**Purpose:** Audit and reopen every generated client portal link.  
**How to access:** **Sent Links**.  
**Available actions:** Search; filter by portal status; **Copy**, **Open**, go to **Booking**.  
**Columns:** SB, Client/Campaign, Status, Saved Link, First Opened, Last Activity.  
**Permissions required:** Admin session.

### New Booking

**Purpose:** Create a draft booking with SB number and commercial basics.  
**How to access:** **New Booking**.  
**Available actions:** Enter fields, regenerate SB, create.  
**Permissions required:** Admin session.

### Booking workspace

**Purpose:** Full management of one booking.  
**How to access:** Click a row on Bookings, or open from Sent Links.  
**Tabs:** Details | Calendar | Portal & Permissions | Activity & Versions.  
**Permissions required:** Admin session.

![Screenshot: Booking workspace](screenshots/booking-workspace.png)

---

## 4. User Management

### Creating users

Not available for self-signup. Main admins create staff on **Team** (`/admin/team`). The schema trigger still sets new Auth users to role `admin` by default.

> Confirm with your deployment team that only intended staff receive accounts.

### Editing users

Display name (`profiles.full_name`) is used when matching **MPC Booking Owner** for notifications. Editing full names is done in the database / Supabase, not in the UI.

### Deactivating / deleting users

Not exposed in the UI. Disable or delete the Auth user in Supabase.

### Resetting passwords

Use **Settings → Change password** for the signed-in admin. Forced reset for another user is not in-app.

### Assigning roles

Use **Team** (`/admin/team`) as a main admin to:

- **Create admin** — email, temporary password, optional name, role (`admin` or `main_admin`)
- **Change roles** between `admin` and `main_admin` (cannot demote the last main admin)

Bootstrap the first main admin with SQL if none exists yet (see §1).

### Permissions (application level)

See [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) and §5.

---

## 5. Role & Permission Management

### Available roles

| Role | Access |
|------|--------|
| `main_admin` | All bookings; reassign ownership; Team page |
| `admin` | Only bookings where `created_by` is their profile id |
| Other / missing | Cannot use admin; signed out on login attempt |

**Ownership:** Creating a booking sets `created_by` to you. A main admin can change **Assigned to** on the booking detail page (updates `created_by` and syncs MPC Booking Owner name for notifications).

Portal clients are **not** Auth users; they authenticate via portal token (+ optional PIN).

### Portal field permissions

Per booking, after a portal link exists:

| Level | Effect |
|-------|--------|
| **Hidden** | Not shown to the client |
| **Read-only** | Visible; not editable |
| **Editable** | Client can change |
| **Required** | Must be filled before **Submit** |

Some fields remain server-blocked for clients even if misconfigured (for example rates, owners, SB number, internal notes).

### Best practices

1. Generate the portal link before tuning permissions.
2. Keep rates and owner fields read-only or hidden for clients.
3. Mark true blockers as **Required** so Submit validates them.
4. Revisit permissions when status moves to Approved / In Production.

---

## 6. Module Documentation

### 6.1 Bookings list

#### Purpose

Operate the booking pipeline from one searchable table.

#### Features

Search; status filter; sort; pagination; open; delete; refresh.

#### Step-by-step instructions

1. Open **Bookings**.
2. Optionally type an SB, campaign, or client name.
3. Filter by status if needed.
4. Click a row to open the workspace, or use **Delete** with confirmation.

#### Available actions

Create, open, delete, refresh.

#### Validation rules

Delete requires confirmation. List loads only for admin sessions.

#### Business rules

Statuses follow the shared booking status vocabulary (Draft → … → Cancelled).

#### Common mistakes

Deleting a booking removes related portal access — confirm SB before delete.

#### Tips

Use Refresh after a colleague’s changes if the list looks stale.

#### Related modules

New Booking; Booking workspace; Sent Links.

---

### 6.2 Create booking

#### Purpose

Start a new SB with commercial defaults.

#### Features

SB auto-suggest (`SB-YYYY-NNN`) with **Regenerate**; currency; budget; brand; campaign; client; city/market.

#### Step-by-step

1. Open **New Booking**.
2. Confirm or regenerate **SB Number** (required).
3. Fill commercial fields as known (currency is optional on create).
4. Submit create → you are taken to the booking workspace.

#### Defaults (from code)

Status `draft`; day rates 640 / 1040; label **JCD Rates**; `mpc_chooses_sites: true`; file category statuses `missing`.

#### Common mistakes

Reusing an SB number that already exists — use Regenerate.

#### Related modules

Details form; Portal & Permissions.

---

### 6.3 Booking Details (form)

#### Purpose

Capture everything needed to plan and produce the shoot.

#### Features / sections

1. **Brand and commercial** — Brand, Campaign, Reference Number, PO (+ upload), Budget, Currency; admin **MPC Booking Owner** / **Backup Owner**; **Rate card** (label, half/full day rates, optional “use remaining for extra shots”).
2. **Client and JCD contacts** — Name, Email, CC emails, JCD contact name/email.
3. **Shoot requirements** — Day length (0.5 / 1), city, preferred date; remaining budget gates adding rows.
4. **Sites** — MPC Chooses Sites toggle; Must-Shoot / Avoid lists.
5. **Format, campaign dates, files and notes** — Format type, campaign start/end, delivery due (calculated), In-Charge, portal lock date, delivery override (admin), additional notes, files.
6. **Internal Notes** — admin only (never on portal).

#### Step-by-step

1. Edit fields in the left form rail.
2. Use section nav to jump.
3. Click **Save Booking**.
4. If a version conflict appears, reload latest or resolve before saving again.

#### Validation / business rules

- Shoot rows need budget and remaining balance ≥ half-day rate.
- Delivery: Digital 5 working days / Paper & Both 8 before campaign start (weekends + holidays skipped); Other → TBC.
- In-Charge period and portal lock Friday are calculated from preferred shoot (or campaign start).
- Invoice fields such as payment terms / billing address exist in schema/permissions defaults but **have no dedicated form UI** in the current Details form.

#### Common mistakes

Adding shoot days without setting budget; expecting media-plan money to fill **Budget** (imports keep media totals out of shoot budget).

#### Tips

Save before switching tabs for long edits. Watch the remote-update banner when the client is editing live.

#### Related modules

Calendar; Files; Portal permissions.

---

### 6.4 Calendar (Shoot Schedule & Live Dates)

#### Purpose

Visualize preferred shoot days and live media-format windows.

#### Features

Month grid; today/selection states; colored live bars; clickable format badges; day detail cards; pencil **Edit day**; day modal add/edit/remove.

#### Step-by-step

1. Open the **Calendar** tab.
2. Click a day to select it; review cards below.
3. Click the **pencil** (or double-click / **Edit day**) to open the day editor.
4. Add shoot days or live format ranges as needed.
5. Click a format badge to jump to that format’s start month/day.

#### Business rules

Live formats often come from document import. Shoot days are manual (not auto-created from import).

#### Tips

Use Help (?) for a short calendar reminder. Default month is the current month.

#### Related modules

Document import; Shoot requirements.

---

### 6.5 Portal & Permissions

#### Purpose

Share a controlled client experience for one booking.

#### Features

Generate / regenerate link; copy; open; PIN set/update/remove; expiry; lock/unlock; disable/re-enable; editable-by-status rules; field permissions; auto-lock toggle; send missing-fields reminder now.

#### Step-by-step — share a portal

1. Open **Portal & Permissions**.
2. Click **Generate Link** (first time) or use existing link.
3. Optionally **Set PIN** (4–8 digits recommended by UI hint) and **Set Expiry**.
4. Configure field permissions and status editability.
5. **Copy link** and send to the client (out-of-band email/chat).
6. Optionally enable **Auto-lock** and use reminder controls.

#### Unlock behavior (important)

Unlocking sets portal active, clears editing lock, marks manual unlock, forces current booking status editable, and **turns off** booking auto-lock so cron does not immediately re-lock.

#### Portal statuses

draft, active, submitted, locked, expired, disabled.

#### Common mistakes

Sharing before setting Required fields; regenerating without telling the client (old URL stops working).

#### Related modules

Sent Links; Notifications; Cron automation.

---

### 6.6 Client portal (admin preview & client use)

#### Purpose

Let clients complete permitted data and files.

#### Features

PIN gate; auto-save; Submit; refresh; read-only banner; rate card; sections per permissions; files.

**Note:** Sites UI is **not** rendered on the portal page (admin-only). Calendar appears for **admin preview** when an admin is signed in (`viewerIsAdmin`).

#### Step-by-step (client)

1. Open the link; enter PIN if prompted.
2. Complete sections; wait for **Saved**.
3. Upload files where allowed.
4. Click **Submit** when ready for review.

#### Business rules

- Submit sets booking toward **Ready for Review** / portal submitted; does **not** by itself lock the link.
- Save may move Waiting for Client / Draft → Client Updating; may auto Ready for Review when required items complete.
- Failed PIN attempts can lock out (defaults: 5 attempts / 15 minutes) and notify admins.

#### Related modules

Portal & Permissions; Files.

---

### 6.7 Files & assets

#### Purpose

Collect and track documents by category.

#### Features

Categories in UI: Purchase Order, Media Plan, Site Lists, Creatives. Statuses: Missing, Requested, Uploaded, Under Review, Approved, Rejected, Not Required. Upload, replace, soft-delete, restore (admin), versions, preview.

#### Limits

Default max size **25MB** (`MAX_FILE_SIZE_BYTES`). Allowed MIME types include images, PDF, Office, CSV, TXT, ZIP/RAR/7Z.

#### Related modules

Document import (Media Plan Options); PO uploader on Details.

---

### 6.8 Document import (autofill)

#### Purpose

Parse Excel media plans / MPC briefs into booking fields, sites, and live calendar formats.

#### Features

Upload or parse existing files; optional OpenAI enrichment; sheet picker; review mapping; apply to form or calendar only.

#### Step-by-step

1. From Files / Media Plan **Options**, or booking import dialog.
2. Choose file(s); optionally enable OpenAI.
3. Review fields, sites, live dates.
4. Apply carefully — shoot requirements stay manual.

#### Tips

Keely-style media plans and Nike RTP-style briefs are supported shapes. Prefer cost-grid dates when both comments and costs exist.

#### Related modules

Calendar; OpenAI usage in Settings.

---

### 6.9 Activity & Versions

#### Purpose

Audit changes and recover earlier states safely.

#### Features

Activity search/grouping; before/after diffs; version list; revert full booking / one section / one field (creates a **new** version).

#### Related modules

Recent updates sidebar on booking detail.

---

### 6.10 Sent Links

See §3. Related to Portal & Permissions.

---

### 6.11 Notifications

#### Purpose

Alert admins to client and system events.

#### Features

Unread badge; list; mark read; mark all read; deep-link into booking when applicable.

#### Triggers (admin in-app)

Client opened portal; client updated booking; uploaded/removed files; completed required; portal PIN locked; reminder failed; portal auto-locked (among defined types).

Client notification **rows** can be written for status changes, but **no client notification UI** exists in the portal.

#### Related modules

Email reminders (see §10).

---

### 6.12 Settings

#### Purpose

Account and appearance.

#### Features

Email/role display; OpenAI token usage + reset counter; change password; sign out; theme via header.

No global application settings page beyond this drawer and per-booking portal automation.

---

## 7. Configuration

Environment variables operators typically configure (names only — store secrets securely):

| Setting | What it does | Default / notes | Risks |
|---------|--------------|-----------------|-------|
| `NEXT_PUBLIC_APP_URL` | Base URL for portal links | Must be public HTTPS in production | Wrong URL → broken client links |
| `NEXT_PUBLIC_SUPABASE_URL` / anon key | Auth & data | Required | Misconfig blocks login |
| `SUPABASE_SERVICE_ROLE_KEY` | Server privileged ops | Required on server | Leak = full data access |
| `MAX_FILE_SIZE_BYTES` | Upload cap | 25MB | Too low blocks large plans |
| `CRON_SECRET` | Protects cron endpoint | Required in production | Missing → cron abuse or blocked |
| `AUTO_LOCK_ENABLED` | Global auto-lock | true | false disables lock automation |
| `REMINDER_OFFSETS_DAYS` | Days before lock for emails | `7,3,1` | Wrong offsets surprise clients |
| `PORTAL_PIN_MAX_ATTEMPTS` | PIN attempts | 5 | Too low locks honest users |
| `PORTAL_PIN_LOCK_MINUTES` | Lockout duration | 15 | — |
| `PORTAL_SESSION_TIMEOUT_MINUTES` | Portal session idle | 60 | Too short frustrates clients |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Document AI | model default `gpt-4o-mini` | Cost / privacy |
| `MALWARE_SCAN_ENABLED` | Stub scanner flag | off unless true | Not a full AV product |
| `SLACK_WEBHOOK_URL` | Incoming Webhook for client message pings | Optional; unset = Slack off | Share only with trusted ops |
| Email (Gmail/Nodemailer) | Reminder & lock emails | Must use env in production | Hard-coded credentials are a deployment risk |

Per-booking configuration lives under **Portal & Permissions** (auto-lock, status editability, field permissions, PIN, expiry).

---

## 8. Workflows

### Standard booking → client review

```
Create booking (Draft)
        ↓
Complete Details + optional document import
        ↓
Generate portal link + set permissions / PIN
        ↓
Share link with client
        ↓
Client opens (notify) → Client Updating
        ↓
Client Submit / required complete → Ready for Review
        ↓
Admin reviews → Changes Requested OR Approved
        ↓
In Production → Completed (or Archived / Cancelled)
```

### Auto-lock & reminders

```
Portal lock date calculated (Friday before in-charge period)
        ↓
Reminders at configured offsets (email + in-app)
        ↓
On/after lock date: auto-lock portal (unless manual unlock / disabled / auto-lock off)
```

### Document-assisted setup

```
Upload media plan / brief
        ↓
Parse (heuristic ± OpenAI)
        ↓
Apply fields + live formats to calendar
        ↓
Manually add shoot days as needed
        ↓
Generate portal for client
```

---

## 9. Reports & Analytics

There is **no dedicated reports module** or exportable analytics dashboard in the admin UI.

Operational substitutes:

| Need | Where |
|------|-------|
| Pipeline view | Bookings list + status filter |
| Portal traffic | Sent Links (first opened, last activity) |
| Change audit | Activity & Versions |
| AI cost awareness | Settings → OpenAI usage |

---

## 10. Notifications

### In-app (admin)

Bell in header; mark read / mark all read.

### Email

Missing-field reminders and auto-lock notices to client email, JCD contact, and CC when configured. Failures can create admin `reminder_failed` notifications.

### Scheduled

Vercel cron daily (`0 8 * * *`) hits `/api/cron/portal-automation` (reminders + auto-locks).

### Manual

**Send missing-fields reminder now** on the Portal tab.

---

## 11. Data Import / Export

### Import

| Format | Use |
|--------|-----|
| `.xlsx` / `.xls` / `.csv` (parse API) | Media plan / MPC brief autofill |

**Required structure:** Heuristic detection of media-plan headers (CLIENT, CAMPAIGN, MARKET…) or brief headers (KPI, Environment, Site/Network Name). Multi-market briefs use sheets such as UK, FR, DE.

**Validation:** Size limit on parse (15MB for document parse service). Review UI before apply.

**Export:** No general CSV/Excel booking export UI was found in the codebase. File download of uploaded assets is available.

---

## 12. Security

- Admin routes guarded by proxy + `requireAdmin`
- Portal tokens hashed at rest; optional PIN with lockout
- Portal session cookie after PIN unlock
- Field-level portal permissions + server-side write filters
- Soft-deleted files; admin restore
- Activity log for audit
- Optimistic concurrency on booking save (`current_version`)
- Password change requires current password (min length 6)

---

## 13. Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for the full table.

---

## 14. FAQ

See [FAQ.md](./FAQ.md) (30+ questions).

---

## 15. Best Practices

1. Set budget and rates before inviting shoot-day edits.
2. Import media plans early; then add shoot days manually.
3. Configure Required fields before sending the portal link.
4. Prefer PIN on sensitive campaigns.
5. Use Sent Links to confirm the client opened the correct URL.
6. Do not regenerate links casually — communicate new URLs.
7. When unlocking after auto-lock, remember auto-lock is turned off until you re-enable it.
8. Resolve version conflicts with **Load latest** rather than overwriting client work blindly.
9. Keep OpenAI optional; review AI mappings before apply.
10. Sign out on shared machines; use dark/light theme for comfort only (no security impact).

---

## 16. Appendix

### Glossary

| Term | Meaning |
|------|---------|
| SB | Shoot booking reference number |
| Portal token | Secret path segment for `/portal/[token]` |
| Live format | Media live date range shown as a calendar bar |
| In-Charge | Period code (e.g. N-26) derived from shoot/campaign timing |
| Portal lock date | Friday before in-charge period; drives auto-lock |
| JCD | Agency contact fields on the booking |
| Soft-delete | File hidden but restorable by admin |

### Permissions matrix

See [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).

### Feature matrix

| Feature | Admin | Portal client |
|---------|-------|---------------|
| Create/delete bookings | Yes | No |
| Edit all fields | Yes | Permitted only |
| Sites UI | Yes | No |
| Calendar edit | Yes | View on admin preview only |
| Manage portal link | Yes | Use link |
| Document AI import | Yes | No |
| Notifications bell | Yes | No |
| Submit for review | Via status | Submit button |
| Help (?) | Yes | Yes |

### Keyboard shortcuts

No application-wide keyboard shortcut map was found. Calendar days support Enter/Space to select; day cells support double-click to edit when permitted.

### Advanced features (implemented; limited or no dedicated UI)

- Invoice-related schema fields without Details form controls
- Extra file categories in schema beyond the four shown in Files UI
- Client in-app notification records without portal inbox UI
- Cron callable with `?secret=` in development without bearer header
- Admin OpenAI usage reset counter

### Related documents

- [QUICK_START.md](./QUICK_START.md)
- [FAQ.md](./FAQ.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)
