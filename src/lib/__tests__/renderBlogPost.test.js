import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBlogPost } from '../renderBlogPost.js';

const ARTICLE = {
  title: 'Running a dive center on an AI copilot',
  dek: 'What changes when the assistant can act on the schedule.',
  linkedin_hook: "I've watched dive shops lose mornings to spreadsheet triage.",
  meta_description: 'How an AI copilot built into the operational core changes dive center scheduling.',
  slug: 'dive-center-ai-copilot',
  tags: ['dive operations', 'ai', 'saas'],
  sections: [
    { heading: 'The problem', body: 'Operators juggle tools.' },
    { heading: 'The shift', body: 'One code path for humans and AI.' },
  ],
  key_takeaways: ['AI acts through the same permissions', 'Audit trail separates AI from human'],
  cta: 'See how the copilot handles a weather day.',
};

const SHIPPED_TOPIC = { id: 'ai-copilot', status: 'shipped', headline: 'AI copilot for read and scheduling operations' };
const PLANNED_TOPIC = { id: 'qr-signing', status: 'planned', headline: 'QR-linked waiver signing' };

test('renders an H1 title and one H2 per section', () => {
  const md = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /^# Running a dive center on an AI copilot$/m);
  assert.match(md, /^## The problem$/m);
  assert.match(md, /^## The shift$/m);
  assert.match(md, /Operators juggle tools\./);
});

test('emits frontmatter: description, slug, canonical url, tags, date, draft flag', () => {
  const md = renderBlogPost({
    topic: SHIPPED_TOPIC,
    date: '2026-09-04',
    article: ARTICLE,
    productName: 'AquaRoster',
    blogBaseUrl: 'https://www.ridgehq.app/blog',
  });
  assert.match(md, /^---$/m);
  assert.match(md, /^description:.*operational core/im);
  assert.match(md, /^slug:\s*["']?dive-center-ai-copilot/im);
  assert.match(md, /^canonical_url:\s*["']?https:\/\/www\.ridgehq\.app\/blog\/dive-center-ai-copilot/im);
  assert.match(md, /^tags:.*dive operations/im);
  assert.match(md, /^date:\s*["']?2026-09-04/im);
  assert.match(md, /^draft:\s*true/im);
});

test('includes key takeaways and the CTA', () => {
  const md = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /key takeaways/i);
  assert.match(md, /- AI acts through the same permissions/);
  assert.match(md, /See how the copilot handles a weather day\./);
});

test('adds a roadmap-verify warning when the topic is not shipped', () => {
  const md = renderBlogPost({ topic: PLANNED_TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /ROADMAP/);
  assert.match(md, /planned/i);
});

test('no roadmap warning for a shipped topic', () => {
  const md = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.doesNotMatch(md, /ROADMAP/);
});

test('emits a valid pillar: the model pick, else derived from the topic category', () => {
  const picked = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: { ...ARTICLE, pillar: 'Technology' } });
  assert.match(picked, /^pillar: "Technology"$/m);

  const invalid = renderBlogPost({
    topic: { ...SHIPPED_TOPIC, category: 'pricing-model' },
    date: '2026-09-04',
    article: { ...ARTICLE, pillar: 'Marketing' },
  });
  assert.match(invalid, /^pillar: "Business Economics"$/m);

  const fallback = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: ARTICLE });
  assert.match(fallback, /^pillar: "Operations"$/m);
});

test('emits a video block with title + description and blank YouTube-only fields', () => {
  const md = renderBlogPost({
    topic: SHIPPED_TOPIC,
    date: '2026-09-04',
    article: ARTICLE,
    video: { title: 'Waiver system lacks: QR-linked signing', description: 'Move beyond "paperwork".' },
  });
  const frontmatter = md.split(/^---$/m)[1];
  assert.match(frontmatter, /^video:$/m);
  assert.match(frontmatter, /^ {2}youtubeId: ""/m);
  assert.match(frontmatter, /^ {2}title: "Waiver system lacks: QR-linked signing"$/m);
  assert.match(frontmatter, /^ {2}description: "Move beyond \\"paperwork\\"\."$/m);
  assert.match(frontmatter, /^ {2}uploadDate: ""/m);
  assert.match(frontmatter, /^ {2}durationSeconds: ""/m);
});

test('no video block without a video', () => {
  const md = renderBlogPost({ topic: SHIPPED_TOPIC, date: '2026-09-04', article: ARTICLE });
  assert.doesNotMatch(md, /^video:/m);
});
