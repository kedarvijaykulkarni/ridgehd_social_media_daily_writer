import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCharacter, resolveVisualMode, isProductFootage } from '../videoCharacter.js';
import { buildVideoScriptPrompt } from '../buildVideoScriptPrompt.js';
import { validateVideoScriptShape } from '../callOllama.js';
import { renderVideoScript } from '../lib/renderVideoScript.js';
import { renderImagePrompt } from '../lib/renderImagePrompt.js';

const CHARACTER = { identity: 'Aarav, 34, lean build, short black hair, warm brown skin, trimmed beard', reference: 'aarav.png' };
const SHARED = { hook_line: 'h', core_message: 'c', call_to_action: 'a', image_prompt: 'i' };
const VIDEO = { title: 'T', description: 'D' };
const TOPIC = { id: 't', status: 'shipped', headline: 'T' };
const BIBLE = { setting: 'Dock.', look: 'Sunny.', camera: 'Dolly.', voice: 'Warm male, 30s.', wardrobe: 'Navy rash vest, board shorts.' };
const SCRIPT = {
  bible: BIBLE,
  segments: [0, 1, 2, 3, 4, 5].map((i) => ({ visual: `V${i}`, audio: `A${i}`, ends_on: `E${i}` })),
};

test('loadCharacter / resolveVisualMode', () => {
  assert.equal(loadCharacter({}), null);
  assert.deepEqual(loadCharacter({ VIDEO_CHARACTER: ' Aarav ', VIDEO_CHARACTER_REF: ' a.png ' }), { identity: 'Aarav', reference: 'a.png' });
  assert.equal(resolveVisualMode(undefined, null), 'none');
  assert.equal(resolveVisualMode('', CHARACTER), 'character');
  assert.equal(resolveVisualMode('product', CHARACTER), 'product');
  assert.throws(() => resolveVisualMode('hologram', CHARACTER), /must be/);
  // Both explicit modes need a presenter; unset VIDEO_CHARACTER keeps the old output.
  assert.throws(() => resolveVisualMode('product', null), /needs a presenter/);
  assert.throws(() => resolveVisualMode('character', null), /needs a presenter/);
  assert.ok(isProductFootage('product', 3));
  assert.ok(!isProductFootage('product', 0));
  assert.ok(!isProductFootage('character', 3));
});

test('prompt with a character locks identity, wardrobe, human voice; drops the no-people rule', () => {
  const p = buildVideoScriptPrompt({ topic: TOPIC, shared: SHARED, video: VIDEO, character: CHARACTER, mode: 'character' });
  assert.ok(p.includes(CHARACTER.identity));
  assert.match(p, /ONLY person on screen/);
  assert.match(p, /"wardrobe"/);
  assert.match(p, /Never robotic/);
  assert.doesNotMatch(p, /No identifiable people/);
  assert.doesNotMatch(p, /PRODUCT FOOTAGE/);
});

test('product mode marks the demo blocks as real footage', () => {
  const p = buildVideoScriptPrompt({ topic: TOPIC, shared: SHARED, video: VIDEO, character: CHARACTER, mode: 'product' });
  assert.match(p, /PRODUCT FOOTAGE blocks \("20–30 sec — Main action", "30–40 sec — Development\/demo", "40–50 sec — Result\/payoff"\)/);
  assert.match(p, /never ask for the UI to be AI-generated/);
});

test('no character keeps the old no-people prompt', () => {
  const p = buildVideoScriptPrompt({ topic: TOPIC, shared: SHARED, video: VIDEO });
  assert.match(p, /No identifiable people on screen/);
  assert.doesNotMatch(p, /"wardrobe"/);
});

test('wardrobe is required only when a presenter is used', () => {
  const noWardrobe = { ...SCRIPT, bible: { ...BIBLE, wardrobe: '' } };
  assert.doesNotThrow(() => validateVideoScriptShape(noWardrobe));
  assert.throws(() => validateVideoScriptShape(noWardrobe, 6, { withWardrobe: true }), /wardrobe/);
});

test('every presenter clip repeats character + wardrobe + voice; footage clips are flagged', () => {
  const txt = renderVideoScript({ topic: TOPIC, date: 'd', video: VIDEO, script: SCRIPT, character: CHARACTER, mode: 'product' });
  assert.match(txt, /PRESENTER LOCK/);
  assert.equal(txt.match(/^Character \(identical in every clip/gm).length, 6);
  assert.equal(txt.match(/^Character \(identical in every clip — off-screen in this clip, voice-over only\)/gm).length, 3);
  assert.equal(txt.match(/^Wardrobe \(identical in every clip, never changes\): Navy rash vest, board shorts\.$/gm).length, 6);
  assert.equal(txt.match(/^Human voice \(identical in every clip\): Warm male, 30s\.$/gm).length, 6);
  assert.equal(txt.match(/\[PRODUCT FOOTAGE\]/g).length, 3);
  assert.match(txt, /^Dialogue, spoken once by the character on camera, lip-synced, nothing else: "A0"$/m);
});

test('character mode shows the presenter in all six clips', () => {
  const txt = renderVideoScript({ topic: TOPIC, date: 'd', video: VIDEO, script: SCRIPT, character: CHARACTER, mode: 'character' });
  assert.equal(txt.match(/^Character \(identical in every clip/gm).length, 6);
  assert.doesNotMatch(txt, /PRODUCT FOOTAGE\]/);
});

test('image-prompt.txt gets a character keyframe only with a character', () => {
  const withC = renderImagePrompt({ topic: TOPIC, date: 'd', imagePrompt: 'x', character: CHARACTER, bible: BIBLE });
  assert.match(withC, /CHARACTER KEYFRAME/);
  assert.ok(withC.includes('Navy rash vest'));
  assert.doesNotMatch(renderImagePrompt({ topic: TOPIC, date: 'd', imagePrompt: 'x' }), /CHARACTER KEYFRAME/);
});

test('product mode cuts into the footage once and resumes on the last presenter frame', () => {
  const txt = renderVideoScript({ topic: TOPIC, date: 'd', video: VIDEO, script: SCRIPT, character: CHARACTER, mode: 'product' });
  const clip = (n) => txt.slice(txt.indexOf(`CLIP ${n} of`)).split('\n\n')[0];
  assert.match(clip(2), /^Start frame: .*continuing without a cut: E0$/m);
  assert.match(clip(3), /^Start frame: Cut to your real product screen recording/m);
  assert.match(clip(4), /^Start frame: .*continuing without a cut: E2$/m);
  assert.match(clip(6), /^Start frame: Cut back to the presenter, .*\(end of clip 2\): E1$/m);
});

test('product mode rejects footage visuals that skip the prefix or invent UI text/numbers', () => {
  const opts = { withWardrobe: true, mode: 'product', productName: 'RidgeHQ' };
  const footage = (v) => ({ ...SCRIPT, segments: SCRIPT.segments.map((s, i) => ([2, 3, 4].includes(i) ? { ...s, visual: v } : s)) });
  const ok = footage('Screen recording of the real RidgeHQ product: the booking calendar.');
  assert.doesNotThrow(() => validateVideoScriptShape(ok, 6, opts));
  assert.throws(() => validateVideoScriptShape(SCRIPT, 6, opts), /segment 2 is product footage/);
  assert.throws(() => validateVideoScriptShape(footage('Screen recording of the real RidgeHQ product: a "Book now" button.'), 6, opts), /product footage/);
  assert.throws(() => validateVideoScriptShape(footage('Screen recording of the real RidgeHQ product: revenue up 40%.'), 6, opts), /product footage/);
  // Character mode doesn't apply the footage rule.
  assert.doesNotThrow(() => validateVideoScriptShape(SCRIPT, 6, { withWardrobe: true, mode: 'character' }));
});
