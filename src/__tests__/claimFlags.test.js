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

test('fields outside the post copy are checked too: image prompt, hashtags, video bible', async () => {
  const { modelText } = await import('../claimRules.js');
  const shared = {
    hook_line: 'Waivers?', core_message: 'Signed before the dock.', call_to_action: 'Thoughts?',
    image_prompt: 'A guest scans a QR code at the dock.',
    hashtags_saas_niche: ['#AIcopilot', '#AI'],
  };
  const script = { bible: { setting: 'a dive shop', look: 'warm', camera: 'handheld', voice: 'calm', wardrobe: 'SMS reminder shirt' }, segments: [] };
  const rules = claimFlags({ shared: modelText(shared), script: modelText(script) }).map((f) => `${f.label}:${f.rule}`);
  assert.ok(rules.some((r) => r.startsWith('shared:QR')), 'image_prompt');
  assert.ok(rules.some((r) => r.startsWith('shared:AI capability')), 'hashtags');
  assert.ok(rules.some((r) => r.startsWith('script:sms')), 'video bible');
  assert.deepEqual(claimFlags(null), []);
});

test('the claims the 2026-11-07 run invented are now flagged', () => {
  // Verbatim from output/2026-11-07 (social posts, blog, LinkedIn article, video script).
  const cases = {
    'Enforce mandatory, per-participant e-signatures': /mandatory\/blocking/,
    'ensure every required signature is present before an activity is confirmed': /mandatory\/blocking/,
    'securing operations from check-in to dive site': /workflow\/integration/,
    'allowing you to replace legacy tools': /workflow\/integration/,
    'providing a clearer, more defensible record than a generalized paper agreement ever could': /legal\/compliance/,
    'Built-in digital waivers streamline compliance': /legal\/compliance/,
    'Simplify compliance and maximize profitability': /customer result/,
    'As an operator, I know that transitioning off old paper forms': /invented persona/,
    'Managing twenty trips a month with paper waivers': /number or volume/,
    'a single manifest containing dozens of individuals': /number or volume/,
  };
  for (const [text, rule] of Object.entries(cases)) {
    assert.ok(claimFlags({ draft: text }).some((f) => rule.test(f.rule)), text);
  }
});

test('"unique risk profiles" is no longer mistaken for an exclusivity claim', () => {
  const flags = claimFlags({ draft: 'each with unique risk profiles' });
  assert.ok(!flags.some((f) => /exclusivity/.test(f.rule)));
});

test('second-run review: production wording is not flagged, the missed claims are', () => {
  assert.deepEqual(claimFlags({ draft: 'smooth pan, gentle push-in throughout all blocks' }), []);
  // Scene direction lives in visual fields, which skip the copy rules.
  assert.deepEqual(claimFlags({ 'draft (visual)': 'highly structured, emphasizing a workflow environment' }), []);
  // Verbatim from the regenerated output/2026-11-07 drafts.
  const missed = {
    'Moving away from managing documentation with legacy tools or spreadsheets is simpler with RidgeHQ.': /workflow\/integration/,
    'Explore how RidgeHQ manages your operations.': /workflow\/integration/,
    'Operational precision requires flawless preparation': /customer result/,
    'By streamlining documentation with RidgeHQ, operators can dedicate focus entirely': /customer result/,
    'the risk of a participant checking in without the required consent is heightened': /mandatory\/blocking/,
    'typed e-signatures, ensuring explicit acknowledgment from every participant': /legal\/compliance/,
    'such as pre-existing medical conditions or specific equipment requirements': /invented example/,
    'RidgeHQ allows operators to unify essential operational components within a single platform': /workflow\/integration/,
    'Integrated documentation improves operational certainty and consistency': /customer result/,
    "We've been talking with dive center operators about the friction": /invented persona/,
  };
  for (const [text, rule] of Object.entries(missed)) {
    assert.ok(claimFlags({ draft: text }).some((f) => rule.test(f.rule)), text);
  }
});

test('every match is reported, up to three per rule, with the total when there are more', () => {
  const text = 'integrated. integrates. integration. integrating. integrated.';
  const flags = claimFlags({ draft: text }).filter((f) => /workflow\/integration/.test(f.rule));
  assert.equal(flags.length, 3);
  assert.equal(flags[0].total, 5);
});

test('visual direction is checked only for what a picture could show, not for copy words', async () => {
  const { claimSources, claimProblems } = await import('../claimRules.js');
  const shared = {
    hook_line: 'Waivers?', core_message: 'Digital waivers are built in.', call_to_action: 'Learn more.',
    image_prompt: 'The composition should convey reliable, organized operation. A phone shows a QR code.',
  };
  const rules = claimFlags(claimSources('social-posts.txt', shared)).map((f) => `${f.label}|${f.rule}`);
  assert.ok(rules.some((r) => r.startsWith('social-posts.txt (visual)|QR')), 'a QR code in the image is still flagged');
  assert.ok(!rules.some((r) => /customer result/.test(r)), '"reliable" scene direction is not a copy claim');
  const script = { bible: { look: 'dependable efficiency' }, segments: [{ visual: 'reliable workflow', audio: 'Our integrated system.', ends_on: 'x' }] };
  const problems = claimProblems(script);
  assert.ok(problems.some((p) => /integrated/.test(p)), 'spoken audio still triggers the retry');
  assert.ok(!problems.some((p) => /dependable|reliable workflow/.test(p)), 'visual-only copy words do not');
});

test('run-4 review: replacement/requirements variants and curly apostrophes are caught, operator duty is not', () => {
  // Verbatim from output/2026-11-07 run 4 (social posts and video script).
  const caught = {
    'Move beyond paper waivers and spreadsheets.': /workflow\/integration/,
    'helps dive operations managers transition away from manual processing to a defined digital workflow': /workflow\/integration/,
    'See how structured dive center software manages operational flow.': /workflow\/integration/,
    'enforces participant-specific requirements': /mandatory\/blocking/,
    'We’ve been talking with dive center operators': /invented persona/,
  };
  for (const [text, rule] of Object.entries(caught)) {
    assert.ok(claimFlags({ draft: text }).some((f) => rule.test(f.rule)), text);
  }
  const duty = claimFlags({ draft: 'Operators should ensure their own waiver process fits their needs.' });
  assert.ok(!duty.some((f) => /legal\/compliance/.test(f.rule)), 'operator responsibility is not an assurance claim');
});

test('only an operator duty escapes the "ensure" rule; product assurances never do', () => {
  const legal = (text) => claimFlags({ draft: text }).some((f) => /legal\/compliance/.test(f.rule));
  for (const duty of ['Operators should ensure their own waiver process fits.', 'You must ensure the wording suits your activity.']) {
    assert.equal(legal(duty), false, duty);
  }
  for (const claim of [
    'RidgeHQ should ensure every participant signs.',
    'The system must ensure each agreement is recorded.',
    'RidgeHQ ensures every participant signs.',
  ]) {
    assert.equal(legal(claim), true, claim);
  }
});
