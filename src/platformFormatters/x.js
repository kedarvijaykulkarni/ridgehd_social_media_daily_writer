import { X_MAX, X_TARGET } from '../platformLimits.js';
import { charCount } from '../lib/charCount.js';
import { splitSentences, composeCompressed } from '../lib/composeText.js';
import { buildHashtagPool } from '../lib/hashtags.js';
import { focusHashtags, BRAND_HASHTAGS } from '../seoFocus.js';

// X: compress hard, drop anything non-essential. Max 2-3 hashtags — more
// reads as spammy on X specifically. #RidgeHQ and the landing-page link
// (from `focus`, see seoFocus.js) are always kept. Char counts are raw, so a
// URL is over-counted vs X's 23-char t.co wrap — conservative, never over.
export function formatX(shared, focus) {
  const hook = shared.hook_line.trim();
  const sentences = splitSentences(shared.core_message.trim());
  const cta = shared.call_to_action.trim();
  const hashtags = buildHashtagPool(shared, focusHashtags(focus)).slice(0, 3);

  const { text, hashtagsUsed } = composeCompressed({
    hook,
    sentences,
    cta,
    hashtags,
    max: X_MAX,
    link: focus?.vertical?.url ?? null,
    keepTags: BRAND_HASHTAGS.length,
  });
  const count = charCount(text);

  if (count > X_MAX) {
    throw new Error(`X draft exceeds hard limit (${count}/${X_MAX} chars) even after maximum compression.`);
  }

  return {
    platform: 'x',
    text,
    char_count: count,
    limit: X_MAX,
    within_limit: count <= X_MAX,
    meets_target: count <= X_TARGET,
    hashtags_used: hashtagsUsed,
    image_prompt: shared.image_prompt,
  };
}
