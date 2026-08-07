import { jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import { getSignedDownloadUrl, listFileVersions } from '@/services/fileService';

export async function GET(request, { params }) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'download';

    if (mode === 'versions') {
      const versions = await listFileVersions(fileId);
      if (!versions.length) return jsonOk([]);
      const gate = await requireBookingAccess(versions[0].booking_id);
      if (gate.error) return gate.error;
      return jsonOk(versions);
    }

    const { url, file } = await getSignedDownloadUrl(fileId);
    const gate = await requireBookingAccess(file.booking_id);
    if (gate.error) return gate.error;
    return jsonOk({ url, filename: file.original_filename, mime_type: file.mime_type });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
