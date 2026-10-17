import { FORUM_URL } from '../productHunt.js';

const RULE = '-'.repeat(64);

// Reviewer banner: same claim-safety rail as articleMarkdown.js's
// reviewerNote, plus Product Hunt's own posting rules (never auto-publish —
// see README/CLAUDE.md rule 1 — this is always a draft for a human to paste
// into the forum themselves).
function reviewerNote({ productName, date, topic, format }) {
  const lines = [
    RULE,
    `${productName} Product Hunt forum draft — ${date}`,
    `Forum: ${FORUM_URL}`,
    `Format: ${format.name} (${format.id})`,
    `Source topic: ${topic.id} (${topic.status})${topic.headline ? ` — ${topic.headline}` : ''}`,
    RULE,
    'REVIEW BEFORE POSTING:',
    '- Verify every specific claim against the business vault',
    '  (wiki/business-context.md §2) per CLAUDE.md rule 4.',
    '- Never ask for upvotes, reviews, or badges.',
    '- Do not paste this same text into another thread or product\'s page.',
    '- Add any link yourself, with real context around it — none is included here.',
  ];
  if (topic.status !== 'shipped') {
    lines.push(
      `- ⚠️ ROADMAP: topic status is "${topic.status}" — keep this in future/`,
      '  "coming soon" framing. Do not let it read as a present-tense capability.',
    );
  }
  lines.push(RULE);
  return lines.join('\n');
}

export function renderProductHuntPost({ topic, date, format, post, productName = 'AquaRoster' }) {
  const parts = [
    reviewerNote({ productName, date, topic, format }),
    `TITLE: ${post.title.trim()}`,
    '',
    post.body.trim(),
  ];
  if (post.cta) parts.push('', post.cta.trim());
  return `${parts.join('\n')}\n`;
}
