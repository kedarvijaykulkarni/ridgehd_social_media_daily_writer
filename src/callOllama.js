import { VIDEO_SEGMENTS, footagePrefix } from './buildVideoScriptPrompt.js';
import { isProductFootage } from './videoCharacter.js';

const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'gemma4:latest';
const REQUIRED_FIELDS = ['core_message', 'hook_line', 'call_to_action', 'image_prompt'];
// The article's structural spine — a small local model routinely drops one
// of the softer fields (cta, dek, meta_description...). Those degrade
// gracefully in the renderers, so only title + sections are hard failures.
const ARTICLE_REQUIRED_STRINGS = ['title'];
const ARTICLE_OPTIONAL_STRINGS = ['dek', 'linkedin_hook', 'meta_description', 'slug', 'cta', 'pillar'];

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

const OPTIONAL_STRING_ARRAYS = ['hashtags_broad_niche', 'hashtags_saas_niche', 'reddit_relevant_subreddits'];

// Short-form shape. Exported for unit tests. The optional arrays are
// normalised to arrays of non-empty strings: a model that returns "#a #b" or
// [null] used to pass here and then crash a formatter outside the retry.
export function validateShape(obj) {
  const missing = REQUIRED_FIELDS.filter((f) => typeof obj[f] !== 'string' || !obj[f].trim());
  if (missing.length) {
    throw new Error(`Ollama response missing required field(s): ${missing.join(', ')}`);
  }
  for (const f of OPTIONAL_STRING_ARRAYS) {
    obj[f] = Array.isArray(obj[f]) ? obj[f].filter((v) => typeof v === 'string' && v.trim()) : [];
  }
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

// Product Hunt forum post shape (see buildProductHuntPrompt.js). `title`
// and `body` are hard requirements; `cta` is optional and normalised to
// absent when blank, same posture as the article's soft fields.
export function validateProductHuntShape(obj) {
  const missing = ['title', 'body'].filter((f) => typeof obj[f] !== 'string' || !obj[f].trim());
  if (missing.length) {
    throw new Error(`Ollama Product Hunt response missing required field(s): ${missing.join(', ')}`);
  }
  if (typeof obj.cta !== 'string' || !obj.cta.trim()) delete obj.cta;
  return obj;
}

// Small models loop: the same voice-over line pasted into two blocks. Returns
// the first pair of 0-based indexes whose lines are identical or near-identical
// (word-set overlap >= 0.8), else null. Exported for unit tests.
export function findRepeatedAudio(lines) {
  const words = lines.map((l) => new Set(String(l).toLowerCase().match(/[a-z0-9']+/g) ?? []));
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const shared = [...words[i]].filter((w) => words[j].has(w)).length;
      const union = words[i].size + words[j].size - shared;
      if (union && shared / union >= 0.8) return [i, j];
    }
  }
  return null;
}

// Video script shape (see buildVideoScriptPrompt.js): exactly one
// { visual, audio } pair per 10-second block. Exported for unit tests.
// `mode: 'product'` also checks the real-footage blocks: they must open with
// footagePrefix and carry no quoted UI text or numbers (a best-effort guard
// against invented UI — CLAUDE.md rule 4 — not proof the brief is accurate).
export function validateVideoScriptShape(obj, segmentCount = VIDEO_SEGMENTS.length, { withWardrobe = false, mode = 'none', productName = 'RidgeHQ' } = {}) {
  if (!Array.isArray(obj.segments) || obj.segments.length !== segmentCount) {
    throw new Error(`Ollama video script must have exactly ${segmentCount} segments`);
  }
  const bibleKeys = withWardrobe ? ['setting', 'look', 'camera', 'voice', 'wardrobe'] : ['setting', 'look', 'camera', 'voice'];
  const missingBible = bibleKeys.find(
    (k) => typeof obj.bible?.[k] !== 'string' || !obj.bible[k].trim(),
  );
  if (missingBible) throw new Error(`Ollama video script bible is missing "${missingBible}"`);
  const filled = (v) => typeof v === 'string' && v.trim();
  const bad = obj.segments.findIndex((s) => !s || !filled(s.visual) || !filled(s.audio) || !filled(s.ends_on));
  if (bad !== -1) {
    throw new Error(`Ollama video script segment ${bad} is missing a visual, audio or ends_on line`);
  }
  const prefix = footagePrefix(productName).toLowerCase();
  const badFootage = obj.segments.findIndex(
    (s, i) => isProductFootage(mode, i) && (!s.visual.trim().toLowerCase().startsWith(prefix) || /["“”0-9$€£%]/.test(s.visual)),
  );
  if (badFootage !== -1) {
    throw new Error(
      `Ollama video script segment ${badFootage} is product footage: its visual must start with "${footagePrefix(productName)}" and contain no quoted UI text or numbers`,
    );
  }
  const dup = findRepeatedAudio(obj.segments.map((s) => s.audio));
  if (dup) {
    throw new Error(
      `Ollama video script segments ${dup[0]} and ${dup[1]} repeat the same dialogue — every block needs a new line that advances the story`,
    );
  }
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
    return await withClaimFeedback(validate(parseModelResponse(first)), prompt, opts, validate, (p) =>
      requestOllama(host, model, p),
    );
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

// A shape-valid answer can still break the CLAIM RULES — the 2026-11-07
// runs kept writing "integrated", "replace", "ensuring" despite the bans.
// `opts.claimCheck(obj)` returns the offending excerpts; if there are any,
// ask once more and quote them back. The model's second answer is kept if
// it is shape-valid (whatever flags remain are shown to the reviewer);
// otherwise the first answer is kept, so drift never fails the run.
async function withClaimFeedback(obj, prompt, opts, validate, ask) {
  const problems = opts.claimCheck?.(obj) ?? [];
  if (!problems.length) return obj;
  opts.onClaimRetry?.(problems.length);
  const retry =
    `${prompt}\n\nYour previous answer broke the CLAIM RULES with these phrases:\n` +
    problems.slice(0, 12).map((p) => `- "${p}"`).join('\n') +
    `\nRewrite it without them and without any other unapproved claim. ` +
    `Return ONLY one complete, valid JSON object with every required key present.`;
  try {
    return validate(parseModelResponse(await ask(retry)));
  } catch {
    return obj;
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

// Video script: the 1-minute script object (buildVideoScriptPrompt).
// `opts.withWardrobe`: a presenter is on screen, so the bible must fix an outfit.
// `opts.mode` / `opts.productName`: product mode validates the footage blocks.
export async function callOllamaVideoScript(prompt, opts = {}) {
  const { withWardrobe, mode, productName } = opts;
  return requestParsed(prompt, opts, (obj) => validateVideoScriptShape(obj, undefined, { withWardrobe, mode, productName }));
}

// Product Hunt forum post: the { title, body, cta? } object (buildProductHuntPrompt).
export async function callOllamaProductHunt(prompt, opts = {}) {
  return requestParsed(prompt, opts, validateProductHuntShape);
}
