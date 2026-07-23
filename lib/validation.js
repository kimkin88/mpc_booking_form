import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');

export const bookingUpdateSchema = z
  .object({
    sb_number: z.string().min(1, 'SB Number is required').optional(),
    currency: z.string().min(1).optional(),
    budget: z.union([z.number(), z.string(), z.null()]).optional(),
    budget_required: z.boolean().optional(),
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
  });

export const scheduleEntrySchema = z
  .object({
    shoot_date: z.string().min(1, 'Shoot date is required'),
    format: z.string().min(1, 'Format is required'),
    live_start: z.string().nullable().optional(),
    live_end: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
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
    campaign_name: z.string().optional(),
    client_company: z.string().optional(),
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

  if (!booking.sb_number) errors.push({ field: 'sb_number', message: 'SB Number is required' });
  if (!booking.currency) errors.push({ field: 'currency', message: 'Currency is required' });

  if (booking.budget_required && (booking.budget === null || booking.budget === undefined || booking.budget === '')) {
    errors.push({ field: 'budget', message: 'Budget is required' });
  }

  if (booking.po_required && !booking.po_number) {
    errors.push({ field: 'po_number', message: 'PO Number is required when PO Required is enabled' });
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

  // Required-from-client fields
  Object.entries(permissionsMap).forEach(([key, perm]) => {
    if (perm !== 'required') return;
    if (key === 'schedule' && schedule.length === 0) {
      errors.push({ field: 'schedule', message: 'Shoot schedule is required' });
    } else if (key === 'sites' && sites.length === 0 && !booking.mpc_chooses_sites) {
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
