import { REDDIT_TITLE_MAX, REDDIT_TITLE_TARGET, REDDIT_BODY_MAX } from '../platformLimits.js';
import { charCount } from '../lib/charCount.js';
import { composeParts, truncateToChars } from '../lib/composeText.js';

// Heuristic only — this cannot actually rewrite tone/register into
// first-person conversational voice (that's an LLM job, and re-prompting
// per-platform is out of scope here). It flags obvious ad-like phrasing so
// a human catches it before manual cross-posting, per the spec's "must not
// read like an ad" requirement.
// Heuristic ad-tone flags. The product-name alternations cover the two
// candidate names (see PRODUCT_NAME in .env) so a rename doesn't silently
// weaken the check.
const PROMOTIONAL_PATTERNS = [
  /\bsign up\b/i,
  /\btry (aquaroster|ridgehq|it) (free|today|now)\b/i,
  /\bbook (a demo|now)\b/i,
  /\bclick here\b/i,
  /!{2,}/,
  /\b(aquaroster|ridgehq)\b.*\b(aquaroster|ridgehq)\b/is,
  // Run 4 (2026-11-07) named the product once and still read as an ad:
  // a third-person feature pitch plus a "See how…" call to action.
  /\b(aquaroster|ridgehq) (features|provides|offers|delivers)\b/i,
  /\b(see|learn|discover|explore) (how|more about)\b/i,
];

function looksPromotional(text) {
  return PROMOTIONAL_PATTERNS.some((re) => re.test(text));
}

// Reddit: title aims for REDDIT_TITLE_TARGET (informative, not clickbait;
// `meets_title_target` says whether it did) and is only cut at the hard max, body
// in the conversational register range. No hashtags (not a Reddit
// convention) — subreddits are passed through for human review instead of
// auto-posting, since self-promotion rules vary widely and auto-posting
// risks bans.
export function formatReddit(shared) {
  const hook = shared.hook_line.trim();
  // Truncate only at the hard limit: cutting at the 100-char target chopped
  // a 101-char hook mid-word ("0% commissio…"). The target is reported below.
  const title = truncateToChars(hook, REDDIT_TITLE_MAX);
  const body = composeParts([shared.core_message.trim(), shared.call_to_action.trim()]);

  const titleCount = charCount(title);
  const bodyCount = charCount(body);

  if (titleCount > REDDIT_TITLE_MAX) {
    throw new Error(`Reddit title exceeds hard limit (${titleCount}/${REDDIT_TITLE_MAX} chars).`);
  }
  if (bodyCount > REDDIT_BODY_MAX) {
    throw new Error(`Reddit body exceeds hard limit (${bodyCount}/${REDDIT_BODY_MAX} chars).`);
  }

  // Reddit stays link- and hashtag-free (self-promo rules), but core_message
  // and call_to_action are shared with the other platforms and pass through
  // verbatim — flag rather than silently rewrite the model's copy.
  const bodyText = `${shared.core_message} ${shared.call_to_action}`;
  const hasLinkOrTag = [
    /https?:\/\/|\bwww\./i,
    /\b[a-z0-9-]+\.(app|com|io|net|org|co|dev|ai)\b/i, // bare domain: ridgehq.app
    /(^|[^\w&])#[a-z]\w*/i, // #tag, also inside "(#tag)"
  ].some((re) => re.test(`${title} ${body}`));
  const isPromotional = looksPromotional(bodyText);
  const needsReview = hasLinkOrTag || isPromotional;
  const reasons = [
    hasLinkOrTag && 'Body contains a link or hashtag; remove it before posting (Reddit self-promotion rules).',
    isPromotional && 'Heuristic detected ad-like phrasing/tone; rewrite in first-person conversational voice before posting.',
  ].filter(Boolean);

  return {
    platform: 'reddit',
    title,
    body,
    char_count: { title: titleCount, body: bodyCount },
    limit: { title: REDDIT_TITLE_MAX, body: REDDIT_BODY_MAX },
    within_limit: titleCount <= REDDIT_TITLE_MAX && bodyCount <= REDDIT_BODY_MAX,
    meets_title_target: titleCount <= REDDIT_TITLE_TARGET,
    hashtags_used: [],
    image_prompt: shared.image_prompt,
    reddit_relevant_subreddits: shared.reddit_relevant_subreddits ?? [],
    needs_manual_review: needsReview,
    review_reason: needsReview ? reasons.join(' ') : null,
  };
}
