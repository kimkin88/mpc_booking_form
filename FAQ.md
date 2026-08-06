# FAQ — MPC Booking Administrators

Answers are based on the current codebase. If something could not be confirmed, that is stated.

---

### 1. Who can use the admin application?
Staff with a Supabase Auth account whose `profiles.role` is `admin`.

### 2. How do I create another administrator?
Not in the UI. Create a user in Supabase Auth; the profile trigger assigns admin role. Confirm with your deployment process.

### 3. Is there two-factor authentication?
No.

### 4. How do I change my password?
Header **Settings** (gear) → **Change password**. Minimum 6 characters; current password required.

### 5. I forgot my password. What now?
No forgot-password screen was found in the app. Use your organization’s Supabase / IT reset process.

### 6. What does the Refresh button do?
Reloads data registered for the current page (bookings list, sent links, booking detail, activity/versions).

### 7. What does the ? button do?
Opens an in-app **How to use** guide (admin tips). Clients see a portal-specific guide on their header.

### 8. How are SB numbers assigned?
Suggested as `SB-YYYY-NNN` on create; you can **Regenerate** before saving.

### 9. Can two bookings share an SB number?
They should not. Creation validation rejects conflicts — use Regenerate if needed.

### 10. What booking statuses exist?
Draft, Waiting for Client, Client Updating, Ready for Review, Changes Requested, Approved, In Production, Completed, Archived, Cancelled.

### 11. Does Submit lock the portal?
No. Submit marks the booking ready for review / portal submitted. Locking is separate (manual lock, disable, expiry, or auto-lock).

### 12. Can clients keep editing after Submit?
Yes, unless the link is locked, disabled, expired, or the current status is marked not editable in status rules.

### 13. What does Unlock do to auto-lock?
Unlock turns **off** that booking’s auto-lock so cron does not immediately lock again. Re-enable auto-lock if you still want it.

### 14. How is the portal lock date calculated?
Friday strictly before the in-charge period start, derived from the earliest preferred shoot date (else campaign start).

### 15. What is In-Charge?
A period code (for example N-26) from the configured cycle starting `2025-12-29` in 14-day steps.

### 16. Why can’t the client add a shoot day?
Usually insufficient remaining budget vs half-day rate, or the field is not Editable/Required, or the portal is read-only.

### 17. Why didn’t import fill Budget?
Media-plan totals are kept out of shoot **Budget** by design; they may appear in internal notes.

### 18. Do imports create shoot days?
No. Imports create live format calendar ranges (and fields/sites). Shoot days are manual.

### 19. Which Excel layouts are supported?
Media plans (CLIENT / CAMPAIGN / MARKET + start/end) and MPC briefs (KPI / Environment / Site/Network Name + periods), e.g. Keely OOH and Nike RTP shapes.

### 20. Is OpenAI required for import?
No. Heuristic parsing works alone. OpenAI is optional when `OPENAI_API_KEY` is set.

### 21. Where do I see AI token usage?
Settings → OpenAI usage. You can reset the counter.

### 22. How large can uploads be?
Default 25MB (`MAX_FILE_SIZE_BYTES`). Document parse service allows up to 15MB per parse request.

### 23. Can clients delete approved files?
Clients cannot remove files that are under review or approved (soft-delete rules). Admins can restore soft-deleted files.

### 24. What file categories appear in the UI?
Purchase Order, Media Plan, Site Lists, Creatives. Additional categories exist in schema but are not shown in the current Files section list.

### 25. How do field permissions work?
Hidden / Read-only / Editable / Required per field, after a portal exists. Required fields block Submit until filled.

### 26. Why can a client still not edit a field I set Editable?
Some fields are server-blocked (rates, owners, SB number, internal notes, etc.). Also check lock / status editability.

### 27. Where do I find every portal link?
**Sent Links** in the header nav.

### 28. What happens if I Regenerate the link?
A new token is issued; the old URL stops working. Tell the client.

### 29. How do reminders work?
Offsets default to 7, 3, and 1 days before the portal lock date. Cron runs daily; you can also send a reminder manually from the Portal tab.

### 30. Who receives reminder emails?
Client email, JCD contact, and CC emails when present. If none, admins may get a reminder_failed notification.

### 31. Is there a reports dashboard?
No dedicated reports module. Use Bookings filters, Sent Links, and Activity/Versions.

### 32. Can I export bookings to Excel?
No booking export UI was found in the codebase.

### 33. How does live sync work?
Admin booking pages poll about every 3 seconds while visible; portal auto-saves. Use Refresh or Load latest if prompted.

### 34. What is a version conflict?
Someone else (often the client) saved a newer `current_version`. Reload latest before saving again.

### 35. Does revert overwrite history?
Revert creates a **new** version with restored values; history is retained.

### 36. Can I manage sites on the portal?
Sites are managed in admin Details. The portal page does not render the Sites UI.

### 37. Why is calendar city “Other” for Paris/Barcelona?
Shoot-day city options are UK market cities. Live-format rows keep free-text sheet cities after parser fixes; shoot selects still use the market list.

### 38. How do I preview the portal as admin?
Open portal from Portal & Permissions. Signed-in admins may see calendar preview (`viewerIsAdmin`).

### 39. What theme options exist?
Light and dark via the header control (also on login).

### 40. Where is malware scanning?
Optional stub controlled by `MALWARE_SCAN_ENABLED`. It is not a full antivirus product.

---

**See also:** [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) · [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) · [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)
