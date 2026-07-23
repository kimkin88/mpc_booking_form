import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { bumpVersionAndSnapshot, getVersion } from '@/services/versionService';
import { diffObjects } from '@/utils/helpers';

/**
 * Revert booking to a previous version (or partial field/section).
 * Creates a NEW version — never erases history.
 */
export async function revertBooking({
  bookingId,
  targetVersionNumber,
  mode = 'full', // 'full' | 'section' | 'field' | 'file'
  section = null,
  fieldName = null,
  fileId = null,
  actor,
}) {
  const supabase = createServiceClient();
  const target = await getVersion(bookingId, targetVersionNumber);
  const snapshot = target.snapshot;

  const { data: current } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

  const changesPreview = {
    restored: [],
    overwritten: [],
    filesAffected: [],
  };

  if (mode === 'full' || mode === 'section' || mode === 'field') {
    const snapBooking = snapshot.booking;
    const updates = {};

    const fieldsToRestore =
      mode === 'field'
        ? [fieldName]
        : mode === 'section'
          ? getSectionFields(section)
          : Object.keys(snapBooking).filter(
              (k) =>
                ![
                  'id',
                  'created_at',
                  'updated_at',
                  'created_by',
                  'current_version',
                ].includes(k)
            );

    fieldsToRestore.forEach((field) => {
      if (!(field in snapBooking)) return;
      if (JSON.stringify(current[field]) !== JSON.stringify(snapBooking[field])) {
        updates[field] = snapBooking[field];
        changesPreview.restored.push({ field, value: snapBooking[field] });
        changesPreview.overwritten.push({ field, value: current[field] });
      }
    });

    if (Object.keys(updates).length) {
      await supabase.from('bookings').update(updates).eq('id', bookingId);
    }

    if (mode === 'full' || section === 'schedule') {
      await supabase.from('schedule_entries').delete().eq('booking_id', bookingId);
      if (snapshot.schedule?.length) {
        const rows = snapshot.schedule.map(({ id: _id, ...rest }) => ({
          ...rest,
          booking_id: bookingId,
        }));
        await supabase.from('schedule_entries').insert(rows);
        changesPreview.restored.push({ field: 'schedule', value: `${rows.length} entries` });
      }
    }

    if (mode === 'full' || section === 'sites') {
      await supabase.from('site_entries').delete().eq('booking_id', bookingId);
      if (snapshot.sites?.length) {
        const rows = snapshot.sites.map(({ id: _id, ...rest }) => ({
          ...rest,
          booking_id: bookingId,
        }));
        await supabase.from('site_entries').insert(rows);
        changesPreview.restored.push({ field: 'sites', value: `${rows.length} entries` });
      }
    }
  }

  if (mode === 'file' && fileId) {
    const { data: file } = await supabase
      .from('file_assets')
      .update({ is_removed: false, removed_at: null, removed_by: null })
      .eq('id', fileId)
      .select()
      .single();
    if (file) {
      changesPreview.filesAffected.push(file);
    }
  }

  if (mode === 'full' && snapshot.files) {
    // Restore soft-deleted files that existed in snapshot as active
    const snapIds = snapshot.files.map((f) => f.id);
    if (snapIds.length) {
      await supabase
        .from('file_assets')
        .update({ is_removed: false, removed_at: null })
        .in('id', snapIds);
      changesPreview.filesAffected = snapshot.files;
    }
  }

  const { versionNumber } = await bumpVersionAndSnapshot(bookingId, {
    id: actor.id,
    name: actor.name,
    source: 'admin_portal',
  });

  await logActivity({
    bookingId,
    versionNumber,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: 'booking_reverted',
    section: section || 'booking',
    fieldName,
    previousValue: { version: current.current_version },
    newValue: { targetVersion: targetVersionNumber, mode },
    metadata: changesPreview,
    source: 'admin_portal',
  });

  return { versionNumber, changesPreview };
}

export async function previewRevert(bookingId, targetVersionNumber, mode = 'full', options = {}) {
  const target = await getVersion(bookingId, targetVersionNumber);
  const supabase = createServiceClient();
  const { data: current } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

  const snap = target.snapshot.booking;
  const fields =
    mode === 'field'
      ? [options.fieldName]
      : mode === 'section'
        ? getSectionFields(options.section)
        : Object.keys(snap).filter(
            (k) => !['id', 'created_at', 'updated_at', 'created_by', 'current_version'].includes(k)
          );

  const changes = diffObjects(current, snap, fields);

  return {
    currentVersion: current.current_version,
    targetVersion: targetVersionNumber,
    changes,
    filesInTarget: target.snapshot.files || [],
  };
}

function getSectionFields(section) {
  const map = {
    reference: ['sb_number', 'currency', 'budget', 'budget_required'],
    client: ['campaign_name', 'city_market', 'client_company', 'client_name', 'client_email'],
    jcd_contact: ['jcd_contact_name', 'jcd_contact_email', 'cc_emails'],
    sites: ['mpc_chooses_sites'],
    invoice: [
      'po_required',
      'po_received',
      'po_number',
      'payment_terms',
      'billing_address',
      'invoice_notes',
    ],
    notes: ['internal_notes', 'client_notes'],
    status: ['status'],
  };
  return map[section] || [];
}
