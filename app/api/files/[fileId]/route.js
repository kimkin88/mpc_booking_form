import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { getSignedDownloadUrl, listFileVersions } from '@/services/fileService';

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'download';

    if (mode === 'versions') {
      const versions = await listFileVersions(fileId);
      return jsonOk(versions);
    }

    const { url, file } = await getSignedDownloadUrl(fileId);
    return jsonOk({ url, filename: file.original_filename, mime_type: file.mime_type });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
