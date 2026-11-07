// Recurring on-screen presenter ("AI human character") + visual mode for the
// 1-minute video script.
//
//   VIDEO_CHARACTER      fixed identity of the presenter (face, age, build, hair,
//                        skin tone, distinguishing features). Taken verbatim from
//                        .env — NOT from the model — so the same person is
//                        described identically in every clip and on every day.
//   VIDEO_CHARACTER_REF  optional note/filename of the reference image you attach
//                        to every generation (printed in the output, never read).
//   VIDEO_VISUAL_MODE    "character" (default when a character is set) — the
//                        presenter is on screen in all six clips.
//                        "product" — clips in PRODUCT_FOOTAGE_SEGMENTS are YOUR
//                        real product screen recordings; the presenter still
//                        opens and closes the film and the same human voice
//                        speaks throughout.
//
// Without VIDEO_CHARACTER the video behaves as before (no people on screen).

// 0-based indexes into VIDEO_SEGMENTS: Main action, Development/demo, Result/payoff.
export const PRODUCT_FOOTAGE_SEGMENTS = [2, 3, 4];

export function loadCharacter(env = process.env) {
  const identity = env.VIDEO_CHARACTER?.trim();
  if (!identity) return null;
  return { identity, reference: env.VIDEO_CHARACTER_REF?.trim() || null };
}

export function resolveVisualMode(requested, character) {
  const mode = (requested ?? '').trim().toLowerCase();
  if (mode && mode !== 'character' && mode !== 'product') {
    throw new Error(`VIDEO_VISUAL_MODE must be "character" or "product", got "${requested}"`);
  }
  // Both modes describe a presenter; without one, an explicit mode would
  // silently change (or silently ignore) the no-people output, so refuse it.
  if (mode && !character) {
    throw new Error(`Video mode "${mode}" needs a presenter: set VIDEO_CHARACTER in .env, or clear VIDEO_VISUAL_MODE / --video-mode`);
  }
  if (mode === 'product') return 'product';
  return character ? 'character' : 'none';
}

export function isProductFootage(mode, segmentIndex) {
  return mode === 'product' && PRODUCT_FOOTAGE_SEGMENTS.includes(segmentIndex);
}
