import { LINKEDIN_MAX, LINKEDIN_TARGET_MIN, LINKEDIN_TARGET_MAX } from '../platformLimits.js';
import { charCount } from '../lib/charCount.js';
import { composeParts, trimHashtagsToFit } from '../lib/composeText.js';
import { buildHashtagPool } from '../lib/hashtags.js';

// LinkedIn: keep more context/story — never drop content, only trim the
// hashtag tail if somehow over the hard limit. Note: this formatter never
// fabricates filler to reach the 1,300-1,900 char engagement sweet spot —
// it only guarantees the hard 3,000 char cap. `meets_target_band` tells you
// honestly whether today's draft happened to land in that range.
export function formatLinkedin(shared) {
  const hook = shared.hook_line.trim();
  const body = shared.core_message.trim();
  const cta = shared.call_to_action.trim();
  const hashtags = buildHashtagPool(shared).slice(0, 5);

  const base = composeParts([hook, body, cta]);
  const { text, hashtags: used } = trimHashtagsToFit(base, hashtags, LINKEDIN_MAX);
  const count = charCount(text);

  if (count > LINKEDIN_MAX) {
    throw new Error(
      `LinkedIn draft exceeds hard limit (${count}/${LINKEDIN_MAX} chars) even with zero hashtags — shorten core_message upstream.`,
    );
  }

  return {
    platform: 'linkedin',
    text,
    char_count: count,
    limit: LINKEDIN_MAX,
    within_limit: count <= LINKEDIN_MAX,
    meets_target_band: count >= LINKEDIN_TARGET_MIN && count <= LINKEDIN_TARGET_MAX,
    hashtags_used: used,
    image_prompt: shared.image_prompt,
  };
}
