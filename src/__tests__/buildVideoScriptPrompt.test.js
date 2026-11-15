import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPIC_FACTS } from '../claimRules.js';
import { videoTopicDirection } from '../videoTopicDirection.js';
import { buildVideoScriptPrompt, VIDEO_SEGMENTS } from '../buildVideoScriptPrompt.js';

const SHARED = {
  hook_line: 'Move beyond paperwork: digitize waivers with upcoming QR linking.',
  core_message: 'Seamless digital waivers are coming soon to simplify your intake process.',
  call_to_action: 'See how RidgeHQ unifies your entire operational workflow.',
  image_prompt: 'A photo-realistic, cinematic shot set on a clean, sandy surf school beach at sunrise.',
};
const VIDEO = { title: 'Waiver system lacks: QR-linked signing', description: 'unused here' };
const PLANNED = { id: 'qr-signing', status: 'planned', headline: VIDEO.title };

test('fills the brand / website / email / time-block / topic / info template', () => {
  const prompt = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO, productName: 'RidgeHQ' });
  assert.match(prompt, /^create a 1 min script$/m);
  assert.match(prompt, /^Brand: RidgeHQ$/m);
  assert.match(prompt, /^Website: ridgehq\.app$/m);
  assert.match(prompt, /^Email: social@ridgehq\.app$/m);
  for (const s of VIDEO_SEGMENTS) assert.ok(prompt.includes(`${s.time} — ${s.label}`), s.label);
  assert.match(prompt, /^Topic: Waiver system lacks: QR-linked signing$/m);
  assert.ok(!prompt.includes(SHARED.image_prompt), 'social artwork must not direct the video');
  assert.match(prompt, /^INFORMATION$/m);
  for (const k of ['hook_line', 'core_message', 'call_to_action']) assert.ok(prompt.includes(SHARED[k]), k);
});

test('roadmap framing for a non-shipped topic, present tense allowed when shipped', () => {
  const planned = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO });
  assert.match(planned, /future\/roadmap framing/);
  const shipped = buildVideoScriptPrompt({ topic: { ...PLANNED, status: 'shipped' }, shared: SHARED, video: VIDEO });
  assert.doesNotMatch(shipped, /future\/roadmap framing/);
  assert.match(shipped, /SHIPPED/);
});

test('demands one continuous scene and requests a bible plus ends_on', () => {
  const prompt = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO });
  assert.match(prompt, /ONE continuous 60-second film/);
  assert.match(prompt, /ONE narrator in ONE voice/);
  for (const k of ['bible', 'setting', 'look', 'camera', 'voice', 'ends_on']) assert.ok(prompt.includes(`"${k}"`), k);
});

test('requests JSON segments', () => {
  const prompt = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO });
  assert.match(prompt, /"segments"/);
  assert.match(prompt, /"visual"/);
  assert.match(prompt, /"audio"/);
});

test('the Ending/CTA adds no fact, so 0% commission cannot become the payoff', () => {
  const p = buildVideoScriptPrompt({ topic: { ...PLANNED, status: 'shipped' }, shared: SHARED, video: VIDEO });
  assert.match(p, /It adds no\s+other fact: no 0% commission, no result, no new feature/);
});

test('enforces visual progression across the 6 narrative segments', () => {
  const p = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO });
  assert.match(p, /VISUAL PROGRESSION/);
  assert.match(p, /Hook establishes/);
  assert.match(p, /Ending\/CTA provides a clean\s+closing hold/);
  assert.match(p, /Never freeze on a single static prop/);
});

test('requires real screens and a bounded, natural spoken CTA', () => {
  const p = buildVideoScriptPrompt({ topic: PLANNED, shared: SHARED, video: VIDEO });
  assert.match(p, /REAL SCREENS ONLY/);
  assert.match(p, /Do not speak the email address/);
  assert.match(p, /final CTA has at most 16/);
  assert.match(p, /NATURAL SPEECH CADENCE/);
  assert.match(p, /130-140 WPM/);
});

test('every eligible topic supplies its own fact and angle without a mandatory waiver demo', () => {
  for (const [id, fact_id] of Object.entries(TOPIC_FACTS)) {
    const topic = { id, fact_id, status: 'shipped', headline: id, detail: `Approved fact for ${id}.`, focus_angle: `Focus on ${id}.` };
    const p = buildVideoScriptPrompt({ topic, shared: SHARED, video: VIDEO, scene: 'a sailing school marina' });
    assert.ok(p.includes(`Approved detail: ${topic.detail}`), id);
    assert.ok(p.includes(`This run's angle: ${topic.focus_angle}`), id);
    assert.match(p, /Live-action photorealism in a sailing school marina/);
    assert.match(p, /TOPIC LOCK/);
    assert.ok(p.includes(videoTopicDirection(topic)), id);
    assert.equal(p.includes('- WAIVER TOPIC ONLY:'), fact_id === 'feature.waivers', id);
    assert.ok(!p.includes(SHARED.image_prompt), id);
  }
});

test('each eligible topic has a distinct filming brief without expanding claim authority', () => {
  const directions = Object.entries(TOPIC_FACTS).map(([id, fact_id]) => videoTopicDirection({ id, fact_id }));
  assert.equal(new Set(directions).size, Object.keys(TOPIC_FACTS).length);
  assert.match(videoTopicDirection({ id: 'direct-card-payments' }), /reception office or administrative desk/);
  assert.match(videoTopicDirection({ id: 'gear-maintenance-hold' }), /equipment service or storage area/);
  assert.match(videoTopicDirection({ id: 'guest-self-check-in-by-qr' }), /guest arrival or reception area/);
  assert.match(videoTopicDirection({ id: 'unapproved-topic' }), /Do not substitute another feature/);
});

test('surreal social artwork cannot leak into the video scene', () => {
  const p = buildVideoScriptPrompt({ topic: { id: 'direct-card-payments', headline: 'Direct card payments', detail: "Card payments go straight to the centre's own Stripe account.", status: 'shipped' }, shared: { ...SHARED, image_prompt: 'A coral river of money flows out of the hulls.' }, video: VIDEO });
  assert.doesNotMatch(p, /coral river of money/);
  assert.match(p, /shadow length, weather, exposure and white balance/);
  assert.match(p, /The editor adds the brand/);
});
