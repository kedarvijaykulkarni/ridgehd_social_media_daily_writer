import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildArticlePrompt } from '../buildArticlePrompt.js';
import { selectFocus } from '../seoFocus.js';

const KB = [
  {
    id: 'ai-copilot',
    category: 'feature',
    status: 'shipped',
    headline: 'AI copilot for read and scheduling operations',
    detail: 'The AI copilot reads reservation data and schedules sessions from the same code paths as the UI.',
    audience_angle: 'Operators keep real-time visibility without juggling tools.',
    suggested_visual_theme: 'an AI copilot reshuffling a dive schedule',
  },
  {
    id: 'waiver-system',
    category: 'architecture',
    status: 'shipped',
    headline: 'Waiver system with per-participant enforcement',
    detail: 'Typed e-signature, RLS-protected, built in rather than a metered add-on.',
    audience_angle: 'No separate waiver SKU to buy.',
    suggested_visual_theme: 'a signed waiver on a dive boat',
  },
  {
    id: 'qr-signing-gap',
    category: 'feature',
    status: 'planned',
    headline: 'QR-linked waiver signing is not built yet',
    detail: 'Roadmap only.',
    audience_angle: 'Coming later.',
    suggested_visual_theme: 'a QR code',
  },
];

const FOCUS = selectFocus({ posts: [] });

const HISTORY = {
  posts: [{ date: '2026-09-01', topic_id: 'waiver-system', angle_used: 'architecture' }],
  cycle_number: 1,
};

test('article prompt centers the primary topic', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /AI copilot for read and scheduling operations/);
  assert.match(prompt, /PRIMARY TOPIC/i);
});

test('article prompt passes other shipped chunks as supporting material', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /SUPPORTING MATERIAL/i);
  assert.match(prompt, /Waiver system with per-participant enforcement/);
});

test('article prompt never offers planned/unverified chunks as supporting material', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  // the planned chunk may only appear if it were the primary topic — here it is not
  assert.ok(!prompt.includes('QR-linked waiver signing is not built yet'));
});

test('article prompt templates the product name and requests the JSON keys', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /copywriter for RidgeHQ/);
  for (const key of ['title', 'dek', 'linkedin_hook', 'meta_description', 'slug', 'tags', 'sections', 'key_takeaways', 'cta']) {
    assert.match(prompt, new RegExp(`"${key}"`), `prompt should request "${key}"`);
  }
});

test('article prompt forces roadmap framing when the primary topic is not shipped', () => {
  const prompt = buildArticlePrompt({ topic: KB[2], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /planned|roadmap|coming soon/i);
});

test('article prompt lists recent headlines to avoid repetition', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /RECENTLY COVERED/i);
});

test('article prompt targets the focus vertical and its SEO keywords, not the unapproved platform page', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, new RegExp(`TODAY'S AUDIENCE: ${FOCUS.vertical.name}`));
  assert.ok(prompt.includes(`"${FOCUS.vertical.keywords[0]}"`), 'primary keyword requested verbatim');
  assert.ok(!prompt.includes(FOCUS.platform.name), 'no platform feature page in the prompt');
  for (const k of FOCUS.platform.keywords) assert.ok(!prompt.includes(`"${k}"`), `platform keyword ${k}`);
  assert.doesNotMatch(prompt, /platform\s+for dive centers\./);
});

test('asks the model for one of the website blog pillars', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: { posts: [] }, focus: FOCUS });
  assert.match(prompt, /"pillar": "exactly one of: Business Economics \| Operations \| Technology/);
});

test('the LinkedIn opener is the product team speaking, never an invented operator', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /written as the\s+RidgeHQ team/);
  assert.match(prompt, /Never write as an\s+operator and never invent experience, conversations, events or anecdotes/);
  assert.doesNotMatch(prompt, /we've been talking/i, 'the example itself must not model invented conversations');
  assert.match(prompt, /"linkedin_hook": "[^"]*from the RidgeHQ team \(not an operator, no invented experience\)/);
});

test('the article is kept short so a three-fact topic is not padded with invented claims', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, focus: FOCUS, productName: 'RidgeHQ' });
  assert.match(prompt, /\(500–800 words\)/);
  assert.match(prompt, /do not pad length with claims the facts do not make/);
  assert.match(prompt, /Aim for 3–4 sections/);
});
