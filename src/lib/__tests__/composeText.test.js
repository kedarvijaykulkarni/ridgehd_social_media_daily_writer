import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSentences } from '../composeText.js';
import { formatX } from '../../platformFormatters/x.js';
import { X_MAX } from '../../platformLimits.js';

test('an over-long hook is truncated on X instead of aborting the run, and the link survives', () => {
  const link = 'https://www.ridgehq.app/solutions/dive-centers';
  const draft = formatX(
    {
      hook_line: 'Why do dive centers still chase paper waivers at the dock '.repeat(5).trim(),
      core_message: 'Waivers are signed before guests arrive.',
      call_to_action: 'How do you handle it?',
      image_prompt: 'dock',
    },
    { vertical: { id: 'dive-centers', url: link, hashtags: [] }, platform: { id: 'p' } },
  );
  assert.ok(draft.char_count <= X_MAX, `${draft.char_count} > ${X_MAX}`);
  assert.ok(draft.text.includes(link));
  assert.ok(draft.text.endsWith('#RidgeHQ'), 'the pinned brand tag survives the fallback');
});

test('splitSentences splits on sentence ends only, not on decimals, abbreviations or domains', () => {
  assert.deepEqual(
    splitSentences('Save 2.5 hours a day, e.g. on check-in. Visit ridgehq.app today! Ready?'),
    ['Save 2.5 hours a day, e.g. on check-in.', 'Visit ridgehq.app today!', 'Ready?'],
  );
});

test('splitSentences keeps text with no terminal punctuation whole', () => {
  assert.deepEqual(splitSentences('  One line without a full stop  '), ['One line without a full stop']);
});
