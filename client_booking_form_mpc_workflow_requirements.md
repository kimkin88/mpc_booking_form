# Client Booking Form and MPC Workflow Requirements

## 1. Purpose

Create a client-facing booking form that collects all information needed to plan, price, schedule, deliver, and administer a shoot.

The form must:

- Start with one booking-requirement row.
- Allow the client to add additional shoot rows only when the remaining budget can cover them.
- Use a client-specific rate card.
- Support multiple file uploads in every file category.
- Calculate the MPC in-charge reference from the campaign start date.
- Calculate delivery dates from the selected format type.
- Lock automatically one week before the relevant in-charge period starts.
- Notify the client about missing information before locking.
- Remain flexible so different clients can use different rates and rules in future.

## 2. Client Booking Form

### 2.1 Section 1 — Brand and Commercial Details

Fields:

- Brand
- Campaign
- Reference Number
- Budget
- Currency
- PO Number
- PO Document Upload

Requirements:

- Reference Number should be unique where required.
- Budget must accept numeric values only.
- Currency must use a selectable currency list.
- PO Number may be optional until the booking reaches a defined status.
- PO Document Upload must allow multiple files.
- The system should show the remaining available shoot budget after selected shoot rows are calculated.
- Budget validation must happen on both the client interface and the backend.

### 2.2 Section 2 — Client and JCD Contacts

Fields:

- Name
- Email
- Team Email / CC Emails
- JCD Contact Name
- JCD Contact Email

Requirements:

- Name and primary Email are required.
- Team Email / CC Emails must support multiple email addresses.
- All email fields must be validated.
- The JCD contact may be pre-populated by MPC but should remain editable by authorised users.
- Emails entered here may be used for reminders and booking notifications.

### 2.3 Section 3 — Shoot Requirements

Each shoot row contains:

1. Shoot Day Length
2. City
3. Preferred Shoot Date

The form starts with one empty shoot row.

#### Shoot Day Length options

For the current JCD rate card:

- 1 Day Shoot: 1040
- 0.5 Day Shoot: 640

These values must not be hard-coded globally. They belong to a client-specific rate card and must be configurable.

#### Add-row behaviour

A plus button allows the client to add another shoot row only when the remaining budget can cover at least one valid shoot option.

The plus button must:

- Be enabled when at least one shoot length is affordable.
- Be disabled when the remaining budget cannot cover any valid option.
- Show only shoot-length options that remain affordable.
- Recalculate immediately when a row is added, changed, or removed.
- Prevent saving or submission when the total selected shoot cost exceeds the budget.

#### Example

Budget: 1680

Valid combinations:

- 1 Day + 0.5 Day = 1040 + 640 = 1680
- 0.5 Day + 0.5 Day = 640 + 640 = 1280

After choosing two 0.5 Day shoots:

- Remaining budget = 400
- No further 0.5 Day or 1 Day shoot is affordable
- The plus button must be disabled

After choosing one 1 Day shoot:

- Remaining budget = 640
- Only a 0.5 Day shoot may be added

#### General calculation

For all shoot rows:

`total_shoot_cost = sum(rate_for_selected_day_length)`

`remaining_budget = booking_budget - total_shoot_cost`

A new row may be added only when:

`remaining_budget >= lowest_available_rate_for_client`

#### Row requirements

Each row must include:

- Shoot Day Length
- City
- Preferred Shoot Date
- Calculated Cost
- Remove Row action, except where at least one row must remain

Validation:

- Shoot Day Length is required.
- City is required.
- Preferred Shoot Date is required.
- Preferred Shoot Date must be a valid date.
- Duplicate rows should trigger a warning.
- Removing a row must immediately return its cost to the remaining budget.

### 2.4 Section 4 — Format, Campaign Dates, Files and Notes

Fields:

- Format Type
- Campaign Start Date
- Campaign End Date
- Media Plan Files
- Site List Files
- Creative Files
- Additional Notes

#### Format Type options

Initial options:

- Digital
- Paper
- Both
- Other

Requirements:

- Format Type is required.
- Campaign Start Date is required.
- Campaign End Date is required.
- Campaign End Date cannot be earlier than Campaign Start Date.
- Other requires an explanatory note and produces a TBC delivery date until MPC confirms it.

#### File uploads

The following categories must allow multiple files:

- Media Plan
- Site Lists
- Creatives

Each category must support:

- Multiple files in one upload action
- Drag and drop
- Adding more files later
- File name, type, size, uploader, and upload date
- Upload progress
- Preview for supported formats
- Download
- Soft removal
- File version history
- Admin restoration
- Optional description or note

Uploading a new file must not replace existing files unless the user explicitly chooses Replace.

#### Additional Notes

- Multi-line free-text field
- Visible to both client and MPC unless marked otherwise
- Recorded in the activity log when changed

## 3. Client-Specific Rate Cards

The first implementation uses the JCD rate card:

| Shoot Day Length | Rate |
|---|---:|
| 1 Day | 1040 |
| 0.5 Day | 640 |

The design must support different rates for different clients in future.

### 3.1 Rate Card Model

A rate card should include:

- Client
- Rate Card Name
- Currency
- Effective From
- Effective To
- Shoot Length Code
- Shoot Length Label
- Duration
- Rate
- Active Status
- Minimum Quantity
- Maximum Quantity
- Optional City or Market Overrides
- Optional Notes

### 3.2 Rate Selection

When a booking is created:

1. Identify the client.
2. Find the active rate card for the booking date.
3. Load the available shoot-length options.
4. Calculate available combinations against the budget.
5. Store the applied rate and rate-card version on each shoot row.

Historical bookings must retain the original applied rate even if the rate card changes later.

## 4. MPC Admin Side

### 4.1 Booking Ownership

MPC must be able to assign an internal owner or person in charge of the booking.

Fields:

- MPC Booking Owner
- MPC Backup Owner
- Internal Status
- In-Charge Reference
- Calculated Delivery Date
- Lock Date
- Missing-Fields Status

The system should automatically calculate the In-Charge Reference from the campaign start date.

Admins may override the calculated owner or reference when authorised, but every override must be logged.

## 5. In-Charge Calculation

### 5.1 2026 Rule

For the 2026 cycle:

- In-Charge `1-26` starts on Monday, 29 December 2025.
- It runs until Sunday, 11 January 2026.
- Each in-charge period lasts 14 calendar days.
- References continue sequentially: `1-26`, `2-26`, `3-26`, and so on.
- The 2026 sequence continues through `26-26`.
- The next yearly sequence begins for 2027.

### 5.2 Calculation Formula

Base period:

- Base start: 29 December 2025
- Base reference number: 1
- Period length: 14 days
- Year suffix: 26

For a campaign start date:

`days_from_base = campaign_start_date - 2025-12-29`

`period_index = floor(days_from_base / 14) + 1`

For dates within the 2026 cycle:

`in_charge_reference = period_index + "-26"`

Examples:

- 29 Dec 2025 to 11 Jan 2026 -> `1-26`
- 12 Jan 2026 to 25 Jan 2026 -> `2-26`
- 26 Jan 2026 to 8 Feb 2026 -> `3-26`

### 5.3 Annual Configuration

The in-charge schedule must be configuration-driven rather than permanently hard-coded.

Each annual schedule should store:

- Cycle Name
- Year Suffix
- First Period Start Date
- Period Length in Days
- Number of Periods
- Final Period End Date
- Active Status

This allows a new 2027 cycle to be added without changing application code.

### 5.4 Boundary Handling

The system must:

- Assign dates on both the first and last day of a period to that period.
- Handle campaign dates before the active cycle.
- Handle campaign dates after the final configured period.
- Show a warning when no valid in-charge schedule exists.
- Allow an admin to configure the next cycle before the current one ends.

## 6. Delivery Date Calculation

Delivery time depends on Format Type.

| Format Type | Delivery Lead Time |
|---|---:|
| Digital | 5 working days |
| Paper | 8 working days |
| Both | 8 working days |
| Other | TBC |

### 6.1 Delivery Date Rule

The delivery date should be calculated backwards from the Campaign Start Date.

`delivery_due_date = campaign_start_date - working_day_lead_time`

Working days exclude:

- Saturdays
- Sundays
- Configured public holidays

Examples:

- Digital -> 5 working days before Campaign Start Date
- Paper -> 8 working days before Campaign Start Date
- Both -> 8 working days before Campaign Start Date
- Other -> TBC until an MPC admin enters a confirmed date

### 6.2 Requirements

- Recalculate when Format Type or Campaign Start Date changes.
- Show the calculated date to both MPC and the client.
- Clearly label the date as calculated.
- Permit an authorised MPC admin to override the date.
- Log the original calculated date and any override.
- Use a configurable holiday calendar.
- Support different delivery rules by client in future.

## 7. Portal Availability and Locking

### 7.1 Current behaviour

The client booking link remains open until MPC locks it.

- Saving progress does not lock the portal.
- Submitting for review does not lock the portal.
- MPC can manually lock or unlock the portal.
- A locked portal should remain readable unless MPC disables it completely.

### 7.2 Automated locking

The system should automatically lock the booking portal one week before the start of the relevant in-charge period.

#### Lock-date formula

`lock_date = in_charge_period_start_date - 7 calendar days`

Example:

- In-Charge `2-26` starts 12 January 2026
- Automatic lock date is 5 January 2026

The automation must:

1. Determine the campaign start date.
2. Calculate the relevant in-charge period.
3. Find the start date of that period.
4. Subtract seven calendar days.
5. Store the calculated lock date.
6. Notify the client about missing fields before the lock occurs.
7. Lock client editing on the lock date.
8. Keep the portal available in read-only mode unless fully disabled by MPC.
9. Record the lock in the activity log.

### 7.3 Future flexibility

The lock rule must be configurable by client.

Configuration should support:

- Manual-only locking
- Lock a number of days before in-charge start
- Lock a number of days before campaign start
- Lock after client submission
- Lock after MPC approval
- No automatic locking

For JCD, the initial rule is:

- Lock 7 calendar days before the relevant in-charge period starts

## 8. Missing-Fields Reminder Automation

Before the automatic lock, the system must check whether required information is missing.

### 8.1 Reminder timing

Recommended initial timing:

- Run the missing-fields check before the lock date.
- Send at least one reminder before the portal becomes read-only.
- The exact lead time should be configurable.

Example configuration:

- First reminder: 3 days before lock
- Final reminder: 1 day before lock

### 8.2 Missing field detection

The reminder should identify missing or invalid items, including:

- Brand
- Campaign
- Reference Number
- Budget
- Currency
- Required PO information
- Name
- Email
- JCD Contact Name
- JCD Contact Email
- At least one complete shoot row
- Format Type
- Campaign Start Date
- Campaign End Date
- Required Media Plan
- Required Site Lists
- Required Creatives
- Any client-specific required fields

### 8.3 Email requirements

Send from:

- A configured no-reply email address

The email must include:

- Booking reference
- Campaign name
- List of missing fields or files
- Portal lock date
- A secure link back to the booking form
- A clear action to complete the booking
- Contact information for support

The email must not:

- Include sensitive internal notes
- Include unrestricted file links
- Expose internal IDs
- Reveal admin-only data

### 8.4 Reminder behaviour

- Do not send a reminder when all required fields are complete.
- Recalculate missing fields immediately before sending.
- Avoid duplicate reminders within the configured interval.
- Log every reminder attempt and delivery result.
- Permit MPC admins to resend manually.
- Permit client-specific reminder templates.

## 9. Invoice and Airtable Automation

Airtable integration for invoicing is a proposed automation and requires confirmation before implementation.

Potential workflow:

1. Booking reaches an invoice-ready status.
2. Required commercial and PO fields are validated.
3. A record is created or updated in Airtable.
4. The Airtable record stores:
   - Booking Reference
   - Brand
   - Campaign
   - Client
   - Budget
   - Currency
   - PO Number
   - PO Document reference
   - Shoot rows
   - Total shoot cost
   - Campaign dates
   - Delivery date
   - In-Charge Reference
   - MPC owner
   - Invoice status
5. Airtable record ID is stored against the booking.
6. Sync events are written to the activity log.

Open questions:

- Which Airtable base and table should be used?
- Is Airtable the source of truth or a downstream invoice tracker?
- Should updates sync one way or two ways?
- What event creates the invoice record?
- What fields are mandatory before sync?
- How are failed syncs retried?
- Should PO documents be copied, linked, or referenced by secure URL?

## 10. Activity Log and Version History

Every important action must be recorded.

Examples:

- Booking created
- Budget changed
- Shoot row added
- Shoot row removed
- Shoot length changed
- Rate applied
- Remaining budget recalculated
- File uploaded
- File removed
- Campaign dates changed
- In-Charge Reference calculated
- Delivery date calculated
- Delivery date overridden
- Reminder sent
- Portal automatically locked
- Portal manually locked
- Portal unlocked
- Airtable sync created
- Airtable sync failed

Each entry should include:

- Timestamp
- Actor
- Role
- Source
- Action
- Field or item
- Previous value
- New value
- Booking version
- Optional metadata

Only MPC admins can revert changes.

A revert must create a new version and must not delete history.

## 11. Suggested Data Model

### Booking

- id
- client_id
- brand
- campaign
- reference_number
- budget
- currency
- po_number
- jcd_contact_name
- jcd_contact_email
- primary_contact_name
- primary_contact_email
- cc_emails
- format_type
- campaign_start_date
- campaign_end_date
- calculated_delivery_date
- overridden_delivery_date
- in_charge_reference
- in_charge_period_start
- in_charge_period_end
- portal_lock_date
- portal_status
- additional_notes
- mpc_owner_id
- status
- current_version
- created_at
- updated_at

### Shoot Requirement

- id
- booking_id
- shoot_day_length_code
- shoot_day_length_label
- city
- preferred_shoot_date
- applied_rate
- applied_currency
- rate_card_id
- rate_card_version
- created_at
- updated_at

### Rate Card

- id
- client_id
- name
- currency
- effective_from
- effective_to
- active
- created_at
- updated_at

### Rate Card Item

- id
- rate_card_id
- code
- label
- duration_days
- rate
- minimum_quantity
- maximum_quantity
- active

### In-Charge Cycle

- id
- cycle_name
- year_suffix
- first_period_start
- period_length_days
- number_of_periods
- active

### File Asset

- id
- booking_id
- category
- original_filename
- mime_type
- file_size
- storage_key
- uploader
- uploaded_via
- version
- parent_file_id
- is_removed
- created_at
- removed_at

### Reminder

- id
- booking_id
- reminder_type
- scheduled_at
- sent_at
- recipient_emails
- missing_items
- delivery_status
- error_message

### Integration Record

- id
- booking_id
- integration_name
- external_record_id
- sync_status
- last_synced_at
- error_message

## 12. Core Acceptance Criteria

### Client form

- The form displays the four defined sections.
- The first shoot-requirement row is present by default.
- A client can enter Shoot Day Length, City, and Preferred Shoot Date.
- A plus button adds another shoot row only when the budget allows.
- Unaffordable shoot-length options are disabled or hidden.
- The form cannot be submitted above budget.
- Team Email / CC Emails accepts multiple addresses.
- Media Plan, Site Lists, Creatives, and PO documents accept multiple files.

### Rate cards

- JCD uses 1040 for a 1 Day shoot and 640 for a 0.5 Day shoot.
- Rates are loaded from a client-specific rate card.
- Existing bookings retain the rate originally applied.
- Future clients can use different configurable rates.

### In-charge calculation

- 29 December 2025 through 11 January 2026 returns `1-26`.
- 12 January 2026 through 25 January 2026 returns `2-26`.
- The sequence continues in 14-day periods through `26-26`.
- The annual schedule can be configured for 2027 without a code change.

### Delivery dates

- Digital calculates 5 working days before campaign start.
- Paper calculates 8 working days before campaign start.
- Both calculates 8 working days before campaign start.
- Other displays TBC until confirmed.
- Weekends and configured public holidays are excluded.

### Portal locking and reminders

- The portal remains open until manually or automatically locked.
- JCD bookings calculate a lock date 7 days before the relevant in-charge period starts.
- Missing fields are checked before the lock.
- The reminder lists missing items and links back to the booking.
- The reminder is sent from a no-reply address.
- On the lock date, client editing becomes read-only.
- MPC admins can unlock the booking.
- All reminder and lock actions are logged.

### Files

- Each file category supports multiple uploads.
- Adding a file does not replace existing files.
- Admins can restore removed files.
- File activity and versions are retained.

## 13. Open Decisions

- Whether Budget includes only shoot-day charges or also other production costs.
- Whether the PO document is required when a PO Number is entered.
- Whether Media Plan, Site Lists, and Creatives are always required.
- How many days before lock each reminder should be sent.
- Which public-holiday calendar applies.
- Whether the delivery date is calculated from the campaign start date or another live date.
- Whether automatic lock occurs at the start or end of the calculated lock date.
- Whether locked portals remain read-only or become inaccessible.
- Whether MPC can grant a temporary extension after locking.
- Which fields should be sent to Airtable.
- Whether Airtable will be used for invoice creation, invoice tracking, or both.
