import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderImagePrompt } from '../renderImagePrompt.js';

test('renderers default to the RidgeHQ public brand, not AquaRoster', () => {
  const out = renderImagePrompt({ topic: { id: 't' }, date: '2026-10-19', imagePrompt: 'a dock at dawn' });
  assert.match(out, /^RidgeHQ image prompt/);
  assert.doesNotMatch(out, /AquaRoster/);
});
