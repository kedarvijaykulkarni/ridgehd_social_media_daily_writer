import { charCount, toGraphemes } from './charCount.js';

export function splitSentences(text) {
  const matches = text.match(/[^.!?]+[.!?]*/g);
  const sentences = (matches ?? [text]).map((s) => s.trim()).filter(Boolean);
  return sentences.length ? sentences : [text.trim()];
}

export function composeParts(parts, sep = '\n\n') {
  return parts.filter(Boolean).join(sep);
}

export function truncateToChars(text, max) {
  if (max <= 0) return '';
  const graphemes = toGraphemes(text);
  if (graphemes.length <= max) return text;
  return `${graphemes.slice(0, Math.max(0, max - 1)).join('')}…`;
}

// Progressively drops the least-essential pieces (hashtags, then the CTA,
// then trailing sentences of the body) until the assembled text fits `max`,
// hard-truncating the last remaining sentence as a final fallback so the
// result is always within budget. `link` (the landing-page URL) is never
// dropped, and the first `keepTags` hashtags (the pinned #RidgeHQ brand tag)
// survive until only the hook would be left.
export function composeCompressed({ hook, sentences, cta, hashtags, max, sep = '\n\n', link = null, keepTags = 0 }) {
  let tags = [...hashtags];
  let includeCta = Boolean(cta);
  let sentenceCount = sentences.length;
  const minTags = Math.min(keepTags, tags.length);

  function tagPart() {
    return tags.length ? tags.join(' ') : null;
  }

  function build() {
    const bodyPart = sentences.slice(0, sentenceCount).join(' ');
    return composeParts([hook, bodyPart, includeCta ? cta : null, link, tagPart()], sep);
  }

  let text = build();
  while (charCount(text) > max) {
    if (tags.length > minTags) {
      tags = tags.slice(0, -1);
      text = build();
      continue;
    }
    if (includeCta) {
      includeCta = false;
      text = build();
      continue;
    }
    if (sentenceCount > 1) {
      sentenceCount -= 1;
      text = build();
      continue;
    }
    // Last resort: hook alone still fits (spec caps hook_line under 100
    // chars, well under every platform's hard max) — truncate the one
    // remaining sentence to whatever budget is left.
    const withoutBody = composeParts([hook, link, tagPart()], sep);
    const budget = max - charCount(withoutBody) - (withoutBody ? sep.length : 0);
    const truncatedBody = truncateToChars(sentences[0] ?? '', Math.max(budget, 0));
    text = composeParts([hook, truncatedBody, link, tagPart()], sep);
    if (charCount(text) > max) {
      tags = [];
      text = composeParts([hook, truncatedBody, link], sep);
    }
    break;
  }

  return { text, hashtagsUsed: tags, ctaIncluded: includeCta };
}

// Keeps the full base text and only trims trailing hashtags to fit — used
// by formatters (LinkedIn, Instagram) that should never drop real content,
// only the optional hashtag tail.
export function trimHashtagsToFit(baseText, hashtags, max, sep = '\n\n', keepTags = 0) {
  let tags = [...hashtags];
  function build() {
    return tags.length ? composeParts([baseText, tags.join(' ')], sep) : baseText;
  }
  let text = build();
  while (charCount(text) > max && tags.length > Math.min(keepTags, tags.length)) {
    tags = tags.slice(0, -1);
    text = build();
  }
  return { text, hashtags: tags };
}
