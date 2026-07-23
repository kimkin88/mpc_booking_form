'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET = 'booking-files';

/**
 * Upload a File/Blob to a Supabase signed upload slot (direct-to-storage).
 * Used so large files bypass Vercel’s serverless request body limit.
 */
export async function uploadToSignedSlot(slot, file) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(slot.path, slot.token, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || `Upload failed for ${file.name || 'file'}`);
  }
}

export function fileMeta(file) {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
  };
}
