# Permissions Matrix — MPC Booking

## 1. Application roles

| Capability | Main admin (`main_admin`) | Admin (`admin`) | Portal client (token ± PIN) | Unauthenticated |
|------------|---------------------------|-----------------|-----------------------------|-----------------|
| Sign in to `/admin` | Yes | Yes | No | Login page only |
| List / create bookings | All bookings | Own bookings only (`created_by`) | No | No |
| Open / edit / delete a booking | Any | Only if assigned (`created_by`) | No | No |
| Reassign booking ownership | Yes | No | No | No |
| Manage Team (create admins + roles) | Yes | No | No | No |
| Manage schedule & sites APIs | Yes (all) | Own bookings | Limited portal booking API | No |
| Generate / manage portal link | Yes (all) | Own bookings | No | No |
| Set field permissions & status editability | Yes | Own bookings | Subject to them | No |
| Upload/manage files (full) | Yes | Own bookings | Permitted categories | No |
| Document parse / OpenAI import | Yes | Yes | No | No |
| Activity & version revert | Yes | Own bookings | Sees limited recent updates only | No |
| Notifications / messages | All | Own bookings | No | No |
| Open `/portal/[token]` | Yes (preview) | Yes (preview) | Yes | With valid token |
| Submit portal form | Via status change | Via status change | Yes (when editable) | No |
| Change own password | Yes | Yes | N/A | No |
| User directory / create admins | **Team** page (create + roles) | No | N/A | N/A |

---

## 2. Portal field permission levels

| Level | Client can see | Client can edit | Blocks Submit if empty |
|-------|----------------|-----------------|------------------------|
| Hidden | No | No | No |
| Read-only | Yes | No | No |
| Editable | Yes | Yes | No |
| Required | Yes | Yes | **Yes** |

Permissions are configured per booking under **Portal & Permissions** after a link exists.

---

## 3. Default field permissions (new portal)

Defaults come from `DEFAULT_FIELD_PERMISSIONS` in code. Summary:

| Area | Typical default |
|------|-----------------|
| Client Name, Email | Required |
| Shoot requirements | Required |
| Format Type, Campaign start/end | Required |
| Brand, Campaign, Currency, Budget, PO, CC, JCD contacts, notes, files, extra-shots | Editable |
| Reference Number, In-Charge, portal lock date, rates | Read-only |
| Delivery calc/override, city_market, client_company, sites, MPC chooses sites, invoice internals, owners, status, portal controls | Hidden (default) |

Admins can change these per booking. **Server-side blocks** still prevent client writes to sensitive fields (rates, owners, SB number, internal notes, etc.) even if a permission were set incorrectly.

---

## 4. Booking status → portal editability (defaults)

| Booking status | Portal editable by default |
|----------------|----------------------------|
| Draft | Yes |
| Waiting for Client | Yes |
| Client Updating | Yes |
| Ready for Review | Yes |
| Changes Requested | Yes |
| Approved | No |
| In Production | No |
| Completed | No |
| Archived | No |
| Cancelled | No |

Overrides are stored per portal (“Editable by booking status”) and saved explicitly.

---

## 5. Portal link states

| Portal status | Typical meaning |
|---------------|-----------------|
| draft | Link record exists; not fully active |
| active | Client can use link (subject to PIN/lock rules) |
| submitted | Client has submitted |
| locked | Editing locked (manual or auto) |
| expired | Past expiry date |
| disabled | Admin disabled the link |

Additional flags: editing locked, manual unlock, expiry timestamp, PIN hash.

---

## 6. File action matrix

| Action | Admin | Portal client |
|--------|-------|---------------|
| Upload | Yes | If category/field editable |
| Replace | Yes | When permitted |
| Soft-delete | Yes | Yes, except under_review / approved |
| Restore | Yes | No |
| Set category status | Yes | No (client uploads; admin statuses) |
| View versions | Yes | Limited / admin-oriented version UI |

---

## 7. Notification / automation privileges

| Action | Who |
|--------|-----|
| Receive admin in-app notifications | Admins (owner preferred when resolvable) |
| Send missing-fields reminder now | Admin |
| Toggle auto-lock per booking | Admin |
| Run cron portal-automation | System with `CRON_SECRET` |
| Receive reminder/lock emails | Client, JCD, CC when addresses exist |

---

## 8. Best-practice permission setups

**Early briefing (client filling commercial + shoot)**  
Required: Name, Email, Format, Campaign dates, Shoot requirements.  
Editable: Budget (if appropriate), notes, files.  
Read-only: Rates, Reference, In-Charge, lock date.

**In review**  
Keep portal editable for Changes Requested; or lock if you need a freeze.

**Approved / production**  
Rely on default non-editable statuses or explicit Lock.

---

**See also:** [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) · [FAQ.md](./FAQ.md)
