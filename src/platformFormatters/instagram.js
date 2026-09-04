import { INSTAGRAM_MAX, INSTAGRAM_TARGET } from '../platformLimits.js';
import { charCount } from '../lib/charCount.js';
import { splitSentences, composeCompressed } from '../lib/composeText.js';
import { buildHashtagPool } from '../lib/hashtags.js';

// Instagram: stay short, let the image carry weight. Convention wants
// 15-25 trailing hashtags, but Prompt 2 only ever generates ~5-9
// (hashtags_broad_niche + hashtags_saas_niche combined) — this formatter
// uses every real tag it's given and never fabricates extras to hit that
// range, so `hashtags_used.length` will usually read below 15.
export function formatInstagram(shared) {
  const hook = shared.hook_line.trim();
  const sentences = splitSentences(shared.core_message.trim());
  const cta = shared.call_to_action.trim();
  const hashtags = buildHashtagPool(shared);

  const { text, hashtagsUsed } = composeCompressed({ hook, sentences, cta, hashtags, max: INSTAGRAM_MAX });
  const count = charCount(text);

  if (count > INSTAGRAM_MAX) {
    throw new Error(`Instagram draft exceeds hard limit (${count}/${INSTAGRAM_MAX} chars) even after maximum compression.`);
  }

  return {
    platform: 'instagram',
    text,
    char_count: count,
    limit: INSTAGRAM_MAX,
    within_limit: count <= INSTAGRAM_MAX,
    meets_target: count <= INSTAGRAM_TARGET,
    hashtags_used: hashtagsUsed,
    image_prompt: shared.image_prompt,
  };
}
