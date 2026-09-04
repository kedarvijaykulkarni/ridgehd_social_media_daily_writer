// Confirmed 2026 platform limits — see docs/prompt-3-nodejs-library.md.
// Kept as named constants (not inlined in formatters) so they're easy to
// update later without touching formatter logic.

export const X_MAX = 280; // free-tier hard limit; do not assume Premium
export const X_TARGET = 260; // leave headroom for hashtags appended at the end

export const LINKEDIN_MAX = 3000; // hard limit
export const LINKEDIN_TARGET_MIN = 1300;
export const LINKEDIN_TARGET_MAX = 1900; // engagement sweet spot, not the hard cap

export const INSTAGRAM_MAX = 2200; // hard limit
export const INSTAGRAM_TARGET = 300; // most engagement happens well under the max

export const REDDIT_TITLE_MAX = 300;
export const REDDIT_TITLE_TARGET = 100;
export const REDDIT_BODY_MAX = 40000;
export const REDDIT_BODY_TARGET_MIN = 800;
export const REDDIT_BODY_TARGET_MAX = 2000; // well under the 40,000 hard cap by design

// Confirmed 2026 recommended single-image post dimensions per platform
// (Buffer/Hootsuite/Sprout Social image-size guides, checked 2026-07-13 —
// see docs/prompt-3-nodejs-library.md's own "verified, not assumed" rule).
// One default size per platform, matching how this tool posts one image
// per platform (not a carousel/story variant).
export const IMAGE_SPECS = [
  { platform: 'x', label: 'X (Twitter) — in-feed image', width: 1600, height: 900, ratio: '16:9' },
  { platform: 'linkedin', label: 'LinkedIn — feed/link image', width: 1200, height: 627, ratio: '1.91:1' },
  { platform: 'instagram', label: 'Instagram — feed post', width: 1080, height: 1350, ratio: '4:5' },
  { platform: 'reddit', label: 'Reddit — post image', width: 1200, height: 1200, ratio: '1:1' },
];
