import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectFocus, keywordCoverage, VERTICALS, PLATFORM_PAGES } from '../seoFocus.js';
import { recordUsage } from '../selectTopic.js';
import { formatX } from '../platformFormatters/x.js';
import { formatLinkedin } from '../platformFormatters/linkedin.js';
import { formatInstagram } from '../platformFormatters/instagram.js';
import { buildOllamaPrompt } from '../buildOllamaPrompt.js';
import { renderBlogPost } from '../lib/renderBlogPost.js';
import { renderLinkedInArticle } from '../lib/renderLinkedInArticle.js';

const TOPIC = { id: 't1', category: 'feature', status: 'shipped', headline: 'Waiver system', detail: 'Per-participant waivers.' };
const KB = [TOPIC];

const SHARED = {
  hook_line: 'Your morning should not start in a spreadsheet.',
  core_message:
    'RidgeHQ keeps bookings, staff and gear on one live schedule. ' +
    'Every participant carries their waiver. '.repeat(8) +
    'Front desk and online sales share the same capacity.',
  call_to_action: 'See how it fits your operation.',
  image_prompt: 'x',
  hashtags_broad_niche: ['ridgehq', 'Kayaking', 'Outdoors'],
  hashtags_saas_niche: ['BookingSoftware', 'SaaS'],
};

test('focus rotation visits every vertical and platform page before repeating', () => {
  let history = { posts: [], cycle_number: 1 };
  const seenV = new Set();
  const seenP = new Set();
  for (let day = 1; day <= VERTICALS.length; day++) {
    const focus = selectFocus(history);
    seenV.add(focus.vertical.id);
    seenP.add(focus.platform.id);
    history = recordUsage({ knowledgeBase: KB, history, topic: TOPIC, date: `2026-10-${String(day).padStart(2, '0')}`, focus });
  }
  assert.equal(seenV.size, VERTICALS.length);
  assert.equal(seenP.size, PLATFORM_PAGES.length);
  assert.equal(history.posts[0].vertical_id, VERTICALS[0].id);
});

test('legacy history without vertical_id starts at the first vertical', () => {
  const focus = selectFocus({ posts: [{ date: '2026-09-01', topic_id: 'x' }] });
  assert.equal(focus.vertical.id, VERTICALS[0].id);
});

test('X keeps #RidgeHQ and the landing link even when the body must be compressed', () => {
  const focus = selectFocus({ posts: [] });
  const x = formatX(SHARED, focus);
  assert.ok(x.char_count <= 280);
  assert.ok(x.text.includes(focus.vertical.url), x.text);
  assert.equal(x.hashtags_used[0], '#RidgeHQ');
  assert.equal(x.text.match(/#ridgehq/gi).length, 1, 'model-supplied duplicate #ridgehq is dropped');
});

test('LinkedIn and Instagram lead with #RidgeHQ and the vertical tags', () => {
  const focus = selectFocus({ posts: [] });
  const li = formatLinkedin(SHARED, focus);
  const ig = formatInstagram(SHARED, focus);
  assert.equal(li.hashtags_used[0], '#RidgeHQ');
  assert.ok(li.text.includes(focus.vertical.url));
  assert.equal(ig.hashtags_used[0], '#RidgeHQ');
  assert.ok(ig.hashtags_used.includes(focus.vertical.hashtags[0]));
});

test('short-form prompt is no longer dive-only and asks for the primary keyword', () => {
  const focus = selectFocus({ posts: [] });
  const prompt = buildOllamaPrompt({ topic: TOPIC, knowledgeBase: KB, history: { posts: [] }, focus, productName: 'RidgeHQ' });
  assert.doesNotMatch(prompt, /platform\s+for dive centers\./);
  assert.match(prompt, new RegExp(`TODAY'S AUDIENCE: ${focus.vertical.name}`));
  assert.ok(prompt.includes(`"${focus.vertical.keywords[0]}"`));
});

const ARTICLE = {
  title: 'Kayak rental booking software that runs the dock',
  meta_description: 'How RidgeHQ kayak rental booking software keeps the dock and the desk in sync.',
  slug: 'kayak-rental-booking-software',
  tags: ['kayak rental'],
  sections: [{ heading: 'The problem', body: 'Kayak rental software should not need a spreadsheet.' }],
  key_takeaways: ['One schedule'],
  cta: 'Book a walkthrough.',
};

test('blog post carries SEO keywords, brand tag, coverage note and internal links', () => {
  const focus = selectFocus({ posts: [] });
  const md = renderBlogPost({ topic: TOPIC, date: '2026-10-09', article: ARTICLE, productName: 'RidgeHQ', focus });
  assert.match(md, /^keywords: \[.*"kayak rental booking software"/m);
  assert.match(md, /^tags: \[.*"ridgehq"/m);
  assert.match(md, /SEO keywords present: kayak rental booking software; kayak rental software/);
  assert.ok(md.includes(`](${focus.vertical.url})`));
  assert.ok(md.includes(`](${focus.platform.url})`));
});

test('LinkedIn article ends with links and #RidgeHQ', () => {
  const focus = selectFocus({ posts: [] });
  const md = renderLinkedInArticle({ topic: TOPIC, date: '2026-10-09', article: ARTICLE, productName: 'RidgeHQ', focus });
  assert.match(md, /#RidgeHQ #KayakRental/);
  assert.ok(md.includes(focus.vertical.url));
});

test('keywordCoverage reports found and missing phrases case-insensitively', () => {
  assert.deepEqual(keywordCoverage('Best KAYAK RENTAL software', ['kayak rental software', 'surf']), {
    found: ['kayak rental software'],
    missing: ['surf'],
  });
});
