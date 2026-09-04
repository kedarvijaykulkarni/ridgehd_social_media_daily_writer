import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderLinkedInArticle } from '../renderLinkedInArticle.js';

const ARTICLE = {
  title: 'Running a dive center on an AI copilot',
  dek: 'What changes when the assistant can act on the schedule.',
  linkedin_hook: "I've watched dive shops lose mornings to spreadsheet triage.",
  meta_description: 'How an AI copilot changes dive center scheduling.',
  slug: 'dive-center-ai-copilot',
  tags: ['dive operations', 'ai', 'saas'],
  sections: [
    { heading: 'The problem', body: 'Operators juggle tools.' },
    { heading: 'The shift', body: 'One code path for humans and AI.' },
  ],
  key_takeaways: ['AI acts through the same permissions'],
  cta: 'See how the copilot handles a weather day.',
};

const TOPIC = { id: 'ai-copilot', status: 'shipped', headline: 'AI copilot for read and scheduling operations' };

test('opens with the first-person linkedin_hook, not the blog dek', () => {
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /spreadsheet triage/);
  assert.doesNotMatch(md, /What changes when the assistant can act on the schedule\./);
});

test('renders the title and every section', () => {
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /^# Running a dive center on an AI copilot$/m);
  assert.match(md, /^## The problem$/m);
  assert.match(md, /^## The shift$/m);
});

test('omits the blog frontmatter / SEO block entirely', () => {
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.doesNotMatch(md, /^---$/m); // no YAML frontmatter — LinkedIn's editor is rich text
  assert.doesNotMatch(md, /^description:/im);
  assert.doesNotMatch(md, /^slug:/im);
  assert.doesNotMatch(md, /ridgehq\.app\/blog/i);
});

test('carries takeaways, the CTA, and a voice-adjust reviewer note', () => {
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-09-04', article: ARTICLE, productName: 'AquaRoster' });
  assert.match(md, /key takeaways/i);
  assert.match(md, /See how the copilot handles a weather day\./);
  assert.match(md, /first person|voice/i);
});

test('degrades cleanly when the model dropped soft fields (no hook, no cta)', () => {
  const bare = { ...ARTICLE };
  delete bare.linkedin_hook;
  delete bare.cta;
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-09-04', article: bare, productName: 'AquaRoster' });
  assert.match(md, /^# Running a dive center on an AI copilot$/m);
  assert.match(md, /What changes when the assistant can act/); // falls back to dek as the opener
  assert.match(md, /^## The problem$/m);
});
