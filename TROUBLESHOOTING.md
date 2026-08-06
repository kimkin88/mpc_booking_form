# Troubleshooting — MPC Booking

Problem | Cause | Solution
--- | --- | ---
Cannot sign in | Wrong password or email | Retry carefully; use Settings password change if signed in elsewhere; IT/Supabase reset if locked out
Signed in then kicked out with “not an admin” | `profiles.role` is not `admin` | Set role to `admin` in Supabase `profiles`
Admin pages redirect to login | Session expired or cookies blocked | Sign in again; allow cookies for the app domain
Bookings list empty unexpectedly | Filters/search too narrow | Clear search and set status to All
Cannot create booking — SB exists | Duplicate SB number | Click **Regenerate** on SB Number
Save Booking fails — version conflict | Client or another admin saved first | Click **Load latest**, merge mentally, save again
Remote updates banner while editing | Portal/client changes detected | Load latest or finish your edit carefully to avoid overwrite
Client sees Read-only | Lock, expiry, disable, or status not editable | Unlock / extend expiry / re-enable / adjust status rules; re-enable auto-lock only if desired
Client cannot open link | Wrong/old token, disabled, or expired | Check Sent Links; regenerate and resend if needed
PIN always fails | Wrong PIN or lockout after failed attempts | Confirm PIN; wait lockout (default 15 min) or clear lock via admin flows / unlock portal
PIN lockout notification | Too many failed attempts | Wait; share correct PIN; consider removing PIN if unused
Client cannot Submit | Required fields empty or validation errors | Check Required permissions; fill missing fields; read portal error text
Client cannot upload file | Size/MIME not allowed or category not editable | Check 25MB default limit and file type; permissions; category status
Client cannot remove a file | Under review / approved | Admin changes status or restores/replaces as policy allows
Shoot day + button disabled | Budget missing or remaining &lt; half-day rate | Set budget/rates; remove extra days; or enable extra-shots use of remaining where appropriate
Import found no live dates | Empty period cells / no date comments | Check sheet; pick correct market sheet; add dates manually on Calendar
Import created junk sites (ORF, EC24…) | Older parser / footer rows | Re-parse with current build; remove junk sites manually if already applied
UK live dates wrong vs media buy | Stale comment dates vs cost grid | Current parser prefers multi-week cost columns; re-import or edit calendar
Calendar month wrong on open | Expecting first live date | Default month is **current** month; use format badges to jump
Pencil missing on calendar day | Day not selected or read-only | Click the day first; ensure not read-only context
Portal sites missing | Sites UI not on portal | Manage sites in admin Details
Reminders not sending | No emails, already sent, complete form, cron misconfigured | Add client/JCD email; check cron secret & schedule; use **Send reminder now**; check reminder_failed notification
Auto-lock did not run | Auto-lock off, manual unlock, wrong date, status archived/cancelled | Check Portal tab toggles; lock date; global `AUTO_LOCK_ENABLED`
Unlocked but locks again next day | Auto-lock still enabled | After unlock, auto-lock is turned off — if you re-enabled it, turn off or change lock date
Emails not arriving | Mailer not configured / hard-coded credentials invalid | Configure production email env; check spam; review server logs
OpenAI parse unavailable | Missing `OPENAI_API_KEY` | Heuristic-only still works; add key for AI enrichment
OpenAI usage looks high | Many AI parses | Use heuristic-only when enough; reset counter in Settings for tracking only (does not refund)
Notifications never appear | No events yet or already marked read | Trigger a portal open; check Mark all read; refresh
Theme “broken” contrast | Browser extension forcing colors | Disable overrides; toggle theme once
File restore missing | Soft-deleted only visible to admin restore UI | Open file row options as admin; portal users cannot restore
Activity empty | No logged events yet | Client/admin actions populate over time
Version revert “did nothing” | Looking at old version number | Revert creates a **new** version; refresh Versions tab
Delivery date TBC | Format type Other or missing campaign start | Set Digital/Paper/Both and campaign start
In-Charge blank | No shoot date or campaign start | Add preferred shoot or campaign dates and save
Help (?) does nothing | Modal blocked / script error | Hard refresh; check browser console; ensure JS enabled

---

**See also:** [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) · [FAQ.md](./FAQ.md)
