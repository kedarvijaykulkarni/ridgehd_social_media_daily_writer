import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderVideoCoverPrompt, coverHook } from '../renderVideoCoverPrompt.js';
import { parseVideoScript } from '../parseVideoScript.js';
import { renderVideoScript } from '../renderVideoScript.js';

const VIDEO = { title: 'AI permission gating', description: 'Stop worrying about unintended changes. Your data is safer. More.' };
const TOPIC = { id: 'ai-gating', status: 'shipped', headline: VIDEO.title };
const BIBLE = { setting: 'Surf school beach.', look: 'Golden hour.', camera: 'Dolly.', voice: 'Warm male.', wardrobe: 'Navy rash vest.' };

test('hook is the first sentence of the description, no trailing punctuation', () => {
  assert.equal(coverHook(VIDEO.description), 'Stop worrying about unintended changes');
});

test('with a presenter: reference, outfit, exact headline rules, site tag', () => {
  const t = renderVideoCoverPrompt({ topic: TOPIC, date: 'd', video: VIDEO, bible: BIBLE, character: { identity: 'Olivia, 30', reference: '@Olivia' } });
  assert.match(t, /\(@Olivia\)/);
  assert.match(t, /Outfit: Navy rash vest\./);
  assert.match(t, /Surf school beach\./);
  assert.match(t, /3-5 punchy words/);
  assert.match(t, /"ridgehq\.app"/);
  assert.doesNotMatch(t, /ROADMAP/);
});

test('without a presenter: no people; roadmap topics get a warning', () => {
  const t = renderVideoCoverPrompt({ topic: { ...TOPIC, status: 'planned' }, date: 'd', video: VIDEO });
  assert.match(t, /No people in the image/);
  assert.match(t, /ROADMAP/);
  assert.doesNotMatch(t, /head and shoulders|face about|reference image \(|extra people/);
  assert.match(t, /No reference image/);
});

test('parseVideoScript round-trips a rendered video-script.txt', () => {
  const script = { bible: BIBLE, segments: [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `V${i}`, audio: `A${i}`, ends_on: `E${i}` })) };
  const txt = renderVideoScript({ topic: TOPIC, date: 'd', video: VIDEO, script, character: { identity: 'Olivia, 30' }, mode: 'character' });
  const p = parseVideoScript(txt);
  assert.equal(p.topic.id, 'ai-gating');
  assert.equal(p.video.title, VIDEO.title);
  assert.equal(p.bible.wardrobe, 'Navy rash vest.');
  assert.equal(p.identity, 'Olivia, 30');
  assert.throws(() => parseVideoScript('nothing here'), /no YouTube Title/);
});

test('parseVideoScript keeps the recorded presenter reference and the exact roadmap status', () => {
  const script = { bible: BIBLE, segments: [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `V${i}`, audio: `A${i}`, ends_on: `E${i}` })) };
  const txt = renderVideoScript({
    topic: { ...TOPIC, status: 'unverified' }, date: 'd', video: VIDEO, script,
    character: { identity: 'Olivia, 30', reference: '@Olivia' }, mode: 'character',
  });
  const p = parseVideoScript(txt);
  assert.equal(p.reference, '@Olivia');
  assert.equal(p.topic.status, 'unverified');
  const shipped = parseVideoScript(renderVideoScript({ topic: TOPIC, date: 'd', video: VIDEO, script }));
  assert.equal(shipped.topic.status, 'shipped');
  assert.equal(shipped.reference, null);
});

test('the cover cue never suggests a security, booking or pricing symbol', () => {
  const text = renderVideoCoverPrompt({
    topic: { id: 'waiver-system', status: 'shipped', headline: 'Waiver system' },
    date: '2026-11-07',
    video: { title: 'Waiver system', description: 'Digital waivers are built in.' },
    bible: {},
  });
  assert.doesNotMatch(text, /e\.g\.[^)]*(shield|calendar|price tag)/);
  assert.match(text, /Never a shield, padlock, calendar, price tag, chart, dashboard or screen/);
});
