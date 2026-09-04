function normalizeTag(tag) {
  const trimmed = tag.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  // Hashtags on every target platform (X, LinkedIn, Instagram, Reddit) only
  // recognize letters/numbers/underscore — a hyphen, apostrophe, or other
  // punctuation silently truncates the tag at that character when rendered.
  return `#${withoutHash.replace(/[^A-Za-z0-9_]/g, '')}`;
}

// Interleaves the two hashtag pools (broad-niche / saas-niche) rather than
// concatenating them, so trimming from the end during a fit-to-limit pass
// never wipes out one whole category before touching the other.
export function buildHashtagPool(shared) {
  const broad = (shared.hashtags_broad_niche ?? []).map(normalizeTag);
  const saas = (shared.hashtags_saas_niche ?? []).map(normalizeTag);
  const interleaved = [];
  const max = Math.max(broad.length, saas.length);
  for (let i = 0; i < max; i++) {
    if (broad[i]) interleaved.push(broad[i]);
    if (saas[i]) interleaved.push(saas[i]);
  }
  return [...new Set(interleaved)];
}
