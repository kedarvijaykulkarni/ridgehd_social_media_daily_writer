// Claim authority: the RidgeHQ Brain's approved-fact registry.
//
// business-context.md §2 says what is *built*; the registry
// (wiki/ai-operations/facts/registry.json, DECISIONS.md #165/#166) says what
// the owner has approved for *marketing*, per channel. Those differ: §2 lists
// scheduling, RLS, roles and the AI copilot as solid, but #165(4) says
// "waivers are the only feature claim approved for now; other feature and
// integration claims wait". So a topic is offered only when it maps to a
// fact that is accepted, public, allowed on social, not superseded and not
// past its review_by date (and, for feature.*, implemented and verified) —
// the export's approval filter in wiki/ai-operations/fact-registry.md, read
// from the registry directly because no export is committed yet (so there
// is no brain_revision provenance). Fail closed: no valid registry, no run.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const REGISTRY = path.join('wiki', 'ai-operations', 'facts', 'registry.json');
export const CHANNEL = 'social';

// Which registry fact makes each loader topic sellable. A topic missing here
// (a new §2 row, a ❌ roadmap row) is not offered until the owner approves a
// fact for it in the registry and it is mapped here.
// Not mapped on purpose: 'flat-monthly-pricing-zero-commission'. Its headline
// ("Flat monthly pricing with no per-staff seat shock") is no registry fact,
// and commission.direct-bookings is "a supporting point, not the headline" —
// it still reaches every draft through the CLAIM RULES approved facts. Map
// the pricing topic once the owner approves a flat-pricing fact for social.
export const TOPIC_FACTS = {
  'waiver-system': 'feature.waivers',
};

export async function loadRegistry(vaultPath) {
  const file = path.join(vaultPath, REGISTRY);
  let raw;
  try {
    raw = await readFile(file, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Business vault at ${vaultPath} is missing ${REGISTRY}. It decides which claims may be marketed ` +
          '(DECISIONS.md #165/#166); refusing to generate copy without it.',
      );
    }
    throw err;
  }
  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${REGISTRY} is not valid JSON: ${err.message}`);
  }
  const problems = registryProblems(registry);
  if (problems.length) {
    throw new Error(`${REGISTRY} is invalid, refusing to trust any of it:\n  - ${problems.join('\n  - ')}`);
  }
  return registry;
}

// Lower-case, dot-separated, at least two parts (brand.public-name).
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const STATES = {
  audience: ['public', 'internal'],
  decision: ['proposed', 'accepted', 'deferred', 'superseded'],
  implementation: ['unknown', 'absent', 'partial', 'implemented'],
  deployment: ['unknown', 'deployed'],
  verification: ['not-checked', 'source-inspected', 'automated-test', 'live-verified'],
  marketing: ['allowed', 'restricted', 'not-approved'],
};
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

function isRealDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= '2000-01-01' &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

// The subset of wiki/ai-operations/fact-registry.md's record rules that
// bears on approval: ids, statement, the five states, channels, dates,
// provenance (repo/revision, verification date, evidence) and supersession.
// One bad record rejects the whole registry: a half-valid list could
// silently drop a writing rule or approve a malformed claim. Full schema
// validation (source notes and headings exist, owner, secret patterns) is
// RidgeHQAPP's `scripts/ai_ops/brain_facts.py check`; it is not duplicated
// here, so the two cannot drift apart on rules this tool does not use.
export function registryProblems(registry) {
  if (registry?.schema_version !== 1) return [`schema_version must be 1, got ${JSON.stringify(registry?.schema_version)}`];
  if (!Array.isArray(registry.facts)) return ['"facts" must be an array'];
  const problems = [];
  const ids = new Set();
  for (const [i, f] of registry.facts.entries()) {
    const at = `facts[${i}]${typeof f?.id === 'string' ? ` (${f.id})` : ''}`;
    if (typeof f?.id !== 'string' || !ID_RE.test(f.id)) problems.push(`${at}: invalid id`);
    else if (ids.has(f.id)) problems.push(`${at}: duplicate id`);
    else ids.add(f.id);
    if (typeof f?.statement !== 'string' || !f.statement.trim()) problems.push(`${at}: missing statement`);
    if (!STATES.audience.includes(f?.audience)) problems.push(`${at}: invalid audience`);
    for (const key of ['decision', 'implementation', 'deployment', 'verification', 'marketing']) {
      if (!STATES[key].includes(f?.[key]?.state)) problems.push(`${at}: invalid ${key}.state`);
    }
    if (['partial', 'implemented'].includes(f?.implementation?.state) &&
        !(nonEmpty(f.implementation.repo) && nonEmpty(f.implementation.revision))) {
      problems.push(`${at}: implementation ${f.implementation.state} needs repo and revision`);
    }
    if (f?.deployment?.state === 'deployed' && !(nonEmpty(f.deployment.environment) && nonEmpty(f.deployment.revision))) {
      problems.push(`${at}: deployment deployed needs environment and revision`);
    }
    if (STATES.verification.includes(f?.verification?.state) && f.verification.state !== 'not-checked' &&
        !isRealDate(f.verification.date)) {
      problems.push(`${at}: verification ${f.verification.state} needs a real date`);
    }
    const checked = f?.decision?.state === 'accepted' ||
      ['partial', 'implemented'].includes(f?.implementation?.state) ||
      f?.deployment?.state === 'deployed' ||
      (f?.verification?.state && f.verification.state !== 'not-checked');
    if (checked && !(Array.isArray(f.evidence) && f.evidence.length && f.evidence.every(nonEmpty))) {
      problems.push(`${at}: evidence must be a non-empty list for accepted/implemented/deployed/verified records`);
    }
    const channels = f?.marketing?.channels;
    if (channels !== undefined && !(Array.isArray(channels) && channels.every((c) => typeof c === 'string'))) {
      problems.push(`${at}: marketing.channels must be an array of strings`);
    }
    if (f?.marketing?.state === 'allowed' && !(Array.isArray(channels) && channels.length)) {
      problems.push(`${at}: marketing allowed without channels`);
    }
    if (!isRealDate(f?.review_by)) problems.push(`${at}: review_by must be a real YYYY-MM-DD date`);
    if ((f?.decision?.state === 'superseded') !== Boolean(f?.superseded_by)) {
      problems.push(`${at}: superseded_by must be set exactly when decision.state is superseded`);
    }
  }
  const next = new Map(registry.facts.filter((f) => f?.superseded_by).map((f) => [f.id, f.superseded_by]));
  for (const [id, successor] of next) {
    if (!ids.has(successor)) {
      problems.push(`${id}: superseded_by names an unknown id`);
      continue;
    }
    const seen = new Set([id]);
    for (let cur = successor; next.has(cur); cur = next.get(cur)) {
      if (seen.has(cur)) {
        problems.push(`${id}: supersession chain loops back`);
        break;
      }
      seen.add(cur);
    }
  }
  return problems;
}

function current(fact, today) {
  return fact.decision.state === 'accepted' && !fact.superseded_by && fact.review_by >= today;
}

// Accepted, public facts allowed on social and still in date. As in the
// export, an allowed feature.* fact must also be implemented and verified.
export function approvedFacts(registry, today) {
  return registry.facts.filter(
    (f) =>
      current(f, today) &&
      f.audience === 'public' &&
      f.marketing.state === 'allowed' &&
      f.marketing.channels.includes(CHANNEL) &&
      (!f.id.startsWith('feature.') ||
        (f.implementation.state === 'implemented' && f.verification.state !== 'not-checked')),
  );
}

// Accepted internal writing rules ("do not claim AI actions are fully
// reversible", "AquaRoster is not a public name", ...).
export function writingRules(registry, today) {
  return registry.facts.filter((f) => current(f, today) && f.audience === 'internal');
}

// Splits loader chunks into the ones an approved fact covers and the rest.
// A kept chunk's detail becomes the fact's approved statement: the vault
// prose behind it can carry internal class names, unapproved claims (RLS)
// or competitor prices, while the statement is the owner's own wording.
export function gateTopics(chunks, registry, today) {
  const approved = new Map(approvedFacts(registry, today).map((f) => [f.id, f]));
  const kept = [];
  const dropped = [];
  for (const chunk of chunks) {
    const fact = approved.get(TOPIC_FACTS[chunk.id]);
    if (fact) kept.push({ ...chunk, fact_id: fact.id, detail: fact.statement });
    else dropped.push(chunk);
  }
  return { kept, dropped };
}

// The block every generation prompt carries. Verbatim registry wording: the
// approved statements are the only product claims the model may make; the
// internal writing rules are hard bans. `scope` is internal and never
// exported (fact-registry.md), so it is not shown to the model.
export function claimRulesBlock(registry, today, productName = 'RidgeHQ') {
  const approved = approvedFacts(registry, today);
  const rules = writingRules(registry, today);
  return [
    'CLAIM RULES (owner decisions — these override everything else in this prompt):',
    `- The ONLY product facts approved for public ${CHANNEL} copy about ${productName}:`,
    ...approved.map((f) => `  - ${f.statement}`),
    '- Do not present any other feature, integration, AI capability, plan price, number or',
    '  customer result as available — even if it appears elsewhere in this prompt as audience',
    '  context. Describe the operator\'s problem instead.',
    ...rules.map((f) => `- ${f.statement}`),
  ].join('\n');
}

// PRODUCT_NAME must be the registry's approved public name: with
// PRODUCT_NAME=AquaRoster the prompts said both "copywriter for AquaRoster"
// and "AquaRoster is not a public product name", and every draft header
// carried the banned name whatever the model did.
export function assertPublicName(registry, today, productName) {
  const brand = approvedFacts(registry, today).find((f) => f.id === 'brand.public-name');
  if (!brand) throw new Error(`${REGISTRY} has no current brand.public-name fact approved for ${CHANNEL}.`);
  // The record's statement form is "<Name> is the product's public name.":
  // compare against that name only, so "public" or "is" cannot pass.
  const approvedName = brand.statement.match(/^(.+?)\s+is the product's public name\.?$/)?.[1];
  if (!approvedName) throw new Error(`${REGISTRY}: brand.public-name statement is not "<Name> is the product's public name."`);
  if (productName !== approvedName) {
    throw new Error(`PRODUCT_NAME "${productName}" is not the approved public name (${REGISTRY}: "${brand.statement}").`);
  }
}

// Post-generation heuristic, not a gate: the prompts instruct, but a local
// model can still write a banned claim, and validators only check shape.
// Each flag names the registry rule behind it, so the reviewer knows what
// to check before posting (CLAUDE.md rule 4). Matching is lexical and will
// both miss paraphrases and flag harmless uses.
const CLAIM_PATTERNS = [
  { re: /\b(revers\w*|undo\w*|roll(?:ed)?[- ]back)\b/i, rule: 'ai.undo-limited: AI actions are not fully reversible' },
  { re: /\bAI\b|\bcopilot\b|\bartificial intelligence\b/i, rule: 'AI capability: not approved for social (#165(4))' },
  { re: /[€$£]\s?\d/, rule: 'price: plan prices are sales/website only' },
  { re: /\b(?!0%)\d+(?:[.,]\d+)?\s?%/, rule: 'percentage: only "0% commission" is approved' },
  { re: /\bQR\b/i, rule: 'QR: QR-linked waiver signing is not built' },
  { re: /\bSMS\b|\btext messag/i, rule: 'sms.not-included' },
  { re: /\baqua\s?roster\b/i, rule: 'brand.not-aquaroster' },
  { re: /\bno (?:other )?competitor|\bonly (?:platform|product|tool|one)\b|\bunique(?:ly)?\b/i, rule: 'claims.no-ai-exclusivity / no exclusivity claims' },
  { re: /\bRLS\b|row[- ]level|multi[- ]tenan/i, rule: 'security architecture: not approved for social' },
];

// Every string inside a model response object (nested fields, arrays),
// joined, so no model-written field escapes the claim check.
export function modelText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(modelText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(modelText).join(' ');
  return '';
}

// sources: { label: text }. Returns [{ label, rule, excerpt }].
export function claimFlags(sources) {
  const flags = [];
  for (const [label, text] of Object.entries(sources ?? {})) {
    if (!text) continue;
    for (const { re, rule } of CLAIM_PATTERNS) {
      const m = re.exec(text);
      if (!m) continue;
      const start = Math.max(0, m.index - 40);
      const excerpt = text.slice(start, m.index + m[0].length + 40).replace(/\s+/g, ' ').trim();
      flags.push({ label, rule, excerpt });
    }
  }
  return flags;
}
