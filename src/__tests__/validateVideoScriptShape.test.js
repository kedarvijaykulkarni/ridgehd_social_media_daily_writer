import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideoScriptShape } from '../callOllama.js';

const seg = (i) => ({ visual: `visual ${i}`, audio: `audio ${i}` });

test('accepts exactly six visual + audio segments', () => {
  const obj = { segments: [0, 1, 2, 3, 4, 5].map(seg) };
  assert.equal(validateVideoScriptShape(obj), obj);
});

test('rejects a missing or wrong-length segments array', () => {
  assert.throws(() => validateVideoScriptShape({}), /exactly 6 segments/);
  assert.throws(() => validateVideoScriptShape({ segments: [0, 1, 2].map(seg) }), /exactly 6 segments/);
});

test('rejects a segment without visual or audio', () => {
  const segments = [0, 1, 2, 3, 4, 5].map(seg);
  segments[3] = { visual: 'v', audio: '  ' };
  assert.throws(() => validateVideoScriptShape({ segments }), /segment 3/);
});
