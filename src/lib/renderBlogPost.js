import { sectionsMarkdown, takeawaysMarkdown, articleWordCount, reviewerNote } from './articleMarkdown.js';

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

// Website blog post: YAML frontmatter (for the CMS at ridgehq.app/blog) +
// company-voice body. Same section bodies as the LinkedIn article; the
// opener here is the blog `dek`, and only this renderer emits the SEO block.
export function renderBlogPost({ topic, date, article, productName = 'AquaRoster', blogBaseUrl } = {}) {
  const base = (blogBaseUrl || DEFAULT_BLOG_BASE_URL).replace(/\/+$/, '');
  const slug = slugify(article.slug) || slugify(article.title);
  const tags = (article.tags ?? []).map((t) => yamlStr(t));

  const frontmatter = [
    '---',
    `title: ${yamlStr(article.title)}`,
    `description: ${yamlStr(article.meta_description)}`,
    `slug: ${yamlStr(slug)}`,
    `canonical_url: ${yamlStr(`${base}/${slug}`)}`,
    `tags: [${tags.join(', ')}]`,
    `date: ${yamlStr(date)}`,
    'draft: true',
    '---',
  ].join('\n');

  const note = reviewerNote({
    kind: 'Blog post',
    productName,
    date,
    topic,
    wordCount: articleWordCount(article),
  });

  const takeaways = takeawaysMarkdown(article.key_takeaways);

  const parts = [
    frontmatter,
    note,
    `# ${article.title}`,
    article.dek ? `_${article.dek.trim()}_` : null,
    sectionsMarkdown(article.sections),
    takeaways || null,
    '---',
    article.cta ? `_${article.cta.trim()}_` : null,
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n`;
}
