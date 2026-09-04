# Prompt 3 — Node.js Library: Turn the Daily Post into 4 Platform-Ready Drafts

**What this does:** A CLI library that calls your local Ollama instance using the Prompt 2 template, then formats the result into X, LinkedIn, Instagram, and Reddit drafts, each respecting that platform's real character limits — and updates the coverage-tracking history file so tomorrow's run picks a new topic.

**Give this prompt to Claude Code** (or a developer) to scaffold the library.

---

## Confirmed 2026 platform limits (verified, not assumed)

| Platform | Hard max | Practical sweet spot | Visible before truncation |
|---|---|---|---|
| X (free tier) | 280 chars | 240–280 | full 280 shown |
| LinkedIn | 3,000 chars | 1,300–1,900 | ~140–210 chars before "see more" |
| Instagram caption | 2,200 chars | 125–300 | ~125 chars before "more" |
| Reddit | title 300 / body 40,000 chars | title <100, body 800–2,000 | title fully visible, body collapses on scroll |

---

## The prompt

```
Build a Node.js (ESM, Node 20+) CLI library called "aquaroster-social-daily"
that automates daily social post generation using a local Ollama instance.

ARCHITECTURE
- ./marketing/knowledge-base.json — input, produced separately (read-only to this tool)
- ./marketing/post-history.json — read + write, tracks coverage (schema below)
- ./src/selectTopic.js — implements the coverage-first selection rule:
    lowest used_count first, tie-broken by least-recently-used date,
    prioritizing status:"shipped" entries over "planned"/"unverified" ones;
    increments a cycle_number once every shipped entry has used_count >= cycle_number
- ./src/buildOllamaPrompt.js — fills the prompt template (provided separately)
  with the selected topic + last 5 topic headlines from history
- ./src/callOllama.js — POSTs to http://localhost:11434/api/generate (or /api/chat),
  model name configurable via .env (OLLAMA_MODEL, default "llama3.1"), parses the
  JSON response defensively (model may occasionally wrap output in markdown
  fences or add stray text — strip fences, extract first valid JSON object,
  retry once on parse failure with a stricter "return ONLY JSON" follow-up)
- ./src/platformFormatters/ — one file per platform: x.js, linkedin.js,
  instagram.js, reddit.js — each takes the shared { core_message, hook_line,
  call_to_action, hashtags } object and returns a platform-ready post object
- ./src/index.js — CLI entry point (use commander or yargs), command:
  `npx aquaroster-social-daily generate` → runs the full pipeline once,
  writes output, updates history
- ./output/YYYY-MM-DD/ — one folder per run containing: x.json, linkedin.json,
  instagram.json, reddit.json, image-prompt.txt

PER-PLATFORM CHAR LIMITS (hardcode these as named constants, not magic numbers,
and expose them from a single ./src/platformLimits.js so they're easy to update
later without touching formatter logic):

  X_MAX = 280            // free-tier hard limit; do not assume Premium
  X_TARGET = 260          // leave headroom for hashtags appended at the end
  LINKEDIN_MAX = 3000     // hard limit
  LINKEDIN_TARGET_MIN = 1300
  LINKEDIN_TARGET_MAX = 1900   // engagement sweet spot, not the hard cap
  INSTAGRAM_MAX = 2200    // hard limit
  INSTAGRAM_TARGET = 300  // most engagement happens well under the max; hook must land in first ~125 chars
  REDDIT_TITLE_MAX = 300
  REDDIT_TITLE_TARGET = 100
  REDDIT_BODY_TARGET_MIN = 800
  REDDIT_BODY_TARGET_MAX = 2000  // well under the 40,000 hard cap by design

FORMATTER BEHAVIOR (each platform file must):
1. Start with `hook_line` verbatim as the first line (all platforms truncate,
   so the hook must survive the cut on every one).
2. Expand or compress `core_message` to hit that platform's TARGET range —
   LinkedIn formatter should keep more context/story; X formatter should
   compress hard and drop anything non-essential; Instagram formatter should
   stay short and let the image carry weight; Reddit formatter should generate
   BOTH a title (<= REDDIT_TITLE_TARGET, informative not clickbait) and a
   longer body using REDDIT_BODY_TARGET range, written in a more
   conversational/first-person register appropriate to Reddit culture, and
   must NOT read like an ad — flag output for manual review if it can't avoid
   sounding promotional, since undisclosed advertising violates most
   subreddits' rules.
3. Append hashtags appropriately per platform convention: X — inline or
   trailing, max 2-3 (more than that reads as spammy on X specifically);
   LinkedIn — 3-5 trailing; Instagram — 15-25 trailing (validate against
   INSTAGRAM_MAX after appending, trim hashtag count if over budget);
   Reddit — no hashtags in body (not a Reddit convention), instead pass
   `reddit_relevant_subreddits` through to the output object for the human
   operator to review before manually cross-posting (never auto-post to
   subreddits without human review — self-promotion rules vary widely and
   auto-posting risks bans).
4. Every formatter must return: { platform, text (or title+body for reddit),
   char_count, limit, within_limit: boolean, hashtags_used, image_prompt }.
   If within_limit is false after all trimming attempts, throw a clear error
   rather than silently publishing an over-limit post.

VALIDATION
- Use a real character-counting util, not `.length` naively — account for
  the fact that these are business decisions, not identical across platforms
  (e.g. do NOT apply X's URL-shortening-to-23-chars rule to other platforms).
- Add a --dry-run flag that prints all 4 formatted posts + image prompt to
  console without writing history, for review before the first real run.

DO NOT auto-publish to any platform. This library's job stops at generating
reviewable draft files. Posting is a manual (or separately-scoped, explicitly
authorized) step — do not wire in X/LinkedIn/Instagram/Reddit API publish
calls as part of this build.

Include a README.md explaining setup (Ollama running locally, .env vars,
first-run behavior when post-history.json doesn't exist yet), and a package.json
with a `generate` script.
```

---

## Why the "no auto-publish" boundary is in the spec itself

Reddit in particular will ban accounts for automated self-promotion, and each subreddit sets its own rules — that's why the formatter passes `reddit_relevant_subreddits` through for manual review instead of posting directly. Keeping a human in the loop for the actual publish step also gives you one last brand-safety check before anything goes live, on top of the audit step already built into Prompt 1.

## Suggested next step after this is built

Run `--dry-run` for at least a week and read every output before wiring up any real posting (manual copy-paste is fine to start). This catches prompt-drift or formatter bugs while the cost of a mistake is zero.
