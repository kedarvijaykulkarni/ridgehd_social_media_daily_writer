import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { writeCover } from '../coverCommand.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_VAULT = path.join(__dirname, 'fixtures', 'vault');
const TODAY = '2026-11-07';

async function day(t, name, script) {
  const outputDir = path.join(__dirname, 'fixtures', `cover-${name}`);
  await mkdir(path.join(outputDir, '2026-10-01'), { recursive: true });
  await writeFile(path.join(outputDir, '2026-10-01', 'video-script.txt'), script);
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  return outputDir;
}
const run = (outputDir) =>
  writeCover({ outputDir, vaultPath: FIXTURE_VAULT, date: '2026-10-01', productName: 'RidgeHQ', today: TODAY });

test('cover refuses a day whose topic is no longer approved, and writes nothing', async (t) => {
  const outputDir = await day(
    t,
    'dropped',
    'Topic: ai-copilot-in-the-operational-core — An AI copilot\nTitle: AI copilot\nDescription: Our AI does it all.\n',
  );
  await assert.rejects(() => run(outputDir), /not approved for social/);
  await assert.rejects(() => access(path.join(outputDir, '2026-10-01', 'video-cover-image.txt')));
});

test('an approved topic with stale stored claims gets a cover that opens with the claim flags', async (t) => {
  const outputDir = await day(
    t,
    'stale',
    'Topic: waiver-system — Waiver system\nTitle: QR-linked waiver signing is here\nDescription: Guests sign by QR code.\n',
  );
  const { out, flags } = await run(outputDir);
  assert.ok(flags.some((f) => /^QR/.test(f.rule)));
  const text = await readFile(out, 'utf-8');
  assert.match(text, /^⚠️ CLAIM CHECK \(heuristic, \d+ flag\(s\)\)/);
});

test('a clean approved day gets a cover with no claim-check banner', async (t) => {
  const outputDir = await day(
    t,
    'clean',
    'Topic: waiver-system — Waiver system\nTitle: Waivers signed before the dock\nDescription: Digital waivers, built in.\n',
  );
  const { out, flags } = await run(outputDir);
  assert.deepEqual(flags, []);
  assert.doesNotMatch(await readFile(out, 'utf-8'), /CLAIM CHECK/);
});

test('cover refuses a PRODUCT_NAME that is not the approved public name', async (t) => {
  const outputDir = await day(t, 'name', 'Topic: waiver-system — Waiver system\nTitle: T\nDescription: D.\n');
  await assert.rejects(
    () => writeCover({ outputDir, vaultPath: FIXTURE_VAULT, date: '2026-10-01', productName: 'AquaRoster', today: TODAY }),
    /not the approved public name/,
  );
});
