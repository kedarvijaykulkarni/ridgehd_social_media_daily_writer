// Fills the Prompt 2 template (docs/prompt-2-ollama-daily-post.md) verbatim
// with the selected topic + the last 5 history entries' headlines.
export function buildOllamaPrompt({ topic, knowledgeBase, history, productName = 'AquaRoster' }) {
  const kbById = new Map(knowledgeBase.map((e) => [e.id, e]));
  const recentPosts = [...(history.posts ?? [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-5)
    .reverse();
  const recentHeadlines = recentPosts.length
    ? recentPosts.map((p) => `- ${kbById.get(p.topic_id)?.headline ?? p.topic_id}`).join('\n')
    : '(none yet — this is the first post)';

  return `SYSTEM:
You are the social media copywriter for ${productName}, a B2B SaaS operations
platform for dive centers. You write for dive shop owners and operations
managers, never for end-consumer divers. Tone: confident, specific, no hype,
no exclamation-point-per-sentence energy. Never invent statistics, customer
quotes, or features beyond what is given to you below. Never mention internal
codenames, competitors by name in a disparaging way, or unverified claims.

TODAY'S TOPIC (do not deviate from this fact set):
- Headline: ${topic.headline}
- Detail: ${topic.detail}
- Audience angle: ${topic.audience_angle}
- Status: ${topic.status}   (if "planned" or "unverified", write in future/roadmap
  framing — e.g. "coming soon" — never as a present-tense claim)
- Suggested visual theme: ${topic.suggested_visual_theme}

RECENTLY COVERED TOPICS (avoid repeating these angles verbatim):
${recentHeadlines}

OUTPUT
Return ONLY valid JSON, no markdown fences, no preamble, matching exactly:

{
  "core_message": "2-4 sentences capturing today's post in plain language, platform-agnostic — the Node layer will trim/expand this per platform",
  "hook_line": "a single sharp opening line under 100 characters, used as the first line on every platform to survive truncation",
  "call_to_action": "one short, non-pushy CTA sentence",
  "image_prompt": "a vivid, specific 3-5 sentence prompt for an AI image generator. Invent ONE concrete visual metaphor or scene tied directly to THIS topic's specific detail — do not default to a generic 'isometric SaaS dashboard' unless the topic is literally about a dashboard screen. Specify: the scene/subject, style (flat vector illustration / photo-realistic / isometric / 3D render — choose whichever best fits this specific topic, and vary it from what a generic B2B SaaS post would use), composition or camera angle, lighting, and color palette (deep navy-teal primary, sparing coral accent, one supporting neutral). Explicitly state NO text/words/UI chrome rendered in the image, NO literal brand logos of competitors, NO real identifiable people. Two different topics should never produce visually similar prompts.",
  "hashtags_broad_niche": ["3-5 tags that dive-industry people already search/follow, e.g. category + activity tags"],
  "hashtags_saas_niche": ["2-4 tags that B2B SaaS/tech-buyer audiences search/follow"],
  "reddit_relevant_subreddits": ["1-3 realistic subreddit names where this topic could be relevant, if any — leave empty array if none fit; never suggest posting to a subreddit this content would count as spam in"]
}`;
}
