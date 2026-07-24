# MPC Booking — How to use

This guide covers the admin workspace and the client portal.

---

## Quick overview

| Who | Where | What they do |
|---|---|---|
| **MPC admin** | `/login` → `/admin` | Create bookings, set rates/budget, manage portal link, review changes |
| **Client / JCD** | Portal link (unique URL) | Fill allowed fields, upload files, submit for review |

Changes sync both ways every few seconds while the page is open. You do **not** need to refresh constantly.

---

## Admin: day-to-day flow

### 1. Sign in
1. Open `/login`
2. Use your Supabase Auth email + password

### 2. Create a booking
1. Go to **Bookings** → **New booking**
2. Save a unique **Reference Number** (or accept the generated `SB-…` value)
3. Open the booking

### 3. Fill the form (Details tab)

**Section 1 — Brand and commercial**
- Brand, Campaign, Reference, Budget, Currency, PO number
- Upload PO documents
- (Admin) Adjust rate card if this client is not on default JCD rates (640 / 1040)

**Section 2 — Contacts**
- Name + Email (required)
- Team / CC emails (add multiple)
- JCD contact name + email

**Section 3 — Shoot requirements**
- Always starts with one row: **Shoot Day Length → City → Preferred Shoot Date**
- Click **Save row** / **+** to add another row when budget allows
- Remaining budget is shown live; options that would exceed budget are hidden

**Section 4 — Format, dates, files, notes**
- Format Type (Digital / Paper / Both / Other)
- Campaign start + end (delivery date + In-Charge + portal lock date calculate automatically)
- Upload Media Plan, Site Lists, Creatives
- Additional notes

**Section 5 — Calendar**
- Prefer the **Calendar** tab to see preferred shoot dates on a month grid

### 4. Save
- Click **Save** in the footer when you see **Unsaved changes**
- If the portal updated while you were editing, a banner appears: **Load latest** before saving so you do not overwrite client work

### 5. Share with the client
1. Open **Portal & Permissions**
2. **Generate** the portal link (copy it)
3. Optionally set a PIN
4. Adjust field permissions if needed (hidden / read-only / editable / required)
5. Review **Auto-lock & reminders**
   - Lock date is calculated from campaign start (7 days before in-charge)
   - Reminders go out 3 days and 1 day before lock (when cron + email are configured)
   - You can **Send missing-fields reminder now**

### 6. Review client work
- **Recent updates** sidebar shows live client (or admin) activity
- **Activity & Versions** tab for full history and revert
- When ready, change **Booking Status** (e.g. Ready for Review → Approved)

### 7. Lock / unlock
- Manual lock: Portal tab → **Lock (read-only)**
- Automatic lock: on the calculated lock date (unless auto-lock is turned off for that booking)
- Unlock anytime from the Portal tab

---

## Client portal: day-to-day flow

### 1. Open the link
- Use the unique URL from MPC
- Enter PIN if prompted

### 2. Fill what you can
- Only editable fields can be changed
- Progress **auto-saves** (look for **Saving…** / **Saved** in the header)
- Upload multiple files per category (PO, Media Plan, Site Lists, Creatives)

### 3. Shoot days
- Complete at least one shoot row
- Add more with **+** only when remaining budget allows

### 4. Submit
- Click **Submit** when ready for MPC review
- You can keep using the same link afterward unless MPC locks it

### 5. Refresh
- Use the refresh icon in the header to pull the latest admin changes
- Live updates also arrive automatically every few seconds

---

## Live sync (admin ↔ portal)

While both sides have the booking open:

- Field edits, shoot rows, files, permissions, and lock state refresh within a few seconds
- If you are mid-edit, your typing is kept; other data (files, schedule, lock, read-only fields) still updates
- Toasts appear when remote changes land (throttled so they do not spam)

**Tips**
- Leave the tab visible for fastest sync
- Admins: if you see **Remote updates**, click **Load latest** before Save
- Clients: wait for **Saved** before closing the tab

---

## Automatic lock & reminders

1. Set **Campaign Start Date** → system calculates In-Charge + **portal lock date**
2. Cron job runs daily (`/api/cron/portal-automation`)
3. Missing-field emails at 3 days and 1 day before lock (needs `GMAIL_USER` + `GMAIL_APP_PASSWORD`)
4. On lock day the portal becomes **read-only** (still viewable)

Configure on the server:
- `CRON_SECRET`
- Gmail via Nodemailer (credentials in `lib/email.js` for now)
- `REMINDER_OFFSETS_DAYS` (default `3,1`)
- `AUTO_LOCK_ENABLED` (default `true`)

---

## Common issues

| Problem | What to try |
|---|---|
| Client cannot edit | Check portal lock, PIN, status editability, field permissions |
| Shoot **+** disabled | Remaining budget is below the half-day rate |
| Delivery shows TBC | Format is **Other** — MPC must confirm or override |
| Reminder not emailed | Set Resend keys; check reminder history on Portal tab |
| Save conflict | Click **Load latest**, then re-apply your edits and save |

---

## Status meanings (typical)

- **Draft** — internal setup
- **Waiting for Client / Client Updating** — portal in use
- **Ready for Review** — client submitted
- **Changes Requested** — send client back to edit
- **Approved / In Production / Completed** — usually read-only for portal by default
