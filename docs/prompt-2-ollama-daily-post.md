# Prompt 2 — Ollama: Daily Post Generation with Knowledge-Base Coverage Tracking

**What this does:** This is the prompt template your Node.js library (Prompt 3) sends to your local Ollama model each day, along with one selected knowledge-base topic and recent post history. Ollama's only job is to turn that one topic into good, platform-agnostic post content — the coverage/rotation logic itself lives in code (Prompt 3), not in the model, because a small local model can't reliably track "what haven't I covered yet" across sessions.

**Inputs:** `./marketing/knowledge-base.json` (from Prompt 1) + `./marketing/post-history.json` (created/updated automatically)

**Output:** one JSON object per day, consumed by the Node.js formatters in Prompt 3

---

## History file schema — `./marketing/post-history.json`

```json
{
  "posts": [
    {
      "date": "2026-07-13",
      "topic_id": "ai-copilot-reschedule-suggestion",
      "angle_used": "pain-point-solved"
    }
  ],
  "cycle_number": 1
}
```

## Selection rule (implemented in Node — described here so the prompt stays honest about it)

Pick the knowledge-base entry with the lowest `used_count`; among ties, the one least recently used. Once every `status: shipped` entry has `used_count >= cycle_number`, increment `cycle_number` and start the rotation over. This guarantees full knowledge-base coverage before any topic repeats, and prioritizes shipped features over planned/unverified ones.

---

## The Ollama prompt template

Node fills in every `{{ }}` placeholder from the selected topic + last 5 history entries before sending this to Ollama's `/api/generate` (or `/api/chat`) endpoint.

```
SYSTEM:
You are the social media copywriter for AquaRoster, a B2B SaaS operations
platform for dive centers. You write for dive shop owners and operations
managers, never for end-consumer divers. Tone: confident, specific, no hype,
no exclamation-point-per-sentence energy. Never invent statistics, customer
quotes, or features beyond what is given to you below. Never mention internal
codenames, competitors by name in a disparaging way, or unverified claims.

TODAY'S TOPIC (do not deviate from this fact set):
- Headline: {{headline}}
- Detail: {{detail}}
- Audience angle: {{audience_angle}}
- Status: {{status}}   (if "planned" or "unverified", write in future/roadmap
  framing — e.g. "coming soon" — never as a present-tense claim)
- Suggested visual theme: {{suggested_visual_theme}}

RECENTLY COVERED TOPICS (avoid repeating these angles verbatim):
{{last_5_topic_headlines}}

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
}
```

---

## Important honesty note

Don't ask the model to invent which hashtags are "currently trending" — trending tags shift constantly and a local model's training data goes stale the moment it's downloaded. Treat `hashtags_broad_niche` and `hashtags_saas_niche` as a starting *category* pool (dive/watersports + B2B SaaS terms), and refresh that candidate pool yourself monthly using an actual trend check, rather than trusting the model's guess indefinitely.

## Why the selection logic sits in Node, not in this prompt

If you ask a local model "don't repeat what you've already posted," it has to re-derive that from whatever history you paste in — error-prone and non-deterministic across models/versions. Doing the rotation math in plain code makes it auditable: you can always answer "why did it pick this topic today" with a one-line log, not a guess about model behavior.
