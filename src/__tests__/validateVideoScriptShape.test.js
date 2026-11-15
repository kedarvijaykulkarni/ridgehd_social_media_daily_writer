import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideoScriptShape, callOllamaVideoScript } from '../callOllama.js';

const seg = (i) => ({ visual: `visual ${i}`, audio: `audio ${i}`, ends_on: `end ${i}` });
const bible = { setting: 's', look: 'l', camera: 'c', voice: 'v' };

test('accepts exactly six visual + audio segments', () => {
  const obj = { bible, segments: [0, 1, 2, 3, 4, 5].map(seg) };
  assert.equal(validateVideoScriptShape(obj), obj);
});

test('rejects a missing or wrong-length segments array', () => {
  assert.throws(() => validateVideoScriptShape({}), /exactly 6 segments/);
  assert.throws(() => validateVideoScriptShape({ bible, segments: [0, 1, 2].map(seg) }), /exactly 6 segments/);
});

test('rejects a segment without visual or audio', () => {
  const segments = [0, 1, 2, 3, 4, 5].map(seg);
  segments[3] = { visual: 'v', audio: '  ' };
  assert.throws(() => validateVideoScriptShape({ bible, segments }), /segment 3/);
});

test('rejects a segment without ends_on', () => {
  const segments = [0, 1, 2, 3, 4, 5].map(seg);
  segments[2] = { visual: 'v', audio: 'a' };
  assert.throws(() => validateVideoScriptShape({ bible, segments }), /segment 2.*ends_on/);
});

test('rejects a missing bible field', () => {
  const segments = [0, 1, 2, 3, 4, 5].map(seg);
  assert.throws(() => validateVideoScriptShape({ segments }), /bible is missing "setting"/);
  assert.throws(() => validateVideoScriptShape({ bible: { ...bible, voice: ' ' }, segments }), /"voice"/);
});

test('rejects a script that repeats the same dialogue in two blocks', async () => {
  const { validateVideoScriptShape, findRepeatedAudio } = await import('../callOllama.js');
  const line = 'This predictability allows you to focus on your lesson plan and equipment inventory.';
  assert.deepEqual(findRepeatedAudio(['One thing.', 'Another idea entirely.', line, line.toUpperCase()]), [2, 3]);
  assert.equal(findRepeatedAudio(['Alpha beta gamma.', 'Totally different words here.']), null);
  const segments = [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `v${i}`, audio: i >= 3 && i <= 4 ? line : `Unique line number ${i} about topic ${'x'.repeat(i)}`, ends_on: `e${i}` }));
  const bible = { setting: 's', look: 'l', camera: 'c', voice: 'v' };
  assert.throws(() => validateVideoScriptShape({ bible, segments }), /repeat the same dialogue/);
});

test('enforces speech budgets for both ordinary clips and the closing hold', () => {
  for (const [index, limit] of [[0, 20], [5, 16]]) {
    const segments = [0, 1, 2, 3, 4, 5].map(seg);
    segments[index].audio = Array(limit).fill('word').join(' ');
    assert.doesNotThrow(() => validateVideoScriptShape({ bible, segments }));
    segments[index].audio += ' extra';
    assert.throws(() => validateVideoScriptShape({ bible, segments }), new RegExp(`segment ${index} audio.*at most ${limit}`));
  }
});

test('overlong CTA is retried with actionable feedback, never silently truncated', async (t) => {
  const clean = { bible, segments: [0, 1, 2, 3, 4, 5].map(seg) };
  const dirty = structuredClone(clean);
  dirty.segments[5].audio = 'Explore how RidgeHQ streamlines your bookings and operations. Visit ridgehq.app or reach out to our team at social@ridgehq.app to learn more.';
  const answers = [dirty, clean];
  const prompts = [];
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, init) => {
    prompts.push(JSON.parse(init.body).prompt);
    return { ok: true, json: async () => ({ response: JSON.stringify(answers.shift()) }) };
  };
  const result = await callOllamaVideoScript('video prompt', { host: 'http://stub' });
  assert.deepEqual(result, clean);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /segment 5 audio.*at most 16 words/);
});
