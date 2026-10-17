# social-media-daily-writer

CLI that turns one marketing topic — pulled from the RidgeHQ business
Obsidian vault at runtime — into reviewable X, LinkedIn, Instagram, and
Reddit drafts, using a local Ollama model. Built per
`docs/prompt-3-nodejs-library.md`, using the prompt template from
`docs/prompt-2-ollama-daily-post.md`.

> **History:** this started life as `apps/social-daily` inside the
> aquarosters monorepo and read a `../../marketing/knowledge-base.json`
> produced by a separate Claude pass (`docs/prompt-1-*.md`). It's now a
> standalone repo
> ([`ridgehd_social_media_daily_writer`](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer))
> and reads the business vault directly instead — see
> `docs/business-context-reference.md`.

**This tool never auto-publishes anything.** It writes reviewable draft
files to `./output/YYYY-MM-DD/`. Posting is a manual (or separately-scoped)
step.

## How it works

1. `src/loadKnowledgeBase.js` reads the RidgeHQ business vault
   (`BUSINESS_VAULT_PATH`) — `wiki/business-context.md`,
   `wiki/competitors.md`, `wiki/pricing.md` — and extracts topic chunks
   with a `status` of `shipped` / `planned` / `unverified`. See
   `docs/business-context-reference.md` for exactly which sections map to
   what, and the claim safety rail.
2. `src/selectTopic.js` picks the next topic using a coverage-first rule:
   lowest used_count first, tie-broken by status (`shipped` before
   `planned`/`unverified`), then least-recently-used, then id. `used_count`
   is derived from `data/post-history.json` (this tool's own read/write
   state), not from the vault.
3. `src/buildOllamaPrompt.js` fills the Prompt 2 template with that topic +
   the last 5 history entries' headlines + `PRODUCT_NAME`.
4. `src/callOllama.js` POSTs it to your local Ollama instance
   (`/api/generate`, `format: "json"`), parsing the response defensively
   (strips markdown fences, extracts the first JSON object, retries once
   with a stricter "JSON only" follow-up on parse failure).
5. `src/platformFormatters/{x,linkedin,instagram,reddit}.js` each turn the
   shared `{ core_message, hook_line, call_to_action, hashtags }` object
   into a platform-ready draft respecting that platform's real character
   limits (`src/platformLimits.js`).
6. `src/index.js` writes `output/YYYY-MM-DD/social-posts.txt` (all 4
   platform drafts — text, hashtags, and char-count/limit status, in one
   reviewable file) + `image-prompt.txt` (Ollama's scene/style prompt, the
   recommended pixel dimensions for each platform, and which AI image tool
   to paste it into — see below) + `video-script.txt` (a 1-minute script —
   see below), then appends to
   `data/post-history.json` so tomorrow's run picks a new topic.
7. **With `--long-form`**, a second Ollama pass on the *same* topic also
   writes `blog-post.md` and `linkedin-article.md` — see below.
8. **With `--producthunt`**, a third Ollama pass writes `producthunt-post.txt`
   for the RidgeHQ Product Hunt forum — see below. This one can also write
   nothing: it enforces a posting cooldown first.

## Long-form: blog post + LinkedIn article

`npm run generate:long` (or `generate --long-form`) does everything the
normal run does **plus** one extra Ollama call — `src/buildArticlePrompt.js`
→ `src/callOllama.js`'s `callOllamaArticle` → a single article object,
rendered two ways:

| File | Voice | Extras |
|---|---|---|
| `blog-post.md` | company / brand voice, opens with the `dek` | YAML frontmatter for the site CMS: `description` (SEO meta ≤155 chars), `slug`, `canonical_url` = `BLOG_BASE_URL/<slug>` (default `https://www.ridgehq.app/blog/<slug>`), `tags`, `keywords`, `date`, `pillar` (`Business Economics` / `Operations` / `Technology` — model's pick, else derived from the topic category), `draft: true`, and a `video:` block (`title` = topic headline, `description` = hook line + core message; `youtubeId` / `uploadDate` / `durationSeconds` left blank to fill after the YouTube upload — the website build rejects the post until they're filled or the block is removed) |
| `linkedin-article.md` | opens with a first-person `linkedin_hook` | no frontmatter (LinkedIn's editor is rich text) |

Both share the same `## section` bodies, key-takeaways list, and CTA. Both
carry a review banner (HTML comment) with an approximate word count and the
CLAUDE.md rule 4 fact-check reminder; if the source topic isn't `shipped`,
the banner adds a roadmap-framing warning.

**Honesty limitations (same posture as the Reddit formatter):**

- The section bodies are voice-neutral. The LinkedIn renderer does **not**
  rewrite them into first person — it flags that for you.
- Long-form gives a local model much more room to embroider. Fact-check
  every specific claim (acronyms, "we built X", security guarantees)
  against `wiki/business-context.md` §2 before publishing — the model
  will invent plausible detail the vault doesn't support.
- Only `shipped` chunks are ever passed as supporting material; the
  primary topic is the same one that day's 4 social posts use.

## Product Hunt forum post

`npm run generate:ph` (or `generate --producthunt`, combinable with
`--long-form`) writes `producthunt-post.txt` for RidgeHQ's own forum at
<https://www.producthunt.com/p/ridgehq-app> — `src/buildProductHuntPrompt.js`
→ `callOllamaProductHunt` → `src/lib/renderProductHuntPost.js`.

This is the one draft type that can produce **nothing**, by design: Product
Hunt's own community rules flag or lock accounts that post too often, ask
for upvotes, drop bare links, or copy-paste the same engagement text
everywhere (see `src/productHunt.js` for the research this is based on).
So before generating anything, `src/productHunt.js`'s `productHuntCooldown`
checks the most recent post in `data/post-history.json` that carried a
`producthunt_format_id` against `PRODUCTHUNT_COOLDOWN_DAYS` (`.env`, default
`2` days — roughly a 3x/week ceiling). Still inside the cooldown → it logs
why and skips, without affecting the rest of that day's run.

When it does generate, the format rotates least-recently-used across four
styles (same rotation rule as the website-focus vertical/platform pages in
`src/seoFocus.js`): **behind-the-scenes / build-in-public**, **industry
playbook**, **changelog / update**, and **weekly feedback ask**. The prompt
itself bans hard-selling, bare links, upvote requests, and generic
"great product!" filler — it's written as a maker sharing something with
peers, not an ad. Same claim-safety rule as everywhere else: non-`shipped`
topics stay in roadmap framing.

The output file is a draft only — same "no auto-publish" rule as every
other file this tool writes. It includes a reminder banner to verify claims
against the vault and to add any link yourself with real context, since the
prompt is told never to include one.

## Video script: 1-minute, six 10-second blocks

`video-script.txt` comes from one more Ollama pass
(`src/buildVideoScriptPrompt.js` → `callOllamaVideoScript`), fed only from
the day's short-form object: the topic headline is the subject, the
`image_prompt` is the visual direction, and the hook line, core message and
CTA are the information. It returns a Visual + Audio line for each block
(Hook → Problem → Main action → Demo → Payoff → CTA); the CTA shows and
names `ridgehq.app` and `CONTACT_EMAIL` (`src/seoFocus.js`). The file opens
with the YouTube title (topic headline) and description (hook line + core
message) — the same values `blog-post.md`'s `video:` frontmatter carries,
so upload with exactly those. Like the image prompt, it's a draft for a
human to produce and upload by hand; non-shipped topics carry a roadmap
warning.

## Image prompt: sizes + which AI tool to use

This tool never calls an image-generation API — same "no auto-publish"
boundary as posting (see below). `image-prompt.txt` is a reviewable prompt
+ guidance file for a human to paste into an image tool by hand:

- **The base prompt itself is pushed to be specific, not generic.**
  `buildOllamaPrompt.js`'s `image_prompt` instruction asks Ollama to invent
  one concrete visual metaphor tied to *that day's specific topic detail*,
  rather than defaulting to the same "isometric SaaS dashboard" scene every
  day.
- **Per-platform sizes** (`src/platformLimits.js`'s `IMAGE_SPECS`): X
  1600×900 (16:9), LinkedIn 1200×627 (1.91:1), Instagram 1080×1350 (4:5),
  Reddit 1200×1200 (1:1). Generate at the largest canvas (1600×900) and
  crop down, or generate each ratio natively if your tool supports a
  per-request aspect ratio.
- **Which AI tool**: `image-prompt.txt` recommends Midjourney, Adobe
  Firefly, Stable Diffusion/SDXL/Flux, or DALL-E 3. Generate 2-3
  variations; none of these tools reliably nail "no readable text" on the
  first try.

## Setup

1. Have Ollama running locally (`ollama serve`, or the desktop app).
2. Have a local checkout of the RidgeHQ business vault (the directory that
   contains `wiki/`).
3. `npm install`
4. `cp .env.example .env` and set at least `BUSINESS_VAULT_PATH` to your
   vault path. `OLLAMA_MODEL` defaults to `gemma4:latest`; `PRODUCT_NAME`
   defaults to `AquaRoster` (see note below).
5. First run ever: `data/post-history.json` won't exist yet — the tool
   creates it in memory (`{ posts: [], cycle_number: 1 }`) and writes it
   out after the first non-dry-run generate.

### Product name

`PRODUCT_NAME` is templated into every Ollama prompt and every generated
draft. The business vault documents the product as **RidgeHQ / RidgeHQAPP**,
but also flags `ridgehq.com` as an unrelated active business — so the
default stays `AquaRoster`. Don't change it for public copy until the
RidgeHQ name is cleared. See `CLAUDE.md` and
`docs/business-context-reference.md`.

## Usage

```bash
npm run generate:dry-run        # prints all 4 drafts + image prompt, writes nothing
npm run generate                # writes output/YYYY-MM-DD/* and updates history
npm run generate:long           # + blog-post.md and linkedin-article.md
npm run generate:long:dry-run   # long-form, prints everything, writes nothing
npm run generate:ph             # + producthunt-post.txt (if not in cooldown)
npm run generate:ph:dry-run     # producthunt, prints everything, writes nothing
npm run generate:long:ph        # long-form + producthunt together
npm run generate:long:ph:dry-run # long-form + producthunt, prints everything, writes nothing
npm test                        # unit tests
```

There is no `npm run generate:long --producthunt` shortcut — npm does not
forward a bare flag to the underlying script; it logs `Unknown cli config`
and silently drops it. Either use one of the dedicated scripts above, or
pass the flag through npm's own `--` separator:

```bash
npm run generate:long -- --producthunt
```

On Windows, double-click or run `generate-and-show.bat` from this folder to
generate today's drafts (long-form included) and print `image-prompt.txt`,
`video-script.txt`, `social-posts.txt`, `blog-post.md` and `linkedin-article.md` in the same
console.

Run `--dry-run` for at least a week and read every output before wiring up
any real posting — this catches prompt-drift or formatter bugs while the
cost of a mistake is zero.

## Known, honest limitations (not silently glossed over)

- **Vault extraction is heuristic markdown scraping**, keyed to the vault's
  current §2 `✅` / `❌` markers and §5 / §3 table shapes. If a vault edit
  restructures those, the loader throws rather than emitting a wrong list.
  See `docs/business-context-reference.md`.
- **`status: "planned"` drafts need the closest human review.** The vault's
  own §2 table can lag the codebase in either direction. Re-verify against
  current QA status before publishing anything roadmap-flavoured.
- **LinkedIn/Reddit "target" ranges are not enforced, only the hard max
  is.** Formatters never fabricate filler content to pad a short
  `core_message` up to LinkedIn's 1,300-1,900 sweet spot or Reddit's
  800-2,000 body range. `meets_target_band` (LinkedIn) tells you honestly
  whether today's draft happened to land there.
- **Instagram's 15-25 hashtag convention can't always be hit.** The Prompt 2
  template only ever generates ~5-9 hashtags total. The Instagram formatter
  uses every real tag it's given and never invents extras.
- **Reddit's "must not read like an ad" check is a keyword heuristic, not a
  rewrite.** `formatReddit` flags obviously ad-like phrasing
  (`needs_manual_review`, `review_reason`) so a human catches it before
  manually cross-posting, rather than pretending to fix it silently.
- `reddit_relevant_subreddits` is always for manual review — this tool
  never posts to a subreddit on its own.

## Environment variables

| Var | Default | Notes |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | |
| `OLLAMA_MODEL` | `gemma4:latest` | `qwen3.5:35b` is higher quality but much slower; the `*-coder` models aren't a good fit for marketing copy. |
| `BUSINESS_VAULT_PATH` | `D:\work\RidgeHQAPP\Brain\RidgeHQAPP` | Absolute path to your local RidgeHQ business vault (the dir containing `wiki/`). Read-only. |
| `PRODUCT_NAME` | `AquaRoster` | Templated into prompts and drafts. Keep as-is for public copy until the RidgeHQ name is cleared. |
| `BLOG_BASE_URL` | `https://www.ridgehq.app/blog` | Long-form only — builds `canonical_url` (`<base>/<slug>`) in `blog-post.md` frontmatter. |
| `POST_HISTORY_PATH` | `./data/post-history.json` | Read + write. `data/` is gitignored. |
| `OUTPUT_DIR` | `./output` | Gitignored — daily drafts are transient/reviewable, not source. |
