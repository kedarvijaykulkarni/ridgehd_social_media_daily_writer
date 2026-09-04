// Real character counting, not naive `.length` — `.length` counts UTF-16
// code units, so emoji and other astral-plane characters count as 2+,
// silently under-reporting how much room is actually left on a platform
// that counts what's visibly rendered. Intl.Segmenter counts grapheme
// clusters (what a person would call "one character").
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function charCount(text) {
  if (!text) return 0;
  let count = 0;
  // eslint-disable-next-line no-unused-vars
  for (const _ of segmenter.segment(text)) count++;
  return count;
}

export function toGraphemes(text) {
  return [...segmenter.segment(text ?? '')].map((s) => s.segment);
}
