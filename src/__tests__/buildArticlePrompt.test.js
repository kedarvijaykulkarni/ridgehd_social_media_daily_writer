import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildArticlePrompt } from '../buildArticlePrompt.js';

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

const HISTORY = {
  posts: [{ date: '2026-09-01', topic_id: 'waiver-system', angle_used: 'architecture' }],
  cycle_number: 1,
};

test('article prompt centers the primary topic', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, productName: 'AquaRoster' });
  assert.match(prompt, /AI copilot for read and scheduling operations/);
  assert.match(prompt, /PRIMARY TOPIC/i);
});

test('article prompt passes other shipped chunks as supporting material', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, productName: 'AquaRoster' });
  assert.match(prompt, /SUPPORTING MATERIAL/i);
  assert.match(prompt, /Waiver system with per-participant enforcement/);
});

test('article prompt never offers planned/unverified chunks as supporting material', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, productName: 'AquaRoster' });
  // the planned chunk may only appear if it were the primary topic — here it is not
  assert.ok(!prompt.includes('QR-linked waiver signing is not built yet'));
});

test('article prompt templates the product name and requests the JSON keys', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, productName: 'RidgeHQ' });
  assert.match(prompt, /copywriter for RidgeHQ/);
  for (const key of ['title', 'dek', 'linkedin_hook', 'meta_description', 'slug', 'tags', 'sections', 'key_takeaways', 'cta']) {
    assert.match(prompt, new RegExp(`"${key}"`), `prompt should request "${key}"`);
  }
});

test('article prompt forces roadmap framing when the primary topic is not shipped', () => {
  const prompt = buildArticlePrompt({ topic: KB[2], knowledgeBase: KB, history: HISTORY, productName: 'AquaRoster' });
  assert.match(prompt, /planned|roadmap|coming soon/i);
});

test('article prompt lists recent headlines to avoid repetition', () => {
  const prompt = buildArticlePrompt({ topic: KB[0], knowledgeBase: KB, history: HISTORY, productName: 'AquaRoster' });
  assert.match(prompt, /RECENTLY COVERED/i);
});
