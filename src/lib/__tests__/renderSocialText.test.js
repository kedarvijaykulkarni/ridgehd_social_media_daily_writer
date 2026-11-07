import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSocialText } from '../renderSocialText.js';
import { formatX } from '../../platformFormatters/x.js';
import { formatLinkedin } from '../../platformFormatters/linkedin.js';
import { formatInstagram } from '../../platformFormatters/instagram.js';
import { formatReddit } from '../../platformFormatters/reddit.js';

const shared = {
  core_message: 'QR-linked waiver signing is on the way.',
  hook_line: 'Waivers before the dock?',
  call_to_action: 'What would you want from it?',
  image_prompt: 'dock',
};
const drafts = {
  x: formatX(shared),
  linkedin: formatLinkedin(shared),
  instagram: formatInstagram(shared),
  reddit: formatReddit(shared),
};

test('social-posts.txt warns when the topic is not shipped', () => {
  const text = renderSocialText({ topic: { id: 'qr', status: 'planned', headline: 'QR signing' }, date: '2026-11-07', drafts });
  assert.match(text, /⚠️ ROADMAP: topic status is "planned"/);
});

test('social-posts.txt carries no roadmap warning for a shipped topic', () => {
  const text = renderSocialText({ topic: { id: 'w', status: 'shipped', headline: 'Waivers' }, date: '2026-11-07', drafts });
  assert.doesNotMatch(text, /ROADMAP/);
});
