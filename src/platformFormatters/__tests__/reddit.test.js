import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReddit } from '../reddit.js';

const shared = (overrides = {}) => ({
  hook_line: 'How do you handle waivers for walk-in groups?',
  core_message: 'We used to chase paper waivers at the dock every morning.',
  call_to_action: 'Curious how others handle it.',
  image_prompt: 'a dock at dawn',
  ...overrides,
});

test('a hook over the 100-char target but under the 300 hard limit is kept whole', () => {
  const hook = 'Simple pricing for real operators: how do you price a booking tool when your staff count swings with the season and flat pricing and 0% commission';
  assert.ok(hook.length > 100 && hook.length < 300);
  const draft = formatReddit(shared({ hook_line: hook }));
  assert.equal(draft.title, hook);
});

test('a link or hashtag in the Reddit body is flagged for manual review', () => {
  for (const core of [
    'Dive shops lose hours on paperwork. #DiveShop',
    'Details: https://www.ridgehq.app/solutions/dive-centers',
    'More at www.example.com',
    'Details at ridgehq.app',
    'Try (#DiveShop) next season.',
  ]) {
    const draft = formatReddit(shared({ core_message: core }));
    assert.equal(draft.needs_manual_review, true, core);
    assert.match(draft.review_reason, /link|hashtag/i);
  }
  assert.equal(formatReddit(shared({ hook_line: 'See (#RidgeHQ) for waivers?' })).needs_manual_review, true);
});

test('decimals, abbreviations and "No. 1" are not mistaken for links or hashtags', () => {
  const draft = formatReddit(shared({ core_message: 'We cut check-in to 2.5 minutes, e.g. for groups. Team No. 1 agreed.' }));
  assert.equal(draft.needs_manual_review, false);
});

test('a plain conversational body is not flagged', () => {
  assert.equal(formatReddit(shared()).needs_manual_review, false);
});
