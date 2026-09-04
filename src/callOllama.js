const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma4:latest';
const REQUIRED_FIELDS = ['core_message', 'hook_line', 'call_to_action', 'image_prompt'];
// The article's structural spine — a small local model routinely drops one
// of the softer fields (cta, dek, meta_description...). Those degrade
// gracefully in the renderers, so only title + sections are hard failures.
const ARTICLE_REQUIRED_STRINGS = ['title'];
const ARTICLE_OPTIONAL_STRINGS = ['dek', 'linkedin_hook', 'meta_description', 'slug', 'cta'];

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

// Long-form article shape (see buildArticlePrompt.js). Exported so it can be
// unit-tested without a running model. Only `title` and a non-empty
// `sections` array are hard requirements; softer fields are normalised to
// absent (the renderers guard for that) rather than throwing.
export function validateArticleShape(obj) {
  const missing = ARTICLE_REQUIRED_STRINGS.filter((f) => typeof obj[f] !== 'string' || !obj[f].trim());
  if (missing.length) {
    throw new Error(`Ollama article response missing required field(s): ${missing.join(', ')}`);
  }
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    throw new Error('Ollama article response has no sections');
  }
  const badSection = obj.sections.findIndex(
    (s) => !s || typeof s.heading !== 'string' || !s.heading.trim() || typeof s.body !== 'string' || !s.body.trim(),
  );
  if (badSection !== -1) {
    throw new Error(`Ollama article response section ${badSection} is missing a heading or body`);
  }
  for (const f of ARTICLE_OPTIONAL_STRINGS) {
    if (typeof obj[f] !== 'string' || !obj[f].trim()) delete obj[f];
  }
  obj.tags = Array.isArray(obj.tags) ? obj.tags : [];
  obj.key_takeaways = Array.isArray(obj.key_takeaways) ? obj.key_takeaways : [];
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

// Shared: send the prompt, parse the JSON defensively (the model may wrap it
// in markdown fences or add stray text), and retry once with a stricter
// "JSON only" follow-up if parsing/validation fails the first time.
async function requestParsed(prompt, opts, validate) {
  const host = opts.host ?? process.env.OLLAMA_HOST ?? DEFAULT_HOST;
  const model = opts.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  const first = await requestOllama(host, model, prompt);
  try {
    return validate(parseModelResponse(first));
  } catch (firstErr) {
    const stricter =
      `${prompt}\n\nYour previous response was rejected: ${firstErr.message}. ` +
      `Return ONLY one complete, valid JSON object with every required key present. ` +
      `No markdown fences. No preamble. No explanation before or after the JSON.`;
    const second = await requestOllama(host, model, stricter);
    try {
      return validate(parseModelResponse(second));
    } catch (secondErr) {
      throw new Error(
        `Failed to parse Ollama response as JSON after retry. First attempt: ${firstErr.message}. Retry attempt: ${secondErr.message}`,
      );
    }
  }
}

// Short-form: the 4-platform shared object (Prompt 2 template).
export async function callOllama(prompt, opts = {}) {
  return requestParsed(prompt, opts, validateShape);
}

// Long-form: the article object (buildArticlePrompt).
export async function callOllamaArticle(prompt, opts = {}) {
  return requestParsed(prompt, opts, validateArticleShape);
}
