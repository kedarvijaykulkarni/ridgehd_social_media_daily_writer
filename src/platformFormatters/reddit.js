import { REDDIT_TITLE_MAX, REDDIT_TITLE_TARGET, REDDIT_BODY_MAX } from '../platformLimits.js';
import { charCount } from '../lib/charCount.js';
import { composeParts, truncateToChars } from '../lib/composeText.js';

// Heuristic only — this cannot actually rewrite tone/register into
// first-person conversational voice (that's an LLM job, and re-prompting
// per-platform is out of scope here). It flags obvious ad-like phrasing so
// a human catches it before manual cross-posting, per the spec's "must not
// read like an ad" requirement.
const PROMOTIONAL_PATTERNS = [
  /\bsign up\b/i,
  /\btry (aquaroster|it) (free|today|now)\b/i,
  /\bbook (a demo|now)\b/i,
  /\bclick here\b/i,
  /!{2,}/,
  /\baquaroster\b.*\baquaroster\b/is,
];

function looksPromotional(text) {
  return PROMOTIONAL_PATTERNS.some((re) => re.test(text));
}

// Reddit: title <= REDDIT_TITLE_TARGET (informative, not clickbait), body
// in the conversational register range. No hashtags (not a Reddit
// convention) — subreddits are passed through for human review instead of
// auto-posting, since self-promotion rules vary widely and auto-posting
// risks bans.
export function formatReddit(shared) {
  const hook = shared.hook_line.trim();
  const title = truncateToChars(hook, REDDIT_TITLE_TARGET);
  const body = composeParts([shared.core_message.trim(), shared.call_to_action.trim()]);

  const titleCount = charCount(title);
  const bodyCount = charCount(body);

  if (titleCount > REDDIT_TITLE_MAX) {
    throw new Error(`Reddit title exceeds hard limit (${titleCount}/${REDDIT_TITLE_MAX} chars).`);
  }
  if (bodyCount > REDDIT_BODY_MAX) {
    throw new Error(`Reddit body exceeds hard limit (${bodyCount}/${REDDIT_BODY_MAX} chars).`);
  }

  const needsReview = looksPromotional(`${shared.core_message} ${shared.call_to_action}`);

  return {
    platform: 'reddit',
    title,
    body,
    char_count: { title: titleCount, body: bodyCount },
    limit: { title: REDDIT_TITLE_MAX, body: REDDIT_BODY_MAX },
    within_limit: titleCount <= REDDIT_TITLE_MAX && bodyCount <= REDDIT_BODY_MAX,
    hashtags_used: [],
    image_prompt: shared.image_prompt,
    reddit_relevant_subreddits: shared.reddit_relevant_subreddits ?? [],
    needs_manual_review: needsReview,
    review_reason: needsReview
      ? 'Heuristic detected ad-like phrasing/tone; rewrite in first-person conversational voice before posting.'
      : null,
  };
}
