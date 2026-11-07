// `cover`: write ONLY video-cover-image.txt for an existing run folder, from
// its video-script.txt. No Ollama, no history change, other files untouched.
//
// An old script was written under that day's approvals, so it is judged by
// today's registry: its topic must still be offered, and the stored title,
// description and bible (which become the thumbnail prompt) are claim-checked.
// Extracted from index.js so it can be tested without a CLI process.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseVideoScript } from './lib/parseVideoScript.js';
import { renderVideoCoverPrompt } from './lib/renderVideoCoverPrompt.js';
import { loadKnowledgeBase } from './loadKnowledgeBase.js';
import { loadRegistry, assertPublicName, claimFlags, claimSources } from './claimRules.js';
import { localDateString } from './lib/localDate.js';

export async function writeCover({ outputDir, vaultPath, date, characterRef, productName, today = localDateString() }) {
  // Strict format: the value is joined into a path, so nothing like
  // "..\..\x" may reach the filesystem.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got "${date}"`);
  const runDir = path.join(outputDir, date);
  const parsed = parseVideoScript(await readFile(path.join(runDir, 'video-script.txt'), 'utf-8'));

  const registry = await loadRegistry(vaultPath);
  assertPublicName(registry, today, productName);
  const { chunks } = await loadKnowledgeBase(vaultPath, { today, registry });
  if (!chunks.some((c) => c.id === parsed.topic.id)) {
    throw new Error(
      `${date}'s video is about "${parsed.topic.id}", which is not approved for social in the registry today — ` +
        'no cover written. Generate a new run instead.',
    );
  }
  const flags = claimFlags(claimSources('stored title/description', { video: parsed.video, bible: parsed.bible }));

  // The presenter recorded in that day's script wins over today's .env, so
  // the cover shows the same person as the video; --character-ref is the
  // only override.
  const reference = characterRef?.trim() || parsed.reference;
  const identity = parsed.identity;
  const character = identity || reference ? { identity, reference } : null;
  const cover = renderVideoCoverPrompt({
    topic: parsed.topic, date, video: parsed.video, bible: parsed.bible, character, productName,
  });
  const warning = flags.length
    ? [
        `⚠️ CLAIM CHECK (heuristic, ${flags.length} flag(s)) — this cover reuses ${date}'s stored text; verify against the registry:`,
        ...flags.map((f) => `  ${f.rule}${f.total ? ` (${f.total} hits, first 3 shown)` : ''} — "…${f.excerpt}…"`),
        '',
        '',
      ].join('\n')
    : '';
  const out = path.join(runDir, 'video-cover-image.txt');
  await writeFile(out, warning + cover);
  return { out, flags };
}
