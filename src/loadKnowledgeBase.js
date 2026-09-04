// Runtime knowledge-base loader.
//
// Before this repo was split out of the aquarosters monorepo, the topic list
// was a checked-in `../../marketing/knowledge-base.json` produced by a
// separate Claude pass (see docs/prompt-1-*.md). That file is gone. Instead
// this module reads the RidgeHQ business Obsidian vault directly at runtime
// and extracts topic chunks from its wiki pages.
//
// This is deliberately heuristic markdown scraping, not a parser with a
// grammar. It keys off the exact section markers the vault uses today:
//   - wiki/business-context.md §2 "✅ Solid and verifiable — sell on this:"
//     bullet list            -> status: "shipped"
//   - wiki/business-context.md §2 "❌ Not yet sellable" table rows
//                            -> status: "planned"  (rows whose consequence
//                               says "do not market/claim" are skipped —
//                               roadmap copy about them is still a claim the
//                               vault says not to make)
//   - wiki/competitors.md §5  -> the one unclaimed differentiator (AI copilot)
//   - wiki/pricing.md §3      -> the published flat-pricing / 0%-commission line
//
// If the vault's headings or markers change, extraction degrades — the loader
// throws rather than silently emitting an empty or wrong list. See
// docs/business-context-reference.md.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const BUSINESS_CONTEXT = path.join('wiki', 'business-context.md');
const COMPETITORS = path.join('wiki', 'competitors.md');
const PRICING = path.join('wiki', 'pricing.md');

// --- small text helpers ---------------------------------------------------

function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [label](url) -> label
    .replace(/[*_`~]+/g, '') // bold/italic/code/strike marks
    .replace(/\s+/g, ' ')
    .trim();
}

// First clause of a bullet, before an em/en-dash aside or a trailing colon.
function toHeadline(text) {
  const clean = stripMarkdown(text);
  const cut = clean.split(/\s+[—–]\s+/)[0].replace(/:\s*$/, '').trim();
  const headline = cut.length >= 12 ? cut : clean;
  return headline.length > 160 ? `${headline.slice(0, 157).trimEnd()}...` : headline;
}

function toDetail(text) {
  const clean = stripMarkdown(text);
  return clean.length > 480 ? `${clean.slice(0, 477).trimEnd()}...` : clean;
}

function toSlug(text) {
  const base = stripMarkdown(text)
    .split(/\s+[—–]\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = base.split('-').filter(Boolean).slice(0, 8).join('-');
  return slug.slice(0, 60).replace(/-+$/g, '');
}

function categoryFor(text) {
  const t = text.toLowerCase();
  if (/0%\s*commission|flat (monthly )?pricing|per-staff|per staff|seat shock/.test(t)) return 'pricing-model';
  if (/\brls\b|multi-tenan|database level|immutab|permission|audit trail/.test(t)) return 'architecture';
  if (/\bvs\.|contrast|built-in vs|unclaimed|differentiat/.test(t)) return 'differentiator';
  return 'feature';
}

const AUDIENCE_ANGLE = {
  shipped: 'Dive center operators can rely on this today when moving off spreadsheets or a legacy booking tool.',
  planned: 'On the roadmap for dive center operators — present it as coming soon, never as available today.',
  unverified: 'Not yet verified against the codebase — present cautiously, never as a firm capability claim.',
};

function visualThemeFor(headline) {
  const short = headline
    .split(' ')
    .slice(0, 8)
    .join(' ')
    .replace(/[,;:.\s]+$/, '');
  return `${short} — dive center setting, no text, no UI chrome, no logos`;
}

function makeChunk({ id, category, status, headline, detail }) {
  return {
    id,
    category,
    status,
    headline,
    detail: detail && detail.length >= headline.length ? detail : headline,
    audience_angle: AUDIENCE_ANGLE[status] ?? AUDIENCE_ANGLE.unverified,
    suggested_visual_theme: visualThemeFor(headline),
  };
}

// --- section extraction -------------------------------------------------

// Body of the "## 2. ..." section, up to the next "## " heading.
function sectionTwo(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+2\./.test(l));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

function bulletsAfterMarker(lines, markerRe) {
  const markerIdx = lines.findIndex((l) => markerRe.test(l));
  if (markerIdx === -1) return [];
  const out = [];
  for (let i = markerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*[-*]\s+/.test(line)) {
      out.push(line.replace(/^\s*[-*]\s+/, '').trim());
    } else if (out.length && line.trim() === '') {
      // allow a single blank line inside the list, then stop if the next
      // non-blank isn't a bullet
      const next = lines.slice(i + 1).find((l) => l.trim() !== '');
      if (!next || !/^\s*[-*]\s+/.test(next)) break;
    } else if (out.length) {
      break;
    }
  }
  return out;
}

function tableRowsAfterMarker(lines, markerRe) {
  const markerIdx = lines.findIndex((l) => markerRe.test(l));
  if (markerIdx === -1) return [];
  const rows = [];
  let seenTable = false;
  for (let i = markerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      seenTable = true;
      const cells = line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c) || c === '');
      const isHeader = /gap/i.test(cells[0]) && /consequence/i.test(cells[1] ?? '');
      if (!isSeparator && !isHeader) rows.push(cells);
    } else if (seenTable && line === '') {
      // blank line after the table ends it
      const next = lines.slice(i + 1).find((l) => l.trim() !== '');
      if (!next || !next.trim().startsWith('|')) break;
    } else if (seenTable) {
      break;
    }
  }
  return rows;
}

function extractFromBusinessContext(markdown) {
  const lines = sectionTwo(markdown);
  if (!lines) return [];
  const chunks = [];

  for (const bullet of bulletsAfterMarker(lines, /✅.*sell on this/i)) {
    const headline = toHeadline(bullet);
    if (!headline) continue;
    chunks.push(
      makeChunk({
        id: toSlug(bullet) || `shipped-topic-${chunks.length + 1}`,
        category: categoryFor(bullet),
        status: 'shipped',
        headline,
        detail: toDetail(bullet),
      }),
    );
  }

  for (const [gap, consequence = ''] of tableRowsAfterMarker(lines, /❌.*not yet sellable/i)) {
    if (/do not (market|claim)/i.test(consequence)) continue; // vault says: not even as roadmap
    const headline = toHeadline(gap);
    if (!headline) continue;
    chunks.push(
      makeChunk({
        id: toSlug(gap) || `planned-topic-${chunks.length + 1}`,
        category: categoryFor(gap),
        status: 'planned',
        headline,
        detail: toDetail(`${gap} — ${consequence}`),
      }),
    );
  }

  return chunks;
}

function extractDifferentiator(markdown) {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const claimed = lines.some((l) => /ai copilot/i.test(l) && /unclaimed/i.test(l));
  if (!claimed) return [];
  const defensible = lines.find((l) => /ai built into the core/i.test(l));
  return [
    makeChunk({
      id: 'ai-copilot-in-the-operational-core',
      category: 'differentiator',
      status: 'shipped',
      headline: 'An AI copilot built into the operational core, not a bolted-on chatbot',
      detail: defensible
        ? toDetail(defensible.replace(/^\s*\d+\.\s*/, ''))
        : 'The AI copilot runs through the same code paths and permission checks as the UI, with an audit trail separating AI-initiated from human actions. No competitor offers this.',
    }),
  ];
}

function extractPricing(markdown) {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const headlineLine =
    lines.find((l) => /page headline:/i.test(l)) ||
    lines.find((l) => /simple pricing for real operators/i.test(l));
  if (!headlineLine) return [];
  const sentence = stripMarkdown(headlineLine.replace(/.*page headline:\s*/i, '')).replace(/^["'“”]+|["'“”]+$/g, '');
  const tiers = lines
    .filter((l) => /\|/.test(l) && /€\s?\d+/.test(l) && /(starter|grow|scale)/i.test(l))
    .map((l) => stripMarkdown(l).replace(/\s*\|\s*/g, ' · ').replace(/^·\s*|\s*·$/g, ''));
  return [
    makeChunk({
      id: 'flat-monthly-pricing-zero-commission',
      category: 'pricing-model',
      status: 'shipped',
      headline: 'Flat monthly pricing with 0% commission on direct bookings',
      detail: toDetail([sentence, ...tiers].filter(Boolean).join(' ')),
    }),
  ];
}

// --- public API -------------------------------------------------------

async function readIfPresent(filePath) {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Read the RidgeHQ business vault and return topic chunks in the same shape
 * the old knowledge-base.json used:
 *   { id, category, status, headline, detail, audience_angle, suggested_visual_theme }
 *
 * @param {string} vaultPath absolute path to the Obsidian vault root
 *   (the directory that contains `wiki/`)
 * @returns {Promise<Array>}
 */
export async function loadKnowledgeBase(vaultPath) {
  let dirStat;
  try {
    dirStat = await stat(vaultPath);
  } catch {
    throw new Error(
      `Business vault not found at ${vaultPath}. Set BUSINESS_VAULT_PATH in .env to your local RidgeHQ vault checkout.`,
    );
  }
  if (!dirStat.isDirectory()) {
    throw new Error(`BUSINESS_VAULT_PATH (${vaultPath}) is not a directory.`);
  }

  const businessContext = await readIfPresent(path.join(vaultPath, BUSINESS_CONTEXT));
  if (businessContext === null) {
    throw new Error(
      `Business vault at ${vaultPath} is missing ${BUSINESS_CONTEXT}. This is the primary topic source; check BUSINESS_VAULT_PATH.`,
    );
  }

  const [competitors, pricing] = await Promise.all([
    readIfPresent(path.join(vaultPath, COMPETITORS)),
    readIfPresent(path.join(vaultPath, PRICING)),
  ]);

  const raw = [
    ...extractFromBusinessContext(businessContext),
    ...extractDifferentiator(competitors),
    ...extractPricing(pricing),
  ];

  // De-duplicate ids deterministically (order is stable, so suffixes are too).
  const seen = new Set();
  const chunks = raw
    .filter((c) => c.headline && c.headline.trim())
    .map((c) => {
      let id = c.id || 'topic';
      if (seen.has(id)) {
        let n = 2;
        while (seen.has(`${id}-${n}`)) n += 1;
        id = `${id}-${n}`;
      }
      seen.add(id);
      return { ...c, id };
    });

  if (chunks.length === 0) {
    throw new Error(
      `Parsed no topic chunks from the business vault (${BUSINESS_CONTEXT} §2). ` +
        `Have the "✅ ... sell on this" / "❌ Not yet sellable" markers in that file changed? ` +
        `See docs/business-context-reference.md.`,
    );
  }

  return chunks;
}
