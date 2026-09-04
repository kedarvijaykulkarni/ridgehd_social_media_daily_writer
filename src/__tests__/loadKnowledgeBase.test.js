import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadKnowledgeBase } from '../loadKnowledgeBase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_VAULT = path.join(__dirname, 'fixtures', 'vault');

const REQUIRED_FIELDS = [
  'id',
  'category',
  'status',
  'headline',
  'detail',
  'audience_angle',
  'suggested_visual_theme',
];

test('loadKnowledgeBase extracts the ✅ "sell on this" bullets as shipped chunks', async () => {
  const chunks = await loadKnowledgeBase(FIXTURE_VAULT);
  const shipped = chunks.filter((c) => c.status === 'shipped');

  // 5 ✅ bullets in the fixture, plus the derived competitor + pricing chunks.
  assert.ok(shipped.length >= 5, `expected >= 5 shipped chunks, got ${shipped.length}`);
  assert.ok(
    shipped.some((c) => /waiver/i.test(c.headline)),
    'expected a chunk derived from the Waiver system bullet',
  );
});

test('loadKnowledgeBase extracts ❌ gap rows as planned chunks, minus "do not market" rows', async () => {
  const chunks = await loadKnowledgeBase(FIXTURE_VAULT);
  const planned = chunks.filter((c) => c.status === 'planned');

  // 2 ❌ rows; the "Money-moving AI ... Do not market" row is skipped.
  assert.equal(planned.length, 1, `expected exactly 1 planned chunk, got ${planned.length}`);
  assert.match(planned[0].headline, /QR-linked signing|check-in/i);
  assert.ok(
    !chunks.some((c) => /money-moving ai/i.test(c.headline)),
    'the "do not market" gap row must not become a topic',
  );
});

test('every chunk has the full required shape and a non-empty kebab-case id', async () => {
  const chunks = await loadKnowledgeBase(FIXTURE_VAULT);
  assert.ok(chunks.length > 0);

  for (const chunk of chunks) {
    for (const field of REQUIRED_FIELDS) {
      assert.equal(typeof chunk[field], 'string', `${chunk.id}: ${field} must be a string`);
      assert.ok(chunk[field].trim().length > 0, `${chunk.id}: ${field} must be non-empty`);
    }
    assert.match(chunk.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `id "${chunk.id}" must be kebab-case`);
    assert.ok(['shipped', 'planned', 'unverified'].includes(chunk.status));
  }
});

test('chunk ids are unique and stable across two loads', async () => {
  const a = await loadKnowledgeBase(FIXTURE_VAULT);
  const b = await loadKnowledgeBase(FIXTURE_VAULT);

  const idsA = a.map((c) => c.id);
  assert.equal(new Set(idsA).size, idsA.length, 'ids must be unique');
  assert.deepEqual(idsA, b.map((c) => c.id), 'ids must be stable run-to-run');
});

test('loadKnowledgeBase derives the AI-copilot differentiator from competitors.md §5', async () => {
  const chunks = await loadKnowledgeBase(FIXTURE_VAULT);
  assert.ok(
    chunks.some((c) => c.category === 'differentiator' && /ai copilot/i.test(c.headline)),
    'expected an AI-copilot differentiator chunk',
  );
});

test('loadKnowledgeBase derives the pricing chunk from pricing.md §3', async () => {
  const chunks = await loadKnowledgeBase(FIXTURE_VAULT);
  assert.ok(
    chunks.some((c) => c.category === 'pricing-model' && /commission/i.test(c.detail)),
    'expected a pricing-model chunk mentioning commission',
  );
});

test('loadKnowledgeBase throws a clear error when the vault directory is missing', async () => {
  await assert.rejects(() => loadKnowledgeBase(path.join(__dirname, 'no-such-vault')), /vault/i);
});

test('loadKnowledgeBase throws when business-context.md yields zero chunks', async (t) => {
  const emptyVault = path.join(__dirname, 'fixtures', 'empty-vault');
  const { mkdir, writeFile, rm } = await import('node:fs/promises');
  await mkdir(path.join(emptyVault, 'wiki'), { recursive: true });
  await writeFile(path.join(emptyVault, 'wiki', 'business-context.md'), '# nothing to see here\n');
  t.after(() => rm(emptyVault, { recursive: true, force: true }));

  await assert.rejects(() => loadKnowledgeBase(emptyVault), /no topic chunks/i);
});
