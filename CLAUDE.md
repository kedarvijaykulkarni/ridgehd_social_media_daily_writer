# CLAUDE.md — social-media-daily-writer

A standalone Node.js CLI. It reads a marketing knowledge base and writes
draft social posts to local files. It does **not** touch a database, an
API, or a frontend.

> **Origin:** this was `apps/social-daily` inside the aquarosters monorepo.
> It was split out into its own repo
> (`github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer`) and
> repointed from a checked-in `../../marketing/knowledge-base.json` to
> reading the RidgeHQ business Obsidian vault directly at runtime. Any
> rule you may remember from an aquarosters-root `CLAUDE.md` (RLS,
> integer cents, UUIDv7, module boundaries) is about *that* product and
> does not apply here.

See `README.md` for the full pipeline and `docs/business-context-reference.md`
for how the vault is consumed. This file covers what those don't.

## What this app is

A CLI that turns one marketing topic into reviewable X, LinkedIn,
Instagram, and Reddit drafts via a local Ollama model.

```bash
npm install
cp .env.example .env          # set BUSINESS_VAULT_PATH at minimum
npm run generate:dry-run      # prints drafts, writes nothing
npm run generate              # writes output/YYYY-MM-DD/*, updates data/post-history.json
npm test                      # loader + hashtags unit tests
```

## Architecture (post-split)

```
BUSINESS_VAULT_PATH (.env)                 external RidgeHQ business Obsidian vault
  └─ wiki/business-context.md  §2 ✅/❌  ─┐
  └─ wiki/competitors.md       §5        ─┼─▶ src/loadKnowledgeBase.js ─▶ topic chunks
  └─ wiki/pricing.md           §3        ─┘        (runtime, read-only)   { id, category,
                                                                            status, headline,
                                                                            detail, ... }
                                                          │
        data/post-history.json  ◀── read+write ──  src/selectTopic.js  (coverage-first pick)
        (gitignored, this tool's own state)                │
                                                          ▼
                            src/buildOllamaPrompt.js  (Prompt 2 template + PRODUCT_NAME)
                                                          │
                            src/callOllama.js  →  local Ollama /api/generate (format: json)
                                                          │
              src/platformFormatters/{x,linkedin,instagram,reddit}.js  (real char limits)
                                                          │
                            src/index.js  →  output/YYYY-MM-DD/{social-posts,image-prompt}.txt

  --long-form only: same topic, 2nd Ollama pass
    src/buildArticlePrompt.js → callOllamaArticle → one article object
      ├─ src/lib/renderBlogPost.js        → output/YYYY-MM-DD/blog-post.md        (frontmatter, company voice, SEO)
      └─ src/lib/renderLinkedInArticle.js → output/YYYY-MM-DD/linkedin-article.md (first-person hook, no frontmatter)
```

- **`src/loadKnowledgeBase.js`** replaced the old
  `readFile('../../marketing/knowledge-base.json')`. It is heuristic
  markdown scraping keyed to the vault's current section markers; it
  throws (never emits an empty/wrong list) if those markers move or the
  vault is missing. Fixtures + tests: `src/__tests__/`.
- **`data/post-history.json`** replaced `../../marketing/post-history.json`.
  It's the only file this tool writes besides `output/`. Lives in
  gitignored `data/` — not in the vault (whose pages are immutable sources
  or LLM-maintained prose).
- **`PRODUCT_NAME`** (`.env`, default `AquaRoster`) is templated into
  `buildOllamaPrompt.js`, `buildArticlePrompt.js`, `renderSocialText.js`,
  `renderImagePrompt.js`, and both long-form renderers.
- **`--long-form`** (`generate` flag; `npm run generate:long`) adds one
  Ollama pass on the same topic → `blog-post.md` + `linkedin-article.md`.
  Same ✅/❌ claim rail as the short-form path (rule 4). `BLOG_BASE_URL`
  (`.env`, default `https://www.ridgehq.app/blog`) only feeds the blog
  post's `canonical_url`. `src/callOllama.js` shares one request/parse/
  retry helper between `callOllama` (short) and `callOllamaArticle` (long).

## Rules specific to this app

1. **Never auto-publish.** This tool writes reviewable draft files only.
   Posting to any platform is a separate, human-triggered step. Do not
   add a posting integration without being asked explicitly.
2. **Secrets and machine-specific paths live in `.env` only** (gitignored).
   Never print `.env` contents to output, commits, or generated drafts.
   `BUSINESS_VAULT_PATH` is an absolute path — keep it in `.env`, not in
   source (the default in `index.js` is a documented fallback, not a
   commitment).
3. **`output/` and `data/` are gitignored and transient** — scratch, not
   source. Don't add files there to git.
4. **Fact-check generated copy against the business vault before it goes
   out.** Ollama drafts marketing claims (security architecture, feature
   availability, pricing) without access to the real product. Before
   treating a draft as ready to publish, verify any specific technical or
   commercial claim against **`wiki/business-context.md` §2** in the vault
   (`BUSINESS_VAULT_PATH`):
   - `✅ Solid and verifiable — sell on this` → safe to state present-tense.
   - `❌ Not yet sellable` → never present-tense; roadmap framing only, and
     some rows (money-moving AI undo) must not be marketed even as roadmap
     — the loader already drops those, keep it that way.
   - Cross-check `wiki/competitors.md` §5 for which differentiators are
     already claimed by competitors (don't lead with "0% commission").
   - The vault's §2 table itself can lag the codebase in **either**
     direction — re-verify `status: "planned"` drafts especially hard, per
     `business-context.md` §8's staleness warning.
5. **Respect the documented honesty limitations in `README.md`** (target
   character-count bands, hashtag counts, ad-tone detection are
   best-effort heuristics; vault extraction is scraping, not parsing;
   the long-form LinkedIn renderer does not rewrite section bodies into
   first person; long-form gives a local model more room to invent
   detail) — don't silently "fix" a draft to look more polished by
   fabricating content the renderer didn't actually produce, and don't
   paper over a loader throw by hand-feeding topics.
6. **Product name.** Keep `PRODUCT_NAME` at `AquaRoster` for public copy.
   The vault documents the product as RidgeHQ / RidgeHQAPP but flags
   `ridgehq.com` as an unrelated active business (name-collision risk).
   Switching the default is a deliberate call to make after name
   clearance, not a cleanup.

## Testing

`npm test` runs `node --test` over `src/**/__tests__/*.test.js`:
- `src/__tests__/loadKnowledgeBase.test.js` — vault parsing against
  `src/__tests__/fixtures/vault/` (a miniature vault mirroring the real
  §2 / §5 / §3 structure).
- `src/__tests__/buildArticlePrompt.test.js` — long-form prompt: primary
  topic centered, only `shipped` chunks as supporting material, roadmap
  framing when not shipped, JSON keys requested.
- `src/__tests__/validateArticleShape.test.js` — article-shape validation
  (exported from `callOllama.js`).
- `src/lib/__tests__/renderBlogPost.test.js`,
  `src/lib/__tests__/renderLinkedInArticle.test.js` — the two long-form
  renderers (frontmatter vs. none, section rendering, roadmap warning).
- `src/lib/__tests__/hashtags.test.js` — hashtag sanitization regression.

The Ollama calls and end-to-end `generate` are not unit-tested (they need
a running model). `npm run generate:dry-run` / `generate:long:dry-run` are
the manual checks.
