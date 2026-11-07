import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimFlags } from '../claimRules.js';
import { renderSocialText } from '../lib/renderSocialText.js';
import { formatX } from '../platformFormatters/x.js';
import { formatLinkedin } from '../platformFormatters/linkedin.js';
import { formatInstagram } from '../platformFormatters/instagram.js';
import { formatReddit } from '../platformFormatters/reddit.js';

test('banned or unapproved claims in generated text are flagged with the rule behind them', () => {
  const cases = {
    'RidgeHQ AI actions are fully reversible.': /ai\.undo-limited/,
    'Our AI copilot schedules your day.': /AI capability/,
    'Plans start at €49 a month.': /price/,
    'Save 30% of admin time.': /percentage/,
    'Guests sign by scanning a QR code.': /QR/,
    'Reminders go out by SMS.': /sms\.not-included/,
    'AquaRoster makes this easy.': /brand\.not-aquaroster/,
    'No competitor offers this.': /exclusivity/,
    'Row-level security isolates every tenant.': /security architecture/,
  };
  for (const [text, rule] of Object.entries(cases)) {
    const flags = claimFlags({ 'blog-post.md': text });
    assert.ok(flags.some((f) => rule.test(f.rule)), text);
    assert.equal(flags[0].label, 'blog-post.md');
  }
});

test('approved wording raises no flag', () => {
  const approved =
    'Digital waivers are built in: typed e-signature, per-participant enforcement and conditional questions. ' +
    '0% platform commission on direct bookings, on every plan.';
  assert.deepEqual(claimFlags({ 'social-posts.txt': approved }), []);
});

test('social-posts.txt lists the run\'s claim flags in its header', () => {
  const shared = { hook_line: 'Waivers?', core_message: 'Signed before the dock.', call_to_action: 'Thoughts?', image_prompt: 'dock' };
  const drafts = { x: formatX(shared), linkedin: formatLinkedin(shared), instagram: formatInstagram(shared), reddit: formatReddit(shared) };
  const topic = { id: 'waiver-system', status: 'shipped', headline: 'Waiver system' };
  const flagged = renderSocialText({
    topic, date: '2026-11-07', drafts, claimFlags: claimFlags({ 'video-script.txt': 'Every AI action can be undone.' }),
  });
  assert.match(flagged, /⚠️ CLAIM CHECK \(heuristic, \d+ flag\(s\)\)/);
  assert.match(flagged, /video-script\.txt: ai\.undo-limited/);
  const clean = renderSocialText({ topic, date: '2026-11-07', drafts, claimFlags: [] });
  assert.match(clean, /Claim check \(heuristic\): no flags/);
});
