import {
  X_TARGET,
  LINKEDIN_TARGET_MIN,
  LINKEDIN_TARGET_MAX,
  INSTAGRAM_TARGET,
} from '../platformLimits.js';

const RULE = '='.repeat(64);

function statusLine(parts) {
  return parts.filter(Boolean).join(' | ');
}

function renderSimplePlatform(label, draft, targetLabel) {
  const meets =
    draft.meets_target !== undefined
      ? `target ${targetLabel}: ${draft.meets_target ? 'met' : 'missed'}`
      : draft.meets_target_band !== undefined
        ? `target band ${targetLabel}: ${draft.meets_target_band ? 'met' : 'missed'}`
        : null;

  return [
    RULE,
    label,
    RULE,
    '',
    draft.text,
    '',
    statusLine([
      `Chars: ${draft.char_count}/${draft.limit} (${draft.within_limit ? 'within limit' : 'OVER LIMIT'})`,
      meets,
    ]),
    `Hashtags used: ${draft.hashtags_used.length ? draft.hashtags_used.join(' ') : '(none)'}`,
  ].join('\n');
}

function renderReddit(draft) {
  return [
    RULE,
    'REDDIT',
    RULE,
    '',
    `Title: ${draft.title}`,
    '',
    'Body:',
    draft.body,
    '',
    statusLine([
      `Chars — title: ${draft.char_count.title}/${draft.limit.title}, body: ${draft.char_count.body}/${draft.limit.body}`,
      `(${draft.within_limit ? 'within limit' : 'OVER LIMIT'})`,
    ]),
    `Needs manual review: ${draft.needs_manual_review ? `YES — ${draft.review_reason}` : 'No'}`,
    `Relevant subreddits (for manual review): ${
      draft.reddit_relevant_subreddits.length ? draft.reddit_relevant_subreddits.join(', ') : '(none)'
    }`,
  ].join('\n');
}

// One reviewable plain-text file covering all 4 platform drafts, with each
// platform's formatting/hashtags baked in exactly as it will be posted, plus
// the char-count/limit metadata a human reviewer needs before copy-pasting.
export function renderSocialText({ topic, date, drafts }) {
  const header = [
    `AquaRosters social drafts — ${date}`,
    `Topic: ${topic.id}${topic.headline ? ` — ${topic.headline}` : ''}`,
    '',
  ].join('\n');

  const sections = [
    renderSimplePlatform('X (TWITTER)', drafts.x, `<=${X_TARGET}`),
    renderSimplePlatform('LINKEDIN', drafts.linkedin, `${LINKEDIN_TARGET_MIN}-${LINKEDIN_TARGET_MAX}`),
    renderSimplePlatform('INSTAGRAM', drafts.instagram, `<=${INSTAGRAM_TARGET}`),
    renderReddit(drafts.reddit),
  ];

  return [header, ...sections].join('\n\n') + '\n';
}
