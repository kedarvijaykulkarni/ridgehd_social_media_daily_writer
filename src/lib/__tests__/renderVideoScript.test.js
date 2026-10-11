import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderVideoScript } from '../renderVideoScript.js';

const SCRIPT = { segments: [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `Visual ${i}.`, audio: `Audio ${i}.` })) };
const VIDEO = { title: 'Waiver system lacks: QR-linked signing', description: 'Move beyond paperwork.' };
const PLANNED = { id: 'qr-signing', status: 'planned', headline: VIDEO.title };

test('renders each time block with Visual and Audio lines', () => {
  const txt = renderVideoScript({ topic: PLANNED, date: '2026-10-11', video: VIDEO, script: SCRIPT, productName: 'RidgeHQ' });
  assert.match(txt, /^RidgeHQ video script — 2026-10-11$/m);
  assert.match(txt, /^0–10 sec — Hook\nVisual: Visual 0\.\nAudio: Audio 0\.$/m);
  assert.match(txt, /^50–60 sec — Ending\/CTA\nVisual: Visual 5\.\nAudio: Audio 5\.$/m);
});

test('carries the YouTube title + description', () => {
  const txt = renderVideoScript({ topic: PLANNED, date: '2026-10-11', video: VIDEO, script: SCRIPT });
  assert.match(txt, /^Title: Waiver system lacks: QR-linked signing$/m);
  assert.match(txt, /^Description: Move beyond paperwork\.$/m);
});

test('roadmap warning only when the topic is not shipped', () => {
  assert.match(renderVideoScript({ topic: PLANNED, date: 'd', video: VIDEO, script: SCRIPT }), /ROADMAP/);
  const shipped = renderVideoScript({ topic: { ...PLANNED, status: 'shipped' }, date: 'd', video: VIDEO, script: SCRIPT });
  assert.doesNotMatch(shipped, /ROADMAP/);
});
