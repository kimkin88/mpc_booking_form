import { promises as fs } from 'fs';
import path from 'path';

const USAGE_PATH = path.join(process.cwd(), 'data', 'openai-usage.json');

const EMPTY = {
  totalTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  requestCount: 0,
  lastUsedAt: null,
  updatedAt: null,
};

async function ensureDir() {
  await fs.mkdir(path.dirname(USAGE_PATH), { recursive: true });
}

export async function getOpenAiUsage() {
  try {
    const raw = await fs.readFile(USAGE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY,
      ...parsed,
      totalTokens: Number(parsed.totalTokens) || 0,
      promptTokens: Number(parsed.promptTokens) || 0,
      completionTokens: Number(parsed.completionTokens) || 0,
      requestCount: Number(parsed.requestCount) || 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

/**
 * Record usage from an OpenAI chat.completions response `usage` object.
 * @param {{ prompt_tokens?: number, completion_tokens?: number, total_tokens?: number }|null} usage
 */
export async function recordOpenAiUsage(usage) {
  if (!usage) return getOpenAiUsage();

  const prompt = Number(usage.prompt_tokens) || 0;
  const completion = Number(usage.completion_tokens) || 0;
  const total =
    Number(usage.total_tokens) ||
    (prompt + completion > 0 ? prompt + completion : 0);

  if (total <= 0 && prompt <= 0 && completion <= 0) {
    return getOpenAiUsage();
  }

  await ensureDir();
  const current = await getOpenAiUsage();
  const next = {
    totalTokens: current.totalTokens + total,
    promptTokens: current.promptTokens + prompt,
    completionTokens: current.completionTokens + completion,
    requestCount: current.requestCount + 1,
    lastUsedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(USAGE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export async function resetOpenAiUsage() {
  await ensureDir();
  const next = {
    ...EMPTY,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(USAGE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}
