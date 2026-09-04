import { sectionsMarkdown, takeawaysMarkdown, articleWordCount, reviewerNote } from './articleMarkdown.js';

// LinkedIn article: no YAML frontmatter (LinkedIn's article editor is rich
// text — frontmatter would paste as literal junk), no SEO block. Same
// section bodies as the blog post, but opens with the first-person
// `linkedin_hook` instead of the blog `dek`.
//
// Honesty limitation (same posture as the Reddit formatter): the section
// bodies are voice-neutral. This renderer does NOT rewrite them into first
// person — it flags that for the human instead.
export function renderLinkedInArticle({ topic, date, article, productName = 'AquaRoster' } = {}) {
  const note = reviewerNote({
    kind: 'LinkedIn article',
    productName,
    date,
    topic,
    wordCount: articleWordCount(article),
  });

  const voiceNote =
    '<!-- LinkedIn articles read better in first person. The opener below is ' +
    'first person; the section bodies are voice-neutral — tighten them to your ' +
    'own voice before publishing. This draft does not rewrite them for you. -->';

  const takeaways = takeawaysMarkdown(article.key_takeaways);

  const opener = (article.linkedin_hook || article.dek || '').trim();

  const parts = [
    note,
    voiceNote,
    `# ${article.title}`,
    opener || null,
    sectionsMarkdown(article.sections),
    takeaways || null,
    article.cta ? `**${article.cta.trim()}**` : null,
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n`;
}
