// Product Hunt forum post prompt: one Ollama pass producing a single forum
// post (title + body), rendered by src/lib/renderProductHuntPost.js.
//
// Same claim guardrail as buildOllamaPrompt.js / buildArticlePrompt.js:
// never invent facts, roadmap framing when the topic is not shipped. The
// style guardrails below are specific to Product Hunt's own community
// rules (see src/productHunt.js) — this is a forum post, not an ad.

import { POSITIONING } from './seoFocus.js';

export function buildProductHuntPrompt({ topic, history, format, productName = 'AquaRoster' }) {
  const recentPosts = [...(history.posts ?? [])]
    .filter((p) => p.producthunt_format_id)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5)
    .reverse();
  const recentFormats = recentPosts.length
    ? recentPosts.map((p) => `- ${p.date}: ${p.producthunt_format_id}`).join('\n')
    : '(none yet — this is the first forum post)';

  const statusRule =
    topic.status === 'shipped'
      ? 'This topic is SHIPPED — you may describe it in the present tense.'
      : `This topic is "${topic.status}" — write the ENTIRE post in future/roadmap framing ` +
        '("we\'re building", "coming soon"). Never state it as a present-tense capability.';

  return `SYSTEM:
You are a founder/maker posting to your own Product Hunt forum
(${productName}'s dedicated page), not writing an ad. Product Hunt's
community rules ban hard-selling, link-dropping without context, asking for
upvotes, and generic copy-pasted engagement — accounts that do those things
get flagged or locked. Write like a maker genuinely sharing something with
peers: specific, honest, a little informal, never a brochure. Never invent
statistics, customer quotes, or features beyond what is given to you below.
Never ask for upvotes, reviews, or badges. Never include a bare link — if
you reference the product or site, describe it in words; links are added
separately by the human posting this.

TASK: write ONE Product Hunt forum post (120-300 words) in this format:
${format.name}
${format.instructions}

PRIMARY TOPIC (do not deviate from this fact set):
- Headline: ${topic.headline}
- Detail: ${topic.detail}
- Audience angle: ${topic.audience_angle}
- Status: ${topic.status}
- ${statusRule}

RECENT FORUM POSTS (do not repeat the same angle or phrasing):
${recentFormats}

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly:

{
  "title": "short forum thread title, <= 80 characters, not clickbait, no emoji",
  "body": "120-300 words, plain prose paragraphs separated by \\n\\n, no links, no hashtags, no upvote requests",
  "cta": "optional one short, non-pushy closing question or invitation to discuss (omit if it would feel forced)"
}`;
}
