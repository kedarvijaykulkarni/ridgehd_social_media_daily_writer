import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, rm, writeFile } from 'node:fs/promises';
import { loadKnowledgeBase } from '../loadKnowledgeBase.js';
import { loadRegistry, approvedFacts, writingRules, claimRulesBlock, registryProblems } from '../claimRules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_VAULT = path.join(__dirname, 'fixtures', 'vault');
const TODAY = '2026-11-07';

test('only topics backed by a fact approved for social are offered (DECISIONS #165(4))', async () => {
  const { chunks, dropped } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  assert.deepEqual(chunks.map((c) => [c.id, c.fact_id]), [['waiver-system', 'feature.waivers']]);
  // Built but not approved for marketing: RLS, the AI copilot, the roadmap
  // row — and the pricing topic, whose headline no fact approves.
  for (const id of [
    'rls-multi-tenancy-enforced-at-the-database-level',
    'ai-copilot-in-the-operational-core',
    'flat-monthly-pricing-zero-commission',
  ]) {
    assert.ok(dropped.some((c) => c.id === id), `${id} must be dropped`);
  }
  assert.ok(!chunks.some((c) => c.status !== 'shipped'), 'no roadmap topic is approved');
});

test('an offered topic speaks in the approved statement, not the vault prose behind it', async () => {
  const { chunks } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  const waiver = chunks.find((c) => c.id === 'waiver-system');
  assert.equal(waiver.detail, 'Digital waivers are built in: typed e-signature and per-participant enforcement.');
  assert.doesNotMatch(waiver.detail, /RLS/);
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

test('approved facts exclude other channels, superseded, unverified features and internal records', async () => {
  const registry = await loadRegistry(FIXTURE_VAULT);
  // Each excluded fixture fact fails exactly one rule: pricing.monthly-plans
  // (not on social), support.old-promise (superseded), feature.unverified
  // (feature.* without verification).
  assert.deepEqual(
    approvedFacts(registry, TODAY).map((f) => f.id).sort(),
    ['brand.public-name', 'commission.direct-bookings', 'feature.waivers'],
  );
  assert.deepEqual(writingRules(registry, TODAY).map((f) => f.id), ['ai.undo-limited', 'brand.not-aquaroster']);
});

test('review_by is inclusive: a fact is approved on its date and dropped the day after', async () => {
  const registry = await loadRegistry(FIXTURE_VAULT);
  assert.ok(approvedFacts(registry, '2027-01-18').some((f) => f.id === 'feature.waivers'));
  assert.ok(!approvedFacts(registry, '2027-01-19').some((f) => f.id === 'feature.waivers'));
});

test('one malformed record rejects the whole registry', async () => {
  const good = JSON.parse(JSON.stringify(await loadRegistry(FIXTURE_VAULT)));
  const waivers = (r) => r.facts.find((f) => f.id === 'feature.waivers');
  const cases = {
    'impossible review_by': (r) => { waivers(r).review_by = '2026-99-99'; },
    'missing review_by': (r) => { delete waivers(r).review_by; },
    'string channels': (r) => { waivers(r).marketing.channels = 'social-news'; },
    'missing statement': (r) => { waivers(r).statement = ''; },
    'duplicate id': (r) => { r.facts.push({ ...waivers(r) }); },
    'superseded without successor': (r) => { waivers(r).decision.state = 'superseded'; },
    'unknown successor': (r) => { r.facts.find((f) => f.id === 'support.old-promise').superseded_by = 'no.such-fact'; },
    'wrong schema version': (r) => { r.schema_version = 2; },
    'implemented without revision': (r) => { delete waivers(r).implementation.revision; },
    'verified without date': (r) => { delete waivers(r).verification.date; },
    'accepted without evidence': (r) => { waivers(r).evidence = []; },
    'invalid deployment state': (r) => { waivers(r).deployment.state = 'live'; },
    'missing deployment': (r) => { delete waivers(r).deployment; },
    'id without a dot': (r) => { waivers(r).id = 'waivers'; },
    'year-zero review_by': (r) => { waivers(r).review_by = '0000-01-01'; },
    'supersession cycle': (r) => {
      const old = r.facts.find((f) => f.id === 'support.old-promise');
      const brand = r.facts.find((f) => f.id === 'brand.public-name');
      brand.decision.state = 'superseded';
      brand.superseded_by = old.id; // old -> brand -> old
    },
  };
  assert.deepEqual(registryProblems(good), []);
  // Any real calendar date is valid (fact-registry.md), however old.
  const old = JSON.parse(JSON.stringify(good));
  waivers(old).verification.date = '1999-12-31';
  assert.deepEqual(registryProblems(old), []);
  for (const [name, breakIt] of Object.entries(cases)) {
    const r = JSON.parse(JSON.stringify(good));
    breakIt(r);
    assert.ok(registryProblems(r).length > 0, name);
  }
});

test('loadRegistry rejects a malformed registry file as a whole', async (t) => {
  const vault = path.join(__dirname, 'fixtures', 'bad-registry-vault');
  const dir = path.join(vault, 'wiki', 'ai-operations', 'facts');
  await mkdir(dir, { recursive: true });
  const r = await loadRegistry(FIXTURE_VAULT);
  r.facts.find((f) => f.id === 'feature.waivers').evidence = [];
  await writeFile(path.join(dir, 'registry.json'), JSON.stringify(r));
  t.after(() => rm(vault, { recursive: true, force: true }));
  await assert.rejects(() => loadRegistry(vault), /invalid, refusing to trust any of it[\s\S]*evidence/);
});

test('the claim-rules block quotes approved statements and bans verbatim, never internal scope', async () => {
  const block = claimRulesBlock(await loadRegistry(FIXTURE_VAULT), TODAY, 'RidgeHQ');
  assert.match(block, /Digital waivers are built in/);
  assert.doesNotMatch(block, /INTERNAL SCOPE TEXT/, 'scope is internal and never exported');
  assert.match(block, /do not claim that AI actions are fully reversible/);
  assert.doesNotMatch(block, /€49/, 'sales/website-only prices are not offered on social');
  assert.doesNotMatch(block, /superseded social claim/);
});

test('every product prompt carries the claim-rules block verbatim', async () => {
  const { buildOllamaPrompt } = await import('../buildOllamaPrompt.js');
  const { buildArticlePrompt } = await import('../buildArticlePrompt.js');
  const { buildVideoScriptPrompt } = await import('../buildVideoScriptPrompt.js');
  const { buildProductHuntPrompt } = await import('../buildProductHuntPrompt.js');
  const { selectFocus } = await import('../seoFocus.js');
  const { PRODUCTHUNT_FORMATS } = await import('../productHunt.js');

  const claimRules = claimRulesBlock(await loadRegistry(FIXTURE_VAULT), TODAY);
  const { chunks } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  const topic = chunks[0];
  const history = { posts: [] };
  const focus = selectFocus(history);
  const shared = { hook_line: 'h', core_message: 'c', call_to_action: 'a', image_prompt: 'i' };
  const prompts = {
    short: buildOllamaPrompt({ topic, knowledgeBase: chunks, history, focus, claimRules }),
    article: buildArticlePrompt({ topic, knowledgeBase: chunks, history, focus, claimRules }),
    video: buildVideoScriptPrompt({ topic, shared, video: { title: 't' }, claimRules }),
    producthunt: buildProductHuntPrompt({ topic, history, format: PRODUCTHUNT_FORMATS[0], claimRules }),
  };
  for (const [name, prompt] of Object.entries(prompts)) {
    assert.ok(prompt.includes(claimRules), `${name} prompt must carry the claim rules`);
    assert.match(prompt, /fully reversible/, name);
  }
});

test('PRODUCT_NAME must be the approved public name', async () => {
  const { assertPublicName } = await import('../claimRules.js');
  const registry = await loadRegistry(FIXTURE_VAULT);
  assert.doesNotThrow(() => assertPublicName(registry, TODAY, 'RidgeHQ'));
  assert.throws(() => assertPublicName(registry, TODAY, 'AquaRoster'), /not the approved public name/);
  // Every non-name word of "RidgeHQ is the product's public name." is refused.
  for (const name of ['Ridge', 'ridgehq', 'is', 'the', "product's", 'product', 'public', 'name']) {
    assert.throws(() => assertPublicName(registry, TODAY, name), /not the approved public name/, name);
  }
});

test('a dropped topic in history never reappears in RECENTLY COVERED', async () => {
  const { buildOllamaPrompt } = await import('../buildOllamaPrompt.js');
  const { buildArticlePrompt } = await import('../buildArticlePrompt.js');
  const { selectFocus } = await import('../seoFocus.js');
  const { chunks } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  const history = {
    posts: [
      { date: '2026-11-01', topic_id: 'ai-copilot-in-the-operational-core' },
      { date: '2026-11-02', topic_id: 'waiver-system' },
    ],
  };
  const args = { topic: chunks[0], knowledgeBase: chunks, history, focus: selectFocus(history) };
  for (const prompt of [buildOllamaPrompt(args), buildArticlePrompt(args)]) {
    assert.doesNotMatch(prompt, /ai-copilot-in-the-operational-core/);
    assert.match(prompt, /RECENTLY COVERED TOPICS[^\n]*\n- Waiver system/);
  }
});

test('Product Hunt General history drops topics that are no longer offered', async () => {
  const { buildProductHuntDiscussionPrompt } = await import('../buildProductHuntPrompt.js');
  const { chunks } = await loadKnowledgeBase(FIXTURE_VAULT, { today: TODAY });
  const history = {
    posts: [
      { date: '2026-11-01', topic_id: 'ai-copilot-in-the-operational-core', producthunt_discussion: true },
      { date: '2026-11-02', topic_id: 'waiver-system', producthunt_discussion: true },
    ],
  };
  const prompt = buildProductHuntDiscussionPrompt({ topic: chunks[0], history, knowledgeBase: chunks });
  assert.doesNotMatch(prompt, /ai-copilot/);
  assert.match(prompt, /2026-11-02: theme "waiver-system"/);
});
