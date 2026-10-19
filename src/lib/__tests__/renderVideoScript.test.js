import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderVideoScript } from '../renderVideoScript.js';

const SCRIPT = {
  bible: { setting: 'Jetty set.', look: 'Golden hour.', camera: 'Slow dolly.', voice: 'Warm male, 30s.' },
  segments: [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `Visual ${i}.`, audio: `Audio ${i}.`, ends_on: `End ${i}.` })),
};
const VIDEO = { title: 'Waiver system lacks: QR-linked signing', description: 'Move beyond paperwork.' };
const PLANNED = { id: 'qr-signing', status: 'planned', headline: VIDEO.title };

test('renders each time block with Visual and Audio lines', () => {
  const txt = renderVideoScript({ topic: PLANNED, date: '2026-10-11', video: VIDEO, script: SCRIPT, productName: 'RidgeHQ' });
  assert.match(txt, /^RidgeHQ video script — 2026-10-11$/m);
  assert.match(txt, /^0–10 sec — Hook\nVisual: Visual 0\.\nAudio: Audio 0\.\nEnds on: End 0\.$/m);
  assert.match(txt, /^50–60 sec — Ending\/CTA\nVisual: Visual 5\.\nAudio: Audio 5\.\nEnds on: End 5\.$/m);
});

test('every clip prompt repeats the bible and starts from the previous clip end frame', () => {
  const txt = renderVideoScript({ topic: PLANNED, date: 'd', video: VIDEO, script: SCRIPT });
  assert.equal(txt.match(/^Setting \(unchanged in every clip\): Jetty set\.$/gm).length, 6);
  assert.equal(txt.match(/^Narrator voice \(identical in every clip\): Warm male, 30s\.$/gm).length, 6);
  assert.match(txt, /^Start frame: Opening shot of the film\.$/m);
  assert.match(txt, /^Start frame: .*continuing without a cut: End 2\.$/m);
  assert.match(txt, /^Narration, spoken once and nothing else: "Audio 3\."$/m);
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
