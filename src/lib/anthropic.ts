import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const MODEL = 'claude-sonnet-4-5';

const DEBUG = false;

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json|JSON)?\s*\n?/, '');
    t = t.replace(/```\s*$/, '');
  }
  return t.trim();
}

// Try to salvage a truncated JSON object/array by closing whatever scopes are open.
function trySalvageJson(text: string): string {
  let s = text.trim();
  if (!s) return s;

  // Trim to the last comma boundary that's not inside a string, then close brackets.
  const stack: string[] = [];
  let inStr = false;
  let escape = false;
  let lastSafeIdx = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}') stack.pop();
    else if (ch === ']') stack.pop();
    else if (ch === ',' && stack.length > 0) lastSafeIdx = i;
  }

  if (inStr) {
    // Truncate before the open string
    const lastQuote = s.lastIndexOf('"', s.length - 1);
    if (lastQuote > 0) s = s.slice(0, lastQuote);
  } else if (lastSafeIdx > 0) {
    s = s.slice(0, lastSafeIdx);
  }

  // Close any remaining stack
  while (stack.length > 0) {
    const open = stack.pop();
    s += open === '{' ? '}' : ']';
  }
  return s;
}

export async function callClaude<T = any>(
  systemPrompt: string,
  userJson: unknown,
  maxTokens: number = 16384
): Promise<T> {
  const userContent =
    typeof userJson === 'string'
      ? userJson
      : JSON.stringify(userJson, null, 2);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('No text content in Claude response');
  }
  const raw = block.text;
  const cleaned = stripFences(raw);

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[Claude raw]', raw.slice(0, 400), '…stop:', response.stop_reason);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstErr) {
    // Try to salvage truncated JSON (e.g. stop_reason === 'max_tokens')
    const salvaged = trySalvageJson(cleaned);
    try {
      return JSON.parse(salvaged) as T;
    } catch {
      throw new Error(
        `Failed to parse Claude JSON response (stop=${response.stop_reason}): ${(firstErr as Error).message}`
      );
    }
  }
}

export async function callClaudeText(
  systemPrompt: string,
  userJson: unknown,
  maxTokens: number = 2048
): Promise<string> {
  const userContent =
    typeof userJson === 'string'
      ? userJson
      : JSON.stringify(userJson, null, 2);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('No text content in Claude response');
  }
  return block.text;
}
