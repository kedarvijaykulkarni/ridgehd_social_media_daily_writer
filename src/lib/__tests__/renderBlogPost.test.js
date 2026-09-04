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
