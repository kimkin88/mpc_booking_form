import { z } from 'zod';
import { DEFAULT_FIELD_PERMISSIONS } from '@/lib/constants';
import { hasBudgetCap, ratesFromBooking, shootRowsCost } from '@/lib/rateCard';

const emailSchema = z.string().email('Invalid email address');

export const bookingUpdateSchema = z
  .object({
    sb_number: z.string().min(1, 'Reference Number is required').optional(),
    currency: z.string().min(1).optional(),
    budget: z.union([z.number(), z.string(), z.null()]).optional(),
    budget_required: z.boolean().optional(),
    brand: z.string().nullable().optional(),
    campaign_name: z.string().nullable().optional(),
    city_market: z.string().nullable().optional(),
    client_company: z.string().nullable().optional(),
    client_name: z.string().nullable().optional(),
    client_email: z
      .union([emailSchema, z.literal(''), z.null()])
      .optional(),
    jcd_contact_name: z.string().nullable().optional(),
    jcd_contact_email: z
      .union([emailSchema, z.literal(''), z.null()])
      .optional(),
    cc_emails: z.array(emailSchema).optional(),
    format_type: z.string().nullable().optional(),
    format_type_other: z.string().nullable().optional(),
    campaign_start: z.string().nullable().optional(),
    campaign_end: z.string().nullable().optional(),
    calculated_delivery_date: z.string().nullable().optional(),
    delivery_date_override: z.string().nullable().optional(),
    in_charge_reference: z.string().nullable().optional(),
    in_charge_period_start: z.string().nullable().optional(),
    in_charge_period_end: z.string().nullable().optional(),
    portal_lock_date: z.string().nullable().optional(),
    auto_lock_enabled: z.boolean().optional(),
    half_day_rate: z.union([z.number(), z.string(), z.null()]).optional(),
    full_day_rate: z.union([z.number(), z.string(), z.null()]).optional(),
    rate_card_label: z.string().nullable().optional(),
    mpc_owner_name: z.string().nullable().optional(),
    mpc_backup_owner_name: z.string().nullable().optional(),
    mpc_chooses_sites: z.boolean().optional(),
    po_required: z.boolean().optional(),
    po_received: z.boolean().optional(),
    po_number: z.string().nullable().optional(),
    payment_terms: z.string().nullable().optional(),
    billing_address: z.string().nullable().optional(),
    invoice_notes: z.string().nullable().optional(),
    internal_notes: z.string().nullable().optional(),
    client_notes: z.string().nullable().optional(),
    status: z.string().optional(),
    expected_version: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.po_received && data.po_required === false) {
      ctx.addIssue({
        code: 'custom',
        message: 'PO Received cannot be enabled when PO Required is off (unless admin override)',
        path: ['po_received'],
      });
    }
    if (data.budget !== undefined && data.budget !== null && data.budget !== '') {
      const num = Number(data.budget);
      if (Number.isNaN(num)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Budget must be a numeric value',
          path: ['budget'],
        });
      }
    }
    if (
      data.campaign_start &&
      data.campaign_end &&
      data.campaign_end < data.campaign_start
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Campaign end cannot be earlier than start',
        path: ['campaign_end'],
      });
    }
    if (
      (data.format_type === 'Other' || data.format_type_other) &&
      data.format_type === 'Other' &&
      data.format_type_other !== undefined &&
      !String(data.format_type_other || '').trim()
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please specify the format when Other is selected',
        path: ['format_type_other'],
      });
    }
  });

export const scheduleEntrySchema = z
  .object({
    shoot_date: z.string().min(1, 'Preferred Shoot Date is required'),
    day_length: z.union([z.number(), z.string()]).optional().nullable(),
    city: z.string().nullable().optional(),
    applied_rate: z.union([z.number(), z.string(), z.null()]).optional(),
    applied_currency: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    live_start: z.string().nullable().optional(),
    live_end: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.day_length == null || data.day_length === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Shoot Day Length is required',
        path: ['day_length'],
      });
    } else {
      const len = Number(data.day_length);
      if (len !== 0.5 && len !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Shoot Day Length must be 0.5 or 1',
          path: ['day_length'],
        });
      }
    }
    if (!data.city) {
      ctx.addIssue({
        code: 'custom',
        message: 'City is required',
        path: ['city'],
      });
    }
    if (data.live_start && data.live_end && data.live_end < data.live_start) {
      ctx.addIssue({
        code: 'custom',
        message: 'Live End cannot be earlier than Live Start',
        path: ['live_end'],
      });
    }
  });

export const siteEntrySchema = z.object({
  type: z.enum(['must_shoot', 'avoid']),
  site_name: z.string().min(1, 'Site name is required'),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  reference_url: z
    .union([z.string().url('Invalid URL'), z.literal(''), z.null()])
    .optional(),
});

export function validateCreateBooking(data) {
  const schema = z.object({
    sb_number: z.string().min(1, 'SB Number is required'),
    currency: z.string().min(1, 'Currency is required'),
    budget: z.union([z.number(), z.string(), z.null()]).optional(),
    brand: z.string().optional(),
    campaign_name: z.string().optional(),
    client_company: z.string().optional(),
    city_market: z.string().optional(),
  });
  return schema.safeParse(data);
}

export function validateBookingUpdate(data) {
  return bookingUpdateSchema.safeParse(data);
}

export function validateScheduleEntry(data) {
  return scheduleEntrySchema.safeParse(data);
}

export function validateSiteEntry(data) {
  return siteEntrySchema.safeParse(data);
}

export function validateEmails(emails) {
  if (!Array.isArray(emails)) return { success: false, error: 'CC emails must be an array' };
  for (const email of emails) {
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      return { success: false, error: `Invalid email: ${email}` };
    }
  }
  return { success: true };
}

/**
 * Validate booking is ready for client submission / completion.
 */
export function validateForSubmission(booking, permissionsMap = {}, schedule = [], sites = []) {
  const errors = [];

  if (!booking.sb_number) {
    errors.push({ field: 'sb_number', message: 'Reference Number is required' });
  }
  if (!booking.currency) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  }

  if (
    booking.budget_required &&
    (booking.budget === null || booking.budget === undefined || booking.budget === '')
  ) {
    errors.push({ field: 'budget', message: 'Budget is required' });
  }

  if (booking.po_required && !booking.po_number) {
    errors.push({
      field: 'po_number',
      message: 'PO Number is required when PO Required is enabled',
    });
  }

  if (!booking.mpc_chooses_sites) {
    const mustShoot = sites.filter((s) => s.type === 'must_shoot');
    if (mustShoot.length === 0 && sites.length === 0) {
      errors.push({
        field: 'sites',
        message: 'At least one site instruction is required when MPC Chooses Sites is disabled',
      });
    }
  }

  const start = booking.campaign_start ? String(booking.campaign_start).slice(0, 10) : '';
  const end = booking.campaign_end ? String(booking.campaign_end).slice(0, 10) : '';
  if (start && end && end < start) {
    errors.push({
      field: 'campaign_end',
      message: 'Campaign End Date cannot be earlier than Campaign Start Date',
    });
  }

  if (booking.format_type === 'Other' && !String(booking.format_type_other || '').trim()) {
    errors.push({
      field: 'format_type_other',
      message: 'Please explain the format type when Other is selected',
    });
  }

  // Shoot requirements: at least one complete row when schedule is required/editable
  const schedulePerm = permissionsMap.schedule || DEFAULT_FIELD_PERMISSIONS.schedule;
  if (schedulePerm === 'required' || schedulePerm === 'editable') {
    const complete = (schedule || []).some(
      (e) =>
        e.day_length != null &&
        e.day_length !== '' &&
        String(e.city || '').trim() &&
        e.shoot_date
    );
    if (!complete) {
      errors.push({
        field: 'schedule',
        message: 'At least one complete shoot row is required (day length, city, and date)',
      });
    }
  }

  // Budget must cover selected shoot rows
  if (hasBudgetCap(booking.budget)) {
    const rates = ratesFromBooking(booking);
    const spent = shootRowsCost(schedule || [], rates);
    if (spent > Number(booking.budget) + 1e-9) {
      errors.push({
        field: 'budget',
        message: 'Total shoot cost exceeds the booking budget',
      });
    }
  }

  // Required-from-client fields
  Object.entries(permissionsMap).forEach(([key, perm]) => {
    if (perm !== 'required') return;
    if (key === 'schedule') {
      // Handled above with completeness check
      return;
    }
    if (key === 'sites' && sites.length === 0 && !booking.mpc_chooses_sites) {
      errors.push({ field: 'sites', message: 'Site information is required' });
    } else if (
      !['schedule', 'sites', 'files', 'portal', 'status', 'internal_notes'].includes(key) &&
      (booking[key] === null || booking[key] === undefined || booking[key] === '')
    ) {
      errors.push({ field: key, message: `${key} is required` });
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateFileUpload(file, maxSize = 25 * 1024 * 1024, allowedTypes = []) {
  const errors = [];
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }
  if (file.size > maxSize) {
    errors.push(`File exceeds maximum size of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`);
  }
  if (allowedTypes.length && !allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type || 'unknown'}" is not allowed`);
  }
  return { valid: errors.length === 0, errors };
}
