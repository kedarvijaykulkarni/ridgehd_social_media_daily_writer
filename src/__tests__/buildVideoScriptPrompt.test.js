import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.ok(prompt.includes(SHARED.image_prompt));
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
