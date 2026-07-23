# Client-Editable Booking Form — Product Requirements

## 1. Overview

Create a booking form that is managed internally by the admin team and can also be shared with a client through a secure portal link.

The internal admin team owns and controls the booking record. Clients can use the shared portal to add or update permitted information and upload files without gaining access to admin-only controls.

The system must maintain a complete activity history and allow admins to revert accidental changes.

---

## 2. User Roles

### Admin

Admins can:

- Create and manage bookings.
- Edit all booking fields.
- Generate, copy, preview, regenerate, disable, or reset the client portal link.
- Set or reset a client PIN.
- View the full activity log.
- See who changed each field and when.
- Revert accidental changes.
- Upload, download, rename, replace, and delete files.
- Change document statuses.
- Access internal notes.
- Control which fields are visible or editable by the client.
- Lock the client portal when the booking is complete.

### Client

Clients can:

- Open the booking using a secure shared portal link.
- Enter a PIN when one is enabled.
- View the booking information exposed to them.
- Add or update fields that the admin has made editable.
- Upload multiple files to any enabled file category.
- Download files made available to them.
- Add notes or comments where permitted.
- See a confirmation after saving changes.

Clients cannot:

- Access internal notes.
- View admin-only metadata or controls.
- View the full internal activity log.
- Revert changes.
- Delete the booking.
- Change portal permissions.
- Regenerate the portal link.
- Permanently delete files unless explicitly allowed by an admin.

---

## 3. Booking Form Sections

## 3.1 Reference & Budget

Fields:

- **SB Number** — required.
- **Currency** — required.
- **Budget** — optional or required based on admin configuration.

Example:

- SB Number: `SB-2024-001`
- Currency: `GBP`
- Budget: `5,000`

Validation:

- SB Number should be unique.
- Budget should accept numeric values only.
- Currency should use a selectable currency list.

---

## 3.2 Client & Campaign

Fields:

- Campaign Name
- City / Market
- Client Company
- JCD Independent Client Name
- JCD Independent Client Email

Validation:

- Email addresses must use valid email formatting.
- Campaign Name and Client Company should be searchable in the admin interface.

---

## 3.3 JCD Contact

Fields:

- JCD Contact Name
- JCD Contact Email
- CC Email

Requirements:

- Allow multiple CC email recipients.
- Validate all email addresses.
- Admins can add or remove recipients.
- Client access to these fields should be configurable.

---

## 3.4 Shoot Schedule & Live Dates

The booking includes a calendar-based schedule.

Requirements:

- Admins and permitted clients can select a day.
- A selected day can contain one or more formats.
- Each format entry includes:
  - Format / Size
  - Live Start
  - Live End
  - Notes
- Multiple format and live-period entries can exist for the same date.
- Dates must support editing and removal.
- The interface should clearly indicate dates with existing entries.
- The system should prevent Live End from being earlier than Live Start.
- Date format should follow the selected locale.

Example formats:

- 48-Sheet
- 6-Sheet
- Digital 48-Sheet
- Custom Size

---

## 3.5 Sites

Fields:

- Must-Shoot Sites
- Sites to Avoid
- MPC Chooses Sites

### Default behaviour

**MPC Chooses Sites must be enabled by default for every new booking.**

Requirements:

- The toggle remains editable by admins.
- Client editing of the toggle is configurable.
- If MPC Chooses Sites is enabled, site fields can remain optional.
- If MPC Chooses Sites is disabled, the form may require at least one Must-Shoot Site or other site instructions.
- Site fields should support multiple entries, not only a single free-text value.
- Each site entry may include a name, location, notes, and optional reference link.

---

## 3.6 Invoice & Purchase Order

Fields:

- PO Required
- PO Received
- PO Number
- Payment Terms
- Billing Address
- Miscellaneous Invoice Notes

Conditional behaviour:

- If PO Required is enabled, PO Number should become required before the booking can be marked complete.
- PO Received should not be enabled before PO Required unless an admin overrides it.
- Purchase order or invoice files can be attached in Files & Assets.

---

## 3.7 Internal Notes

Requirements:

- Visible to admins only.
- Never displayed in the client portal.
- Changes must be recorded in the admin activity log.
- Support plain text and line breaks.
- Optionally support mentions of internal users.

---

## 4. Files & Assets

File categories:

- Campaign Artwork
- Brand Guidelines
- Reference / Mood Images
- Purchase Order / Invoice
- Other Documents

### Core requirement

**Every file category must support multiple files. Uploads must not be restricted to one file per section.**

For each file category, users should be able to:

- Upload one or more files at the same time.
- Drag and drop multiple files.
- Add more files later.
- View a list of all uploaded files.
- Preview supported file types.
- Download files.
- See file name, type, size, uploader, and upload date.
- Add an optional description or note.
- Replace a file while preserving version history.
- Remove a file, subject to role permissions.
- Change the category status.

Suggested statuses:

- Missing
- Requested
- Uploaded
- Under Review
- Approved
- Rejected
- Not Required

### File handling

- Support common image, document, spreadsheet, presentation, and archive formats.
- Enforce configurable file-size limits.
- Show upload progress.
- Display clear validation errors.
- Scan uploads for malware.
- Store files securely.
- Keep previous versions available to admins.
- Record every upload, replacement, status change, and deletion in the activity log.

### Client file permissions

Clients can:

- Upload multiple files to enabled categories.
- View and download files shared with them.
- Add files without overwriting existing files.
- Replace their own file only when permitted.

Clients cannot permanently delete a file from the audit record.

A client-side removal should soft-delete or mark the file as removed so an admin can restore it.

---

## 5. Client Portal Access

Each booking has a shareable client portal.

Portal controls:

- Copy Portal Link
- Preview Portal
- Set PIN
- Reset PIN
- Regenerate Link
- Lock Portal
- Unlock Portal
- Disable Link
- Re-enable Link
- Optional Expiry Date
- Lock Editing

Requirements:

- Each portal link must use a secure, unguessable token.
- The link should be scoped to one booking only.
- Admins can optionally require a PIN.
- Regenerating the link invalidates the previous link.
- **By default, the portal link remains active indefinitely until an admin explicitly locks or disables it.**
- Saving progress or submitting for review must not automatically close, expire, or invalidate the portal link.
- Admins can lock the portal at any time.
- A locked portal should remain accessible in read-only mode unless the admin fully disables access.
- Admins can unlock the portal and restore editing.
- An optional expiry date may be supported, but it must be disabled by default.
- Automated locking or expiry may be added later as a configurable rule.
- The portal can be switched to read-only.
- The portal should show the client company or campaign name.
- The portal must not expose internal URLs, IDs, notes, or admin-only information.
- Portal sessions should expire after a configurable period of inactivity.
- Repeated failed PIN attempts should trigger rate limiting or a temporary lock.

Suggested portal states:

- Draft
- Active
- Submitted — still accessible and editable unless an admin locks it
- Locked — accessible but read-only
- Expired — optional future automation
- Disabled — inaccessible

---

## 6. Field-Level Client Permissions

Admins should be able to configure whether each field is:

- Hidden from client
- Visible but read-only
- Editable by client
- Required from client

Suggested default client-editable fields:

- Campaign details
- Client contact details
- Shoot schedule
- Live dates
- Site instructions
- Invoice and PO details
- File uploads
- Client-facing notes

Suggested admin-only fields:

- Internal Notes
- Portal controls
- Full activity log
- Revert controls
- Internal status fields
- Internal ownership and assignment

---

## 7. Saving and Concurrency

Requirements:

- Save changes automatically or through a clear Save button.
- Show a success confirmation after saving.
- Warn users about unsaved changes before leaving.
- Prevent one user from silently overwriting another user's recent edits.
- Use field-level conflict detection where possible.
- Show the latest saved version and timestamp.
- Identify whether a change was made by an admin or client.

Recommended approach:

- Use optimistic concurrency with a booking version number.
- When a stale version is submitted, show the conflicting fields and allow the user to review before overwriting.

---

## 8. Activity Log

The system must maintain an immutable activity log.

Each activity entry should record:

- Date and time
- User or client identity
- Role
- Action
- Section
- Field or file affected
- Previous value
- New value
- Source, such as Admin Portal or Client Portal
- Version number
- Optional IP address or device metadata, subject to privacy requirements

Example activities:

- Booking created
- Client portal link generated
- Portal PIN set
- Campaign name changed
- MPC Chooses Sites disabled
- Shoot date added
- Format added
- File uploaded
- File replaced
- File status changed
- Booking reverted
- Portal link regenerated
- Portal access disabled

The admin interface should support:

- Filtering by user
- Filtering by section
- Filtering by action type
- Searching activity entries
- Viewing changes as a before-and-after comparison
- Opening the booking version associated with an activity

The client may be shown a limited “recent updates” feed, but not the full internal activity log.

---

## 9. Revert and Version History

### Admin-only requirement

Only admins can revert changes.

Requirements:

- Every successful save creates a new booking version.
- Admins can view prior versions.
- Admins can compare any version with the current version.
- Admins can revert:
  - One field
  - One section
  - One file action
  - An entire booking version
- Reverting must not erase history.
- A revert creates a new version and a new activity-log entry.
- Before reverting, show a confirmation screen with:
  - Changes that will be restored
  - Changes that will be overwritten
  - Files affected
  - Current version
  - Target version
- Admins should be able to undo a revert by reverting to a later version.

### File restoration

Admins can restore:

- Soft-deleted files
- Previous file versions
- Previous document statuses
- Files removed accidentally by a client

---

## 10. Notifications

Optional notifications should be configurable.

Admin notifications:

- Client opened portal for the first time.
- Client updated booking information.
- Client uploaded files.
- Client removed or replaced a file.
- Client completed required information.
- Portal PIN was locked after repeated failed attempts.

Client notifications:

- Portal link sent.
- PIN sent separately.
- Admin requested missing information.
- File rejected or approved.
- Booking updated by admin.
- Booking submitted successfully.

Notifications should avoid including sensitive information in email content.

---

## 11. Booking Status

Suggested booking statuses:

- Draft
- Waiting for Client
- Client Updating
- Ready for Review
- Changes Requested
- Approved
- In Production
- Completed
- Archived
- Cancelled

Status changes must be logged.

Admins can control whether the client portal remains editable for each status.

---

## 12. Submission and Completion

The client portal should include a clear submission action.

Suggested flow:

1. Client opens secure link.
2. Client enters PIN when required.
3. Client reviews the booking.
4. Client updates permitted fields.
5. Client uploads one or more files in each relevant category.
6. Client saves progress.
7. Client selects **Submit to Admin**.
8. System validates required fields.
9. Booking status changes to **Ready for Review**.
10. Admin receives a notification.
11. Admin reviews, requests changes, or approves.

Submitting should not lock, expire, disable, or invalidate the form. The shared link remains open after submission until an admin explicitly locks or disables it.

Future automation may optionally lock the portal after a configured event, such as approval, completion, or a defined period of inactivity. This automation must be configurable and should not be enabled by default.

---

## 13. Validation Rules

- Required fields must be clearly marked.
- Invalid emails should be rejected.
- Live End cannot be before Live Start.
- Duplicate SB Numbers should be rejected.
- PO Number should be required when PO Required is enabled.
- File type and size restrictions should be shown before upload.
- Multiple uploads must continue when one file fails, while clearly identifying the failed file.
- A client must not be able to modify hidden or admin-only fields through the API.
- The server must validate all permissions independently of the interface.

---

## 14. Security and Privacy

- Use HTTPS for all portal and admin traffic.
- Use secure, random portal tokens.
- Hash portal PINs.
- Apply role-based access control.
- Log authentication and permission failures.
- Rate-limit portal access attempts.
- Protect against cross-site scripting, request forgery, injection, and insecure file uploads.
- Encrypt sensitive data at rest where appropriate.
- Use signed, time-limited URLs for file downloads.
- Do not expose direct storage paths.
- Support data retention and deletion policies.
- Preserve audit records according to business and legal requirements.

---

## 15. Accessibility and Responsive Design

- Support desktop, tablet, and mobile layouts.
- All fields must have labels.
- All controls must be keyboard accessible.
- Use visible focus states.
- Do not rely on colour alone to communicate status.
- Provide accessible error messages.
- Ensure sufficient contrast.
- Allow screen readers to identify upload progress, required fields, and validation errors.

---

## 16. Suggested Data Model

### Booking

- id
- sb_number
- status
- currency
- budget
- campaign_name
- city_market
- client_company
- client_name
- client_email
- jcd_contact_name
- jcd_contact_email
- cc_emails
- mpc_chooses_sites — default `true`
- po_required
- po_received
- po_number
- payment_terms
- billing_address
- invoice_notes
- internal_notes
- current_version
- created_by
- created_at
- updated_at

### Portal Access

- id
- booking_id
- access_token_hash
- pin_hash
- status
- expires_at
- editing_locked
- first_opened_at
- last_opened_at
- created_at
- regenerated_at

### Schedule Entry

- id
- booking_id
- shoot_date
- format
- live_start
- live_end
- notes
- created_by
- updated_by

### Site Entry

- id
- booking_id
- type: `must_shoot` or `avoid`
- site_name
- location
- notes
- reference_url

### File Asset

- id
- booking_id
- category
- status
- original_filename
- stored_filename
- mime_type
- file_size
- storage_key
- description
- uploaded_by
- uploaded_via
- version
- parent_file_id
- is_removed
- created_at
- removed_at

### Booking Version

- id
- booking_id
- version_number
- snapshot
- created_by
- source
- created_at

### Activity Entry

- id
- booking_id
- version_number
- actor_id
- actor_name
- actor_role
- action
- section
- field_name
- previous_value
- new_value
- metadata
- source
- created_at

---

## 17. Acceptance Criteria

### Portal

- An admin can generate and copy a unique portal link.
- A client can open the portal without accessing the admin area.
- An admin can require a PIN.
- Regenerating the portal link invalidates the previous link.
- An admin can make the portal read-only, lock it, unlock it, or disable it.
- The portal link remains active after Save Progress and Submit for Review.
- The portal remains open indefinitely until an admin explicitly locks or disables it.
- No expiry or automatic locking is enabled by default.
- Future automated locking or expiry can be introduced as an optional configurable rule.

### Sites

- MPC Chooses Sites is enabled automatically on every new booking.
- The value can be changed by an admin.
- Every change is logged.

### Files

- A user can upload multiple files to the same category.
- A user can upload additional files without replacing existing files.
- Each uploaded file appears as a separate item.
- File status is tracked per category or per file.
- Admins can restore a removed file.
- Previous file versions remain available to admins.

### Activity and Revert

- Every client and admin edit creates an activity entry.
- The activity entry identifies the actor and source.
- Admins can compare previous and current values.
- Admins can revert a field, section, file action, or full version.
- Clients cannot access revert controls.
- A revert creates a new version rather than deleting history.

### Permissions

- Internal Notes never appear in the client portal.
- Clients can edit only fields explicitly permitted by the admin.
- Permission checks are enforced by the backend.
- Clients cannot access another booking by changing the URL.

---

## 18. Recommended Admin Interface Actions

Primary actions:

- Save Booking
- Preview Client Portal
- Copy Portal Link
- Request Client Update
- Review Client Changes
- Approve Booking
- Lock Client Editing
- View Activity
- Compare Versions
- Revert Changes

File actions:

- Upload Files
- Add More Files
- Preview
- Download
- Replace
- View Versions
- Restore
- Remove

---

## 19. Open Configuration Decisions

The following decisions should be confirmed before implementation:

- Which fields are editable by clients by default.
- Whether clients can delete their own uploads or only mark them for removal.
- Maximum file size and supported file types.
- Which future events, if any, should trigger optional automated portal locking or expiry.
- Whether all portals require a PIN.
- Whether clients can see previous versions of their own files.
- Whether comments are needed at field level or only at booking level.
- Whether a client submission locks editing automatically.
- How long audit records and old file versions should be retained.
- Whether multiple client users can access the same booking with separate identities.
