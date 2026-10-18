import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideoScriptShape } from '../callOllama.js';

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
