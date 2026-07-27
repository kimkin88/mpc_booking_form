import { createServiceClient } from '@/lib/supabase/admin';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/constants';
import { validateFileUpload } from '@/lib/validation';
import { signUploadTicket, verifyUploadTicket } from '@/lib/crypto';
import { logActivity } from '@/services/activityService';
import { notifyAdmins } from '@/services/notificationService';
import { scanFileForMalware } from '@/services/malwareScanService';

const BUCKET = 'booking-files';
const TICKET_TTL_MS = 2 * 60 * 60 * 1000;

function sanitizeFilename(name = 'file') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildStorageKey(bookingId, category, originalName) {
  const storedFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitizeFilename(originalName)}`;
  return {
    storedFilename,
    storageKey: `${bookingId}/${category}/${storedFilename}`,
  };
}

function asFileMeta(file) {
  return {
    name: file?.name || file?.filename || file?.originalFilename || 'file',
    type: file?.type || file?.mimeType || file?.mime_type || '',
    size: Number(file?.size ?? file?.fileSize ?? file?.file_size ?? 0),
  };
}

async function assertObjectExists(supabase, storageKey) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storageKey, 60);
  if (error || !data?.signedUrl) {
    throw new Error('Uploaded file was not found in storage');
  }
}

async function markCategoryUploaded(supabase, bookingId, category) {
  await supabase.from('file_category_statuses').upsert(
    {
      booking_id: bookingId,
      category,
      status: 'uploaded',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'booking_id,category' }
  );
}

async function insertUploadedAsset({
  supabase,
  bookingId,
  category,
  storedFilename,
  storageKey,
  originalFilename,
  mimeType,
  fileSize,
  description,
  actor,
  source,
  version = 1,
  parentFileId = null,
}) {
  const { data: asset, error: insertError } = await supabase
    .from('file_assets')
    .insert({
      booking_id: bookingId,
      category,
      status: 'uploaded',
      original_filename: originalFilename,
      stored_filename: storedFilename,
      mime_type: mimeType,
      file_size: fileSize,
      storage_key: storageKey,
      description,
      uploaded_by: actor.id || null,
      uploaded_by_name: actor.name,
      uploaded_via: source,
      version,
      parent_file_id: parentFileId,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return asset;
}

/**
 * Issue signed Supabase upload URLs so the browser can PUT files directly
 * (bypasses Vercel’s 4.5MB serverless body limit).
 */
export async function prepareDirectUploads({
  bookingId,
  category,
  files,
  description = null,
}) {
  if (!category) throw new Error('category is required');
  const list = Array.isArray(files) ? files : [];
  if (!list.length) throw new Error('At least one file is required');

  const supabase = createServiceClient();
  const slots = [];
  const failures = [];

  for (const raw of list) {
    const meta = asFileMeta(raw);
    const validation = validateFileUpload(meta, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES);
    if (!validation.valid) {
      failures.push({ success: false, filename: meta.name, errors: validation.errors });
      continue;
    }

    const scan = await scanFileForMalware(meta);
    if (!scan.clean) {
      failures.push({
        success: false,
        filename: meta.name,
        errors: ['File failed malware scan'],
      });
      continue;
    }

    const { storedFilename, storageKey } = buildStorageKey(bookingId, category, meta.name);
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storageKey);

    if (error) {
      failures.push({
        success: false,
        filename: meta.name,
        errors: [error.message || 'Could not create upload URL'],
      });
      continue;
    }

    const exp = Date.now() + TICKET_TTL_MS;
    const ticket = signUploadTicket({
      kind: 'upload',
      bookingId,
      category,
      storageKey,
      storedFilename,
      originalFilename: meta.name,
      mimeType: meta.type,
      fileSize: meta.size,
      description,
      exp,
    });

    slots.push({
      clientId: raw?.clientId ?? null,
      filename: meta.name,
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      ticket,
    });
  }

  return { slots, failures };
}

export async function completeDirectUploads({
  bookingId,
  tickets,
  actor,
  source = 'admin_portal',
}) {
  const list = Array.isArray(tickets) ? tickets : [];
  if (!list.length) throw new Error('At least one upload ticket is required');

  const supabase = createServiceClient();
  const results = [];

  for (const ticket of list) {
    let payload;
    try {
      payload = verifyUploadTicket(ticket);
    } catch (err) {
      results.push({ success: false, filename: 'unknown', errors: [err.message] });
      continue;
    }

    if (payload.kind !== 'upload' || payload.bookingId !== bookingId) {
      results.push({
        success: false,
        filename: payload.originalFilename || 'unknown',
        errors: ['Upload ticket does not match this booking'],
      });
      continue;
    }

    try {
      await assertObjectExists(supabase, payload.storageKey);
      const asset = await insertUploadedAsset({
        supabase,
        bookingId,
        category: payload.category,
        storedFilename: payload.storedFilename,
        storageKey: payload.storageKey,
        originalFilename: payload.originalFilename,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
        description: payload.description ?? null,
        actor,
        source,
      });

      await markCategoryUploaded(supabase, bookingId, payload.category);

      await logActivity({
        bookingId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role || 'admin',
        action: 'file_uploaded',
        section: 'files',
        fieldName: payload.category,
        newValue: {
          id: asset.id,
          filename: asset.original_filename,
          size: asset.file_size,
        },
        source,
      });

      if (source === 'client_portal') {
        await notifyAdmins(
          bookingId,
          'client_uploaded_files',
          'Client uploaded files',
          `${actor.name} uploaded ${payload.originalFilename} to ${payload.category}.`
        );
      }

      results.push({ success: true, file: asset });
    } catch (err) {
      results.push({
        success: false,
        filename: payload.originalFilename,
        errors: [err.message || 'Upload finalize failed'],
      });
    }
  }

  return results;
}

export async function prepareDirectReplace({ fileId, file, source = 'admin_portal' }) {
  const supabase = createServiceClient();
  const meta = asFileMeta(file);

  const { data: existing, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) throw error;

  if (source === 'client_portal') {
    if (existing.uploaded_via !== 'client_portal') {
      const err = new Error('You can only replace files you uploaded');
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (existing.status === 'under_review') {
      const err = new Error('This file is under review and cannot be replaced');
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (existing.status === 'approved') {
      const err = new Error('This file is approved and cannot be replaced');
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  const validation = validateFileUpload(meta, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES);
  if (!validation.valid) {
    const err = new Error(validation.errors.join('; '));
    err.code = 'VALIDATION';
    throw err;
  }

  const scan = await scanFileForMalware(meta);
  if (!scan.clean) {
    const err = new Error('File failed malware scan');
    err.code = 'VALIDATION';
    throw err;
  }

  const { storedFilename, storageKey } = buildStorageKey(
    existing.booking_id,
    existing.category,
    meta.name
  );

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storageKey);

  if (signError) throw signError;

  const exp = Date.now() + TICKET_TTL_MS;
  const ticket = signUploadTicket({
    kind: 'replace',
    bookingId: existing.booking_id,
    category: existing.category,
    fileId: existing.id,
    storageKey,
    storedFilename,
    originalFilename: meta.name,
    mimeType: meta.type,
    fileSize: meta.size,
    description: existing.description,
    exp,
  });

  return {
    filename: meta.name,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    ticket,
  };
}

export async function completeDirectReplace({ ticket, actor, source = 'admin_portal' }) {
  const payload = verifyUploadTicket(ticket);
  if (payload.kind !== 'replace') {
    throw new Error('Invalid replace ticket');
  }

  const supabase = createServiceClient();
  const { data: existing, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', payload.fileId)
    .single();

  if (error) throw error;
  if (existing.booking_id !== payload.bookingId) {
    throw new Error('Replace ticket does not match file');
  }

  if (source === 'client_portal') {
    if (existing.uploaded_via !== 'client_portal') {
      const err = new Error('You can only replace files you uploaded');
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  await assertObjectExists(supabase, payload.storageKey);

  const nextVersion = (existing.version || 1) + 1;
  const rootId = existing.parent_file_id || existing.id;

  const asset = await insertUploadedAsset({
    supabase,
    bookingId: existing.booking_id,
    category: existing.category,
    storedFilename: payload.storedFilename,
    storageKey: payload.storageKey,
    originalFilename: payload.originalFilename,
    mimeType: payload.mimeType,
    fileSize: payload.fileSize,
    description: existing.description,
    actor,
    source,
    version: nextVersion,
    parentFileId: rootId,
  });

  await supabase
    .from('file_assets')
    .update({ is_removed: true, removed_at: new Date().toISOString() })
    .eq('id', existing.id);

  await logActivity({
    bookingId: existing.booking_id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role || 'admin',
    action: 'file_replaced',
    section: 'files',
    fieldName: existing.category,
    previousValue: {
      id: existing.id,
      filename: existing.original_filename,
      version: existing.version,
    },
    newValue: { id: asset.id, filename: asset.original_filename, version: asset.version },
    source,
  });

  return asset;
}

/** @deprecated Prefer prepareDirectUploads + completeDirectUploads (Vercel-safe). */
export async function uploadFiles({
  bookingId,
  category,
  files,
  actor,
  source = 'admin_portal',
  description = null,
}) {
  const supabase = createServiceClient();
  const results = [];

  for (const file of files) {
    const validation = validateFileUpload(file, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES);
    if (!validation.valid) {
      results.push({
        success: false,
        filename: file.name,
        errors: validation.errors,
      });
      continue;
    }

    const scan = await scanFileForMalware(file);
    if (!scan.clean) {
      results.push({
        success: false,
        filename: file.name,
        errors: ['File failed malware scan'],
      });
      continue;
    }

    try {
      const { storedFilename, storageKey } = buildStorageKey(bookingId, category, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const asset = await insertUploadedAsset({
        supabase,
        bookingId,
        category,
        storedFilename,
        storageKey,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        description,
        actor,
        source,
      });

      await markCategoryUploaded(supabase, bookingId, category);

      await logActivity({
        bookingId,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role || 'admin',
        action: 'file_uploaded',
        section: 'files',
        fieldName: category,
        newValue: {
          id: asset.id,
          filename: asset.original_filename,
          size: asset.file_size,
        },
        source,
      });

      if (source === 'client_portal') {
        await notifyAdmins(
          bookingId,
          'client_uploaded_files',
          'Client uploaded files',
          `${actor.name} uploaded ${file.name} to ${category}.`
        );
      }

      results.push({ success: true, file: asset });
    } catch (err) {
      results.push({
        success: false,
        filename: file.name,
        errors: [err.message || 'Upload failed'],
      });
    }
  }

  return results;
}

export async function replaceFile({ fileId, file, actor, source = 'admin_portal' }) {
  const slot = await prepareDirectReplace({ fileId, file, source });
  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(slot.path, slot.token, buffer, { contentType: file.type });
  if (uploadError) throw uploadError;
  return completeDirectReplace({ ticket: slot.ticket, actor, source });
}


export async function softDeleteFile({ fileId, actor, source = 'admin_portal' }) {
  const supabase = createServiceClient();

  const { data: existing, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) throw error;

  if (source === 'client_portal') {
    if (existing.uploaded_via !== 'client_portal') {
      const err = new Error('You can only remove files you uploaded');
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (existing.status === 'under_review') {
      const err = new Error('This file is under review and cannot be removed');
      err.code = 'FORBIDDEN';
      throw err;
    }
    if (existing.status === 'approved') {
      const err = new Error('This file is approved and cannot be removed');
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  const { data, error: updateError } = await supabase
    .from('file_assets')
    .update({
      is_removed: true,
      removed_at: new Date().toISOString(),
      removed_by: actor.id || null,
    })
    .eq('id', fileId)
    .select()
    .single();

  if (updateError) throw updateError;

  await logActivity({
    bookingId: existing.booking_id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role || 'admin',
    action: 'file_removed',
    section: 'files',
    fieldName: existing.category,
    previousValue: { id: existing.id, filename: existing.original_filename },
    source,
  });

  if (source === 'client_portal') {
    await notifyAdmins(
      existing.booking_id,
      'client_removed_file',
      'Client removed a file',
      `${actor.name} marked ${existing.original_filename} for removal.`
    );
  }

  return data;
}

export async function restoreFile({ fileId, actor }) {
  const supabase = createServiceClient();

  const { data: existing, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) throw error;

  const { data, error: updateError } = await supabase
    .from('file_assets')
    .update({
      is_removed: false,
      removed_at: null,
      removed_by: null,
    })
    .eq('id', fileId)
    .select()
    .single();

  if (updateError) throw updateError;

  await logActivity({
    bookingId: existing.booking_id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: 'file_restored',
    section: 'files',
    fieldName: existing.category,
    newValue: { id: existing.id, filename: existing.original_filename },
    source: 'admin_portal',
  });

  return data;
}

export async function updateFileMeta({ fileId, updates, actor }) {
  const supabase = createServiceClient();
  const allowed = {};
  if (updates.description != null) allowed.description = updates.description;
  if (updates.original_filename != null) allowed.original_filename = updates.original_filename;
  if (updates.status != null) allowed.status = updates.status;
  if (updates.category != null) allowed.category = updates.category;

  const { data: existing } = await supabase.from('file_assets').select('*').eq('id', fileId).single();

  const { data, error } = await supabase
    .from('file_assets')
    .update(allowed)
    .eq('id', fileId)
    .select()
    .single();

  if (error) throw error;

  if (updates.status && updates.status !== existing.status) {
    await logActivity({
      bookingId: existing.booking_id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'admin',
      action: 'file_status_changed',
      section: 'files',
      fieldName: existing.category,
      previousValue: existing.status,
      newValue: updates.status,
      source: 'admin_portal',
      metadata: { fileId, filename: existing.original_filename },
    });
  }

  return data;
}

export async function updateCategoryStatus({ bookingId, category, status, actor }) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('file_category_statuses')
    .upsert(
      {
        booking_id: bookingId,
        category,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id,category' }
    )
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    bookingId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: 'category_status_changed',
    section: 'files',
    fieldName: category,
    newValue: status,
    source: 'admin_portal',
  });

  return data;
}

export async function getSignedDownloadUrl(fileId, expiresIn = 3600) {
  const supabase = createServiceClient();
  const { data: file, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_key, expiresIn);

  if (signError) throw signError;

  return { url: data.signedUrl, file };
}

/** Download file bytes from storage for server-side parsing. */
export async function downloadFileBuffer(fileId) {
  const supabase = createServiceClient();
  const { data: file, error } = await supabase
    .from('file_assets')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) throw error;
  if (!file || file.is_removed) {
    const err = new Error('File not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { data, error: dlError } = await supabase.storage.from(BUCKET).download(file.storage_key);
  if (dlError || !data) {
    throw new Error(dlError?.message || 'Could not download file from storage');
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    buffer,
    filename: file.original_filename || 'document.xlsx',
    mimeType: file.mime_type || '',
    file,
  };
}

export async function listFileVersions(fileId) {
  const supabase = createServiceClient();
  const { data: file } = await supabase.from('file_assets').select('*').eq('id', fileId).single();
  if (!file) return [];

  const rootId = file.parent_file_id || file.id;

  const { data, error } = await supabase
    .from('file_assets')
    .select('*')
    .or(`id.eq.${rootId},parent_file_id.eq.${rootId}`)
    .order('version', { ascending: false });

  if (error) throw error;
  return data;
}
