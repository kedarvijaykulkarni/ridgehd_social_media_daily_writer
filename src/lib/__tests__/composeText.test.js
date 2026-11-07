import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences } from '../composeText.js';

test('splitSentences splits on sentence ends only, not on decimals, abbreviations or domains', () => {
  assert.deepEqual(
    splitSentences('Save 2.5 hours a day, e.g. on check-in. Visit ridgehq.app today! Ready?'),
    ['Save 2.5 hours a day, e.g. on check-in.', 'Visit ridgehq.app today!', 'Ready?'],
  );
});

test('splitSentences keeps text with no terminal punctuation whole', () => {
  assert.deepEqual(splitSentences('  One line without a full stop  '), ['One line without a full stop']);
});
