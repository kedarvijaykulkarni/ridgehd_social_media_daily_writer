import {
  sectionsMarkdown,
  takeawaysMarkdown,
  articleWordCount,
  reviewerNote,
  relatedLinksMarkdown,
} from './articleMarkdown.js';
import { BRAND_KEYWORDS } from '../seoFocus.js';

const DEFAULT_BLOG_BASE_URL = 'https://www.ridgehq.app/blog';

function yamlStr(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function slugify(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

// Case-insensitive de-dupe, first spelling wins.
function uniq(list) {
  return [...new Map(list.map((t) => [String(t).toLowerCase(), t])).values()];
}

// Website blog post: YAML frontmatter (for the CMS at ridgehq.app/blog) +
// company-voice body. Same section bodies as the LinkedIn article; the
// opener here is the blog `dek`, and only this renderer emits the SEO block.
// With a `focus` (seoFocus.js) it also emits `keywords`, adds the brand +
// primary keyword to `tags`, and links the solution/platform pages.
export function renderBlogPost({ topic, date, article, productName = 'AquaRoster', blogBaseUrl, focus } = {}) {
  const base = (blogBaseUrl || DEFAULT_BLOG_BASE_URL).replace(/\/+$/, '');
  const slug = slugify(article.slug) || slugify(article.title);
  const tags = uniq([...(article.tags ?? []), ...(focus ? ['ridgehq', focus.vertical.keywords[0]] : [])]).map((t) =>
    yamlStr(t),
  );
  const keywords = focus
    ? uniq([...focus.vertical.keywords, ...focus.platform.keywords, ...BRAND_KEYWORDS]).map((k) => yamlStr(k))
    : [];

  const frontmatter = [
    '---',
    `title: ${yamlStr(article.title)}`,
    `description: ${yamlStr(article.meta_description)}`,
    `slug: ${yamlStr(slug)}`,
    `canonical_url: ${yamlStr(`${base}/${slug}`)}`,
    `tags: [${tags.join(', ')}]`,
    keywords.length ? `keywords: [${keywords.join(', ')}]` : null,
    `date: ${yamlStr(date)}`,
    'draft: true',
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const note = reviewerNote({
    kind: 'Blog post',
    productName,
    date,
    topic,
    wordCount: articleWordCount(article),
    focus,
    text: [article.title, article.meta_description, article.dek, ...(article.sections ?? []).map((s) => s.body)].join(' '),
  });

  const takeaways = takeawaysMarkdown(article.key_takeaways);

  const parts = [
    frontmatter,
    note,
    `# ${article.title}`,
    article.dek ? `_${article.dek.trim()}_` : null,
    sectionsMarkdown(article.sections),
    takeaways || null,
    relatedLinksMarkdown(focus, productName) || null,
    '---',
    article.cta ? `_${article.cta.trim()}_` : null,
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n`;
}
