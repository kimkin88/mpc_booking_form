import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import {
  DOCUMENT_PARSE_LIMITS,
  parseBookingDocumentSmart,
} from '@/services/documentParseService';
import { hasOpenAi } from '@/services/openaiDocumentParse';
import { downloadFileBuffer } from '@/services/fileService';

const ALLOWED_EXT = /\.(xlsx|xls|csv)$/i;
const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/octet-stream',
]);

function assertRecognized(parsed) {
  if (
    parsed.documentType === 'unknown' &&
    !(parsed.sites?.length || parsed.fields?.brand || parsed.fields?.campaign_name)
  ) {
    const err = new Error(
      'Could not recognise this spreadsheet. Use an OOH media plan (CLIENT / CAMPAIGN NAME / MARKET) or an MPC brief (KPI / Site list).'
    );
    err.status = 422;
    throw err;
  }
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const form = await request.formData();
    const sheetName = form.get('sheetName') ? String(form.get('sheetName')) : null;
    const useAiRaw = form.get('useAi');
    const useAi = useAiRaw != null && String(useAiRaw) !== '0' && String(useAiRaw) !== 'false';
    const fileId = form.get('fileId') ? String(form.get('fileId')) : null;

    let buffer;
    let filename;

    if (fileId) {
      const downloaded = await downloadFileBuffer(fileId);
      buffer = downloaded.buffer;
      filename = downloaded.filename;
      if (!ALLOWED_EXT.test(filename)) {
        return jsonError('Only .xlsx, .xls, or .csv files can be used for autofill', 400);
      }
      if (buffer.length > DOCUMENT_PARSE_LIMITS.MAX_BYTES) {
        return jsonError('File too large (max 15MB)', 400);
      }
    } else {
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return jsonError('Upload an Excel media plan or brief (.xlsx), or pass fileId', 400);
      }

      filename = file.name || 'document.xlsx';
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

      buffer = Buffer.from(await file.arrayBuffer());
    }

    const parsed = await parseBookingDocumentSmart(buffer, { filename, sheetName, useAi });
    assertRecognized(parsed);

    return jsonOk({
      ...parsed,
      sourceFilename: filename,
      openaiConfigured: hasOpenAi(),
    });
  } catch (err) {
    console.error('parse-document', err);
    const status = err.status || (err.code === 'NOT_FOUND' ? 404 : 400);
    return jsonError(err.message || 'Failed to parse document', status, { code: err.code });
  }
}
