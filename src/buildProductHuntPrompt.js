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

// Second Product Hunt block: a question for the General topic. Product
// Hunt's forum guidelines allow General for "tech, products, business,
// startups" and reject posts that mainly promote, so this prompt takes the
// topic only as a *theme* — the post must not mention the product, and
// the caller drops it if it does (see discussionIsProductFree).
export function buildProductHuntDiscussionPrompt({ topic, history }) {
  const recent = [...(history.posts ?? [])]
    .filter((p) => p.producthunt_discussion)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5)
    .reverse()
    .map((p) => `- ${p.date}: theme "${p.topic_id}"`)
    .join('\n') || '(none yet)';

  return `SYSTEM:
You are a software founder posting a genuine discussion question to the
General topic of the Product Hunt forum. Product Hunt rejects posts that
exist mainly to promote something, single-line questions a search could
answer, and link-dropping. Write something other builders would want to
answer: a specific problem, with context, ending in an open question.

HARD RULES
- Do NOT name any product, company, or website, and do not say "we built",
  "our app", or "our platform". The post must stand on its own as a question
  about the problem.
- No links, no hashtags, no upvote or feedback requests, no emoji.
- Share your own perspective briefly, then invite others' views.
- Never invent statistics or customer quotes.

THEME (use only as inspiration for the underlying industry or engineering
problem — do not describe a product or feature that solves it):
- ${topic.headline}
- ${topic.detail}

RECENT DISCUSSION THEMES (pick a different angle):
${recent}

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly:

{
  "title": "specific question-style thread title, <= 80 characters, no emoji",
  "body": "120-250 words, plain prose paragraphs separated by \n\n: the problem and context, your own take, then the open question",
  "cta": "optional one-line follow-up question inviting different perspectives"
}`;
}
