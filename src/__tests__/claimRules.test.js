import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, rm } from 'node:fs/promises';
import { loadKnowledgeBase } from '../loadKnowledgeBase.js';
import { loadRegistry, approvedFacts, writingRules, claimRulesBlock } from '../claimRules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_VAULT = path.join(__dirname, 'fixtures', 'vault');
const TODAY = '2026-11-07';

test('only topics backed by a fact approved for social are offered (DECISIONS #165(4))', async () => {
  const { chunks, dropped } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  assert.deepEqual(chunks.map((c) => c.id).sort(), ['flat-monthly-pricing-zero-commission', 'waiver-system']);
  assert.deepEqual(
    chunks.map((c) => c.fact_id).sort(),
    ['commission.direct-bookings', 'feature.waivers'],
  );
  // Built but not approved for marketing: scheduling, RLS, the AI copilot, the roadmap row.
  for (const id of ['rls-multi-tenancy-enforced-at-the-database-level', 'ai-copilot-in-the-operational-core']) {
    assert.ok(dropped.some((c) => c.id === id), `${id} must be dropped`);
  }
  assert.ok(!chunks.some((c) => c.status !== 'shipped'), 'no roadmap topic is approved');
});

test('once every fact is past review_by, nothing is approved and the run stops', async () => {
  await assert.rejects(() => loadKnowledgeBase(FIXTURE_VAULT, { today: '2027-01-19' }), /approved for social/);
});

test('a vault without the registry refuses to run', async (t) => {
  const vault = path.join(__dirname, 'fixtures', 'no-registry-vault');
  await mkdir(path.join(vault, 'wiki'), { recursive: true });
  for (const f of ['business-context.md', 'competitors.md', 'pricing.md']) {
    await copyFile(path.join(FIXTURE_VAULT, 'wiki', f), path.join(vault, 'wiki', f));
  }
  t.after(() => rm(vault, { recursive: true, force: true }));
  await assert.rejects(() => loadKnowledgeBase(vault, { today: TODAY }), /registry\.json/);
});

test('approved facts exclude other channels, superseded and internal records', async () => {
  const registry = await loadRegistry(FIXTURE_VAULT);
  assert.deepEqual(approvedFacts(registry, TODAY).map((f) => f.id).sort(), ['commission.direct-bookings', 'feature.waivers']);
  assert.deepEqual(writingRules(registry, TODAY).map((f) => f.id), ['ai.undo-limited']);
});

test('the claim-rules block quotes approved wording, limits and bans verbatim', async () => {
  const block = claimRulesBlock(await loadRegistry(FIXTURE_VAULT), TODAY, 'RidgeHQ');
  assert.match(block, /Digital waivers are built in/);
  assert.match(block, /QR-linked waiver signing is not built and must not be claimed/);
  assert.match(block, /do not claim that AI actions are fully reversible/);
  assert.doesNotMatch(block, /€49/, 'sales/website-only prices are not offered on social');
  assert.doesNotMatch(block, /superseded social claim/);
});
