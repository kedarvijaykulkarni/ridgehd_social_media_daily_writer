# aquaroster-social-daily

CLI that turns one AquaRoster marketing knowledge-base topic into reviewable
X, LinkedIn, Instagram, and Reddit drafts, using a local Ollama model. Built
per `docs/prompt-3-nodejs-library.md`, using the prompt template from
`docs/prompt-2-ollama-daily-post.md`.

**This tool never auto-publishes anything.** It writes reviewable draft
files to `./output/YYYY-MM-DD/`. Posting is a manual (or separately-scoped)
step.

## How it works

1. `src/selectTopic.js` picks the next topic from `marketing/knowledge-base.json`
   (produced separately by Prompt 1 — read-only to this tool) using a
   coverage-first rule: lowest used_count first, tie-broken by status
   (`shipped` before `planned`/`unverified`), then by least-recently-used,
   then by id. `used_count` is derived from `marketing/post-history.json`
   (this tool's own read/write state), not from the knowledge base's static
   seed value.
2. `src/buildOllamaPrompt.js` fills the Prompt 2 template with that topic +
   the last 5 history entries' headlines.
3. `src/callOllama.js` POSTs it to your local Ollama instance
   (`/api/generate`, `format: "json"`), parsing the response defensively
   (strips markdown fences, extracts the first JSON object, retries once
   with a stricter "JSON only" follow-up on parse failure).
4. `src/platformFormatters/{x,linkedin,instagram,reddit}.js` each turn the
   shared `{ core_message, hook_line, call_to_action, hashtags }` object
   into a platform-ready draft respecting that platform's real character
   limits (`src/platformLimits.js`).
5. `src/index.js` writes `output/YYYY-MM-DD/social-posts.txt` (all 4
   platform drafts — text, hashtags, and char-count/limit status, in one
   reviewable file) + `image-prompt.txt` (Ollama's scene/style prompt, the
   recommended pixel dimensions for each platform, and which AI image tool
   to paste it into — see below), then appends to `post-history.json` so
   tomorrow's run picks a new topic.

## Image prompt: sizes + which AI tool to use

This tool never calls an image-generation API — same "no auto-publish"
boundary as posting (see below). `image-prompt.txt` is a reviewable prompt
+ guidance file for a human to paste into an image tool by hand:

- **The base prompt itself is now pushed to be specific, not generic.**
  `buildOllamaPrompt.js`'s `image_prompt` instruction asks Ollama to invent
  one concrete visual metaphor tied to *that day's specific topic detail*,
  rather than defaulting to the same "isometric SaaS dashboard" scene every
  day — that repetition was why earlier output looked generic.
- **Per-platform sizes** (`src/platformLimits.js`'s `IMAGE_SPECS`, verified
  against 2026 platform image-size guides): X 1600×900 (16:9), LinkedIn
  1200×627 (1.91:1), Instagram 1080×1350 (4:5), Reddit 1200×1200 (1:1).
  Generate at the largest canvas (1600×900) and crop down, or generate each
  ratio natively if your tool supports a per-request aspect ratio.
- **Which AI tool**: `image-prompt.txt` recommends Midjourney (best
  aesthetic quality, `--ar` flag for exact ratios), Adobe Firefly
  (commercially-safe, most reliable at actually omitting text), Stable
  Diffusion/SDXL/Flux (self-hosted like Ollama, exact pixel control, no
  subscription), or DALL-E 3 (fastest/cleanest but fixed sizes — crop
  after). Generate 2-3 variations; none of these tools reliably nail
  "no readable text" on the first try.

## Setup

1. Have Ollama running locally (`ollama serve`, or the desktop app).
2. `cd apps/social-daily && npm install`
3. `cp .env.example .env` and adjust if needed — the defaults point
   `OLLAMA_MODEL` at `gemma4:latest` and the knowledge-base/history paths at
   the repo-root `marketing/` folder Prompt 1 produces.
4. First run ever: `marketing/post-history.json` won't exist yet — the tool
   creates it in memory (`{ posts: [], cycle_number: 1 }`) and writes it out
   after the first non-dry-run generate.

## Usage

```bash
npm run generate:dry-run   # prints all 4 drafts + image prompt, writes nothing
npm run generate           # writes output/YYYY-MM-DD/*.json and updates history
```

On Windows, double-click or run `generate-and-show.bat` from this folder to
generate today's drafts and print `image-prompt.txt` and `social-posts.txt`
in the same console.

Run `--dry-run` for at least a week and read every output before wiring up
any real posting — this catches prompt-drift or formatter bugs while the
cost of a mistake is zero.

## Known, honest limitations (not silently glossed over)

- **LinkedIn/Reddit "target" ranges are not enforced, only the hard max
  is.** Formatters never fabricate filler content to pad a short
  `core_message` up to LinkedIn's 1,300-1,900 sweet spot or Reddit's
  800-2,000 body range — that would mean inventing claims Ollama never
  made. `meets_target_band` (LinkedIn) tells you honestly whether today's
  draft happened to land there.
- **Instagram's 15-25 hashtag convention can't always be hit.** The Prompt 2
  template only ever generates ~5-9 hashtags total
  (`hashtags_broad_niche` + `hashtags_saas_niche`). The Instagram formatter
  uses every real tag it's given and never invents extras — refresh the
  candidate hashtag pool in Prompt 2 monthly against an actual trend check
  if you want more to draw from (see Prompt 2's "Important honesty note").
- **Reddit's "must not read like an ad" check is a keyword heuristic, not a
  rewrite.** `formatReddit` cannot actually change tone/register from
  broadcast to first-person conversational — that's an LLM job this build
  doesn't re-invoke per platform. It flags obviously ad-like phrasing
  (`needs_manual_review`, `review_reason`) so a human catches it before
  manually cross-posting, rather than pretending to fix it silently.
- `reddit_relevant_subreddits` is always for manual review — this tool
  never posts to a subreddit on its own.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | |
| `OLLAMA_MODEL` | `gemma4:latest` | Installed locally as of 2026-07-13: `qwen2.5-coder:7b`, `qwen2.5-coder:1.5b`, `qwen3-coder:30b`, `qwen3.5:35b`, `gemma4:latest`. `qwen3.5:35b` is higher quality but much slower; the `*-coder` models aren't a good fit for marketing copy. |
| `KNOWLEDGE_BASE_PATH` | `../../marketing/knowledge-base.json` | Relative paths resolve against this package's own directory. |
| `POST_HISTORY_PATH` | `../../marketing/post-history.json` | Read + write. |
| `OUTPUT_DIR` | `./output` | Gitignored by default — daily drafts are transient/reviewable, not source. |
