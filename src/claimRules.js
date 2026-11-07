// Claim authority: the RidgeHQ Brain's approved-fact registry.
//
// business-context.md §2 says what is *built*; the registry
// (wiki/ai-operations/facts/registry.json, DECISIONS.md #165/#166) says what
// the owner has approved for *marketing*, per channel. Those differ: §2 lists
// scheduling, RLS, roles and the AI copilot as solid, but #165(4) says
// "waivers are the only feature claim approved for now; other feature and
// integration claims wait". So a topic is offered only when it maps to a
// fact that is accepted, public, allowed on social, not superseded and not
// past its review_by date — the same rules the registry's own export uses
// (wiki/ai-operations/fact-registry.md). Fail closed: no registry, no run.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const REGISTRY = path.join('wiki', 'ai-operations', 'facts', 'registry.json');
export const CHANNEL = 'social';

// Which registry fact makes each loader topic sellable. A topic missing here
// (a new §2 row, a ❌ roadmap row) is not offered until the owner approves a
// fact for it in the registry and it is mapped here.
export const TOPIC_FACTS = {
  'waiver-system': 'feature.waivers',
  // Flat monthly plans as published positioning; the plan prices themselves
  // (pricing.monthly-plans) are sales/website only, so the loader keeps them
  // out of this chunk.
  'flat-monthly-pricing-zero-commission': 'commission.direct-bookings',
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
  if (!Array.isArray(registry?.facts)) throw new Error(`${REGISTRY} has no "facts" array.`);
  return registry;
}

function current(fact, today) {
  return fact.decision?.state === 'accepted' && !fact.superseded_by && (!fact.review_by || fact.review_by >= today);
}

// Accepted, public facts allowed on social and still in date.
export function approvedFacts(registry, today) {
  return registry.facts.filter(
    (f) =>
      current(f, today) &&
      f.audience === 'public' &&
      f.marketing?.state === 'allowed' &&
      (f.marketing.channels ?? []).includes(CHANNEL),
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
// approved facts (with their scope limits) are the only product claims the
// model may make; the writing rules are hard bans.
export function claimRulesBlock(registry, today, productName = 'RidgeHQ') {
  const approved = approvedFacts(registry, today);
  const rules = writingRules(registry, today);
  return [
    'CLAIM RULES (owner decisions — these override everything else in this prompt):',
    `- The ONLY product facts approved for public ${CHANNEL} copy about ${productName}:`,
    ...approved.map((f) => `  - ${f.statement}${f.scope ? ` (Limits: ${f.scope})` : ''}`),
    '- Do not present any other feature, integration, AI capability, plan price, number or',
    '  customer result as available — even if it appears elsewhere in this prompt as audience',
    '  context. Describe the operator\'s problem instead.',
    ...rules.map((f) => `- ${f.statement}`),
  ].join('\n');
}
