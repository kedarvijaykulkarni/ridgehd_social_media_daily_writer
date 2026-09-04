const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma4:latest';
const REQUIRED_FIELDS = ['core_message', 'hook_line', 'call_to_action', 'image_prompt'];

function stripCodeFences(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseModelResponse(raw) {
  const stripped = stripCodeFences(raw);
  try {
    return JSON.parse(stripped);
  } catch {
    const extracted = extractFirstJsonObject(stripped);
    if (!extracted) throw new Error('No JSON object found in Ollama response');
    return JSON.parse(extracted);
  }
}

function validateShape(obj) {
  const missing = REQUIRED_FIELDS.filter((f) => typeof obj[f] !== 'string' || !obj[f].trim());
  if (missing.length) {
    throw new Error(`Ollama response missing required field(s): ${missing.join(', ')}`);
  }
  obj.hashtags_broad_niche ??= [];
  obj.hashtags_saas_niche ??= [];
  obj.reddit_relevant_subreddits ??= [];
  return obj;
}

async function requestOllama(host, model, prompt) {
  let res;
  try {
    res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
    });
  } catch (err) {
    throw new Error(`Could not reach Ollama at ${host}: ${err.message}. Is "ollama serve" running?`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}. ${body}`.trim());
  }
  const data = await res.json();
  return data.response ?? '';
}

// Calls local Ollama with the rendered Prompt 2 template, parses the JSON
// response defensively (the model may wrap it in markdown fences or add
// stray text), and retries once with a stricter "JSON only" follow-up if
// parsing fails the first time.
export async function callOllama(prompt, opts = {}) {
  const host = opts.host ?? process.env.OLLAMA_HOST ?? DEFAULT_HOST;
  const model = opts.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  const first = await requestOllama(host, model, prompt);
  try {
    return validateShape(parseModelResponse(first));
  } catch (firstErr) {
    const stricter = `${prompt}\n\nYour previous response could not be parsed as JSON. Return ONLY a single valid JSON object. No markdown fences. No preamble. No explanation before or after the JSON.`;
    const second = await requestOllama(host, model, stricter);
    try {
      return validateShape(parseModelResponse(second));
    } catch (secondErr) {
      throw new Error(
        `Failed to parse Ollama response as JSON after retry. First attempt: ${firstErr.message}. Retry attempt: ${secondErr.message}`,
      );
    }
  }
}
