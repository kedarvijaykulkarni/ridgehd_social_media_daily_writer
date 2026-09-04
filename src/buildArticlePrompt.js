// Long-form prompt: one Ollama pass that produces a single article JSON,
// rendered afterwards into two drafts (a website blog post and a LinkedIn
// article — see src/lib/renderBlogPost.js and renderLinkedInArticle.js).
//
// Same guardrails as buildOllamaPrompt.js: never invent facts, and if the
// primary topic is not "shipped" the whole piece stays in roadmap framing.
// Only "shipped" chunks are ever offered as supporting material.

const MAX_SUPPORTING = 6;
const SUPPORTING_DETAIL_CHARS = 240;

function clip(text, n) {
  const clean = (text ?? '').trim();
  return clean.length > n ? `${clean.slice(0, n - 1).trimEnd()}…` : clean;
}

export function buildArticlePrompt({ topic, knowledgeBase, history, productName = 'AquaRoster' }) {
  const kbById = new Map(knowledgeBase.map((e) => [e.id, e]));

  const supporting = knowledgeBase
    .filter((e) => e.id !== topic.id && e.status === 'shipped')
    .slice(0, MAX_SUPPORTING)
    .map((e) => `- ${e.headline} — ${clip(e.detail, SUPPORTING_DETAIL_CHARS)}`)
    .join('\n');

  const recentPosts = [...(history.posts ?? [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5)
    .reverse();
  const recentHeadlines = recentPosts.length
    ? recentPosts.map((p) => `- ${kbById.get(p.topic_id)?.headline ?? p.topic_id}`).join('\n')
    : '(none yet — this is the first post)';

  const statusRule =
    topic.status === 'shipped'
      ? 'This topic is SHIPPED — you may write about it in the present tense.'
      : `This topic is "${topic.status}" — write the ENTIRE article in future/roadmap framing ` +
        '("we\'re building", "coming soon"). Never state it as a present-tense capability.';

  return `SYSTEM:
You are the social media copywriter for ${productName}, a B2B SaaS operations
platform for dive centers. You write for dive shop owners and operations
managers, never for end-consumer divers. Tone: confident, specific, no hype,
no exclamation-point-per-sentence energy. Never invent statistics, customer
quotes, or features beyond what is given to you below. Never mention internal
codenames, or competitors by name in a disparaging way.

TASK: write ONE long-form article (900–1500 words) about the primary topic.
It will be rendered two ways: a website blog post (company voice) and a
LinkedIn article (first-person voice). Write the body sections in a
voice-neutral, operator-facing register that works for both; supply a
separate first-person opener for the LinkedIn version.

PRIMARY TOPIC (do not deviate from this fact set):
- Headline: ${topic.headline}
- Detail: ${topic.detail}
- Audience angle: ${topic.audience_angle}
- Status: ${topic.status}
- ${statusRule}

SUPPORTING MATERIAL (all SHIPPED — you MAY reference these to add depth and
context; do NOT invent anything beyond them, and keep the article anchored
to the PRIMARY TOPIC above):
${supporting || '(none)'}

RECENTLY COVERED TOPICS (do not rehash these angles):
${recentHeadlines}

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly:

{
  "title": "specific, compelling headline, <= 70 characters, not clickbait",
  "dek": "1–2 sentence standfirst for the blog, company voice (third person / brand voice)",
  "linkedin_hook": "1–3 sentence first-person opener for the LinkedIn version, no hashtags",
  "meta_description": "<= 155 characters, plain-language SEO summary that names the concrete value",
  "slug": "kebab-case-url-slug derived from the title, <= 60 characters",
  "tags": ["3–6 lowercase topical tags"],
  "sections": [
    { "heading": "H2 heading, plain and descriptive", "body": "2–4 short paragraphs of prose (use \\n\\n between paragraphs)" }
  ],
  "key_takeaways": ["3–5 one-line summary points"],
  "cta": "one short, non-pushy closing call to action"
}

Aim for 4–6 sections. Do not include the title again as the first section.`;
}
