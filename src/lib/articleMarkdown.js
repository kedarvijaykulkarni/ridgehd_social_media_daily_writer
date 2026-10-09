import { countWords } from './charCount.js';
import { SITE_URL, keywordCoverage } from '../seoFocus.js';

// Shared markdown fragments for the two long-form renderers
// (renderBlogPost.js, renderLinkedInArticle.js). The section bodies are
// identical between the blog post and the LinkedIn article — only the
// opener and the blog-only SEO block differ.

export function sectionsMarkdown(sections = []) {
  return sections.map((s) => `## ${s.heading.trim()}\n\n${s.body.trim()}`).join('\n\n');
}

export function takeawaysMarkdown(takeaways = []) {
  if (!takeaways.length) return '';
  return ['## Key takeaways', '', ...takeaways.map((t) => `- ${t}`)].join('\n');
}

export function articleWordCount(article) {
  const parts = [
    ...(article.sections ?? []).map((s) => s.body),
    ...(article.key_takeaways ?? []),
  ];
  return parts.reduce((n, p) => n + countWords(p), 0);
}

// Reviewer banner shared by both renderers — carries the same claim safety
// rail as CLAUDE.md rule 4, and shouts when the topic is not shipped.
export function reviewerNote({ kind, productName, date, topic, wordCount, focus, text }) {
  const lines = [
    `<!--`,
    `  ${kind} draft — ${productName} — ${date}`,
    `  Source topic: ${topic.id} (${topic.status})${topic.headline ? ` — ${topic.headline}` : ''}`,
    `  ~${wordCount} words in the body.`,
  ];
  if (focus) {
    const { found, missing } = keywordCoverage(text, focus.vertical.keywords);
    lines.push(
      `  Website focus: ${focus.vertical.name} (${focus.vertical.url}) + ${focus.platform.name}.`,
      `  SEO keywords present: ${found.length ? found.join('; ') : '(none)'}`,
      `  SEO keywords MISSING: ${missing.length ? missing.join('; ') : '(none)'}${
        missing.includes(focus.vertical.keywords[0]) ? '  ⚠️ primary phrase missing — add it by hand' : ''
      }`,
    );
  }
  lines.push(
    `  REVIEW BEFORE PUBLISHING: verify every specific claim against the`,
    `  business vault (wiki/business-context.md §2) per CLAUDE.md rule 4.`,
  );
  if (topic.status !== 'shipped') {
    lines.push(
      `  ⚠️ ROADMAP: topic status is "${topic.status}" — this draft must stay in`,
      `  future/"coming soon" framing. Do NOT let any sentence read as a`,
      `  present-tense capability claim.`,
    );
  }
  lines.push(`-->`);
  return lines.join('\n');
}

// Internal links back into ridgehq.app — the vertical's solution page, the
// featured platform page, and the homepage. Same block for blog + LinkedIn.
export function relatedLinksMarkdown(focus, productName) {
  if (!focus) return '';
  const { vertical, platform } = focus;
  return [
    `## Learn more about ${productName}`,
    '',
    `- [${productName} for ${vertical.name}](${vertical.url})`,
    `- [${platform.name}](${platform.url})`,
    `- [${productName} — the Activity Business OS](${SITE_URL}/)`,
  ].join('\n');
}
