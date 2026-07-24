import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { getOpenAiUsage, resetOpenAiUsage } from '@/lib/openaiUsage';
import { hasOpenAi } from '@/services/openaiDocumentParse';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const usage = await getOpenAiUsage();
    return jsonOk({
      ...usage,
      openaiConfigured: hasOpenAi(),
    });
  } catch (err) {
    return jsonError(err.message || 'Failed to load usage', 500);
  }
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'reset') {
      return jsonError('Unknown action', 400);
    }
    const usage = await resetOpenAiUsage();
    return jsonOk({
      ...usage,
      openaiConfigured: hasOpenAi(),
    });
  } catch (err) {
    return jsonError(err.message || 'Failed to reset usage', 500);
  }
}
