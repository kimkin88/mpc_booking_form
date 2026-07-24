import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import {
  DOCUMENT_PARSE_LIMITS,
  parseBookingDocumentSmart,
} from '@/services/documentParseService';
import { hasOpenAi } from '@/services/openaiDocumentParse';

const ALLOWED_EXT = /\.(xlsx|xls|csv)$/i;
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/octet-stream',
]);

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    const sheetName = form.get('sheetName') ? String(form.get('sheetName')) : null;
    const useAiRaw = form.get('useAi');
    const useAi = useAiRaw != null && String(useAiRaw) !== '0' && String(useAiRaw) !== 'false';

    if (!file || typeof file === 'string') {
      return jsonError('Upload an Excel media plan or brief (.xlsx)', 400);
    }

    const filename = file.name || 'document.xlsx';
    if (!ALLOWED_EXT.test(filename)) {
      return jsonError('Only .xlsx, .xls, or .csv files are supported', 400);
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      if (
        file.type !== '' &&
        !file.type.includes('sheet') &&
        !file.type.includes('excel') &&
        file.type !== 'text/csv'
      ) {
        return jsonError('Unsupported file type', 400);
      }
    }
    if (file.size > DOCUMENT_PARSE_LIMITS.MAX_BYTES) {
      return jsonError('File too large (max 15MB)', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseBookingDocumentSmart(buffer, { filename, sheetName, useAi });

    if (
      parsed.documentType === 'unknown' &&
      !(parsed.sites?.length || parsed.fields?.brand || parsed.fields?.campaign_name)
    ) {
      return jsonError(
        'Could not recognise this spreadsheet. Use an OOH media plan (CLIENT / CAMPAIGN NAME / MARKET) or an MPC brief (KPI / Site list).',
        422
      );
    }

    return jsonOk({
      ...parsed,
      openaiConfigured: hasOpenAi(),
    });
  } catch (err) {
    console.error('parse-document', err);
    return jsonError(err.message || 'Failed to parse document', 400, { code: err.code });
  }
}
