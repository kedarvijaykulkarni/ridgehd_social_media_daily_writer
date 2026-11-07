import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateShape } from '../callOllama.js';
import { formatX } from '../platformFormatters/x.js';
import { formatInstagram } from '../platformFormatters/instagram.js';
import { formatLinkedin } from '../platformFormatters/linkedin.js';
import { formatReddit } from '../platformFormatters/reddit.js';

const base = () => ({
  core_message: 'Waivers are signed before guests reach the dock.',
  hook_line: 'Paper waivers at the dock?',
  call_to_action: 'How do you handle it?',
  image_prompt: 'a dock at dawn',
});

test('validateShape normalises malformed optional arrays so every formatter still runs', () => {
  for (const bad of ['#a #b', [null, '', 7, '#Diving'], { tag: '#x' }, null]) {
    const shared = validateShape({
      ...base(),
      hashtags_broad_niche: bad,
      hashtags_saas_niche: bad,
      reddit_relevant_subreddits: bad,
    });
    for (const f of ['hashtags_broad_niche', 'hashtags_saas_niche', 'reddit_relevant_subreddits']) {
      assert.ok(Array.isArray(shared[f]), `${f} must be an array`);
      assert.ok(shared[f].every((v) => typeof v === 'string' && v.trim()), `${f} must hold only strings`);
    }
    assert.doesNotThrow(() => {
      formatX(shared);
      formatInstagram(shared);
      formatLinkedin(shared);
      formatReddit(shared);
    });
  }
});

test('validateShape still rejects a missing required field', () => {
  assert.throws(() => validateShape({ ...base(), hook_line: '' }), /hook_line/);
});
