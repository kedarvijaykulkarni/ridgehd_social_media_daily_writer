# Business context reference

This app writes marketing drafts about a product it can't see. Before the
repo split it fact-checked generated copy against `../../CLAUDE.md` and
`../../DECISIONS.md` in the aquarosters monorepo. Those files are no longer
reachable. This file is the in-repo pointer to what replaced them.

## Where the business context lives now

The **RidgeHQ business Obsidian vault**, outside this repo:

```
BUSINESS_VAULT_PATH   (set in .env)
  default: D:\work\RidgeHQAPP\Brain\RidgeHQAPP
```

The vault is a Karpathy-style LLM wiki: `raw/` holds immutable source
documents, `wiki/` holds the maintained synthesis, and `wiki/CLAUDE.md`
is its schema. This app only ever **reads** it.

## What the loader reads (`src/loadKnowledgeBase.js`)

At runtime, per generate, the loader scrapes three vault pages and emits
topic chunks in the shape the pipeline already expected
(`{ id, category, status, headline, detail, audience_angle, suggested_visual_theme }`):

| Vault page | Section | Becomes |
|---|---|---|
| `wiki/business-context.md` | §2 `✅ Solid and verifiable — sell on this:` bullet list | `status: "shipped"` chunks |
| `wiki/business-context.md` | §2 `❌ Not yet sellable` table | `status: "planned"` chunks — **except** rows whose consequence says "do not market / do not claim" (e.g. money-moving AI undo), which are dropped entirely |
| `wiki/competitors.md` | §5 differentiator table row for the AI copilot ("UNCLAIMED") | one `differentiator` chunk |
| `wiki/pricing.md` | §3 published `Page headline:` + tier table | one `pricing-model` chunk |

`competitors.md` and `pricing.md` are optional — if missing, the loader
just skips their chunks. `wiki/business-context.md` is required; if it's
missing, or its `✅` / `❌` markers have moved and nothing parses, the
loader **throws** rather than running on an empty or wrong topic list.

### Long-form (`generate --long-form`)

The blog post + LinkedIn article use the **same chunk list**. The primary
topic is that day's selected topic; `src/buildArticlePrompt.js` also
passes the other **`shipped`** chunks (never `planned` / `unverified`) as
optional supporting material. Same claim rail — plus long-form gives a
local model far more room to embroider, so fact-check the drafts harder,
not less.

## The claim safety rail (CLAUDE.md rule 4)

`business-context.md` §2 is the authority on what may be stated as
present-tense fact:

- **`✅` list → safe to claim.** These map to `status: "shipped"`; the
  Ollama prompt may write them in the present tense.
- **`❌` list → never present-tense.** Extracted as `status: "planned"`,
  which the Ollama prompt template forces into "coming soon" / roadmap
  framing. The rows the vault says not to market at all are not extracted.
- Everything the model writes still needs a human read before it's
  posted. Pay closest attention to `status: "planned"` drafts — the
  vault's own §2 table can lag the codebase in either direction (a "gap"
  may have shipped; a "✅" may have regressed). Re-verify against current
  QA status, per the staleness warning in `business-context.md` §8.

## Known limitations of this approach

- **It's heuristic markdown scraping, not a parser.** The loader keys off
  the exact heading and marker strings the vault uses today. If a vault
  editor rewrites §2's structure, extraction degrades — caught as a throw,
  not silent.
- **Chunk `id`s derive from headline text.** A substantial reword of a
  bullet changes its `id`, which resets that topic's rotation history in
  `data/post-history.json`. Cosmetic edits (punctuation, `**bold**`) are
  fine.
- **`audience_angle` and `suggested_visual_theme` are synthesized**, not
  taken from the vault — generic-but-safe filler so the Ollama prompt has
  every field it needs.

## Product name

The vault documents the product as **RidgeHQ / RidgeHQAPP**, but also
flags `ridgehq.com` as an unrelated active business (name-collision risk —
`competitors.md` §2, `business-context.md` §1). The app keeps the name
configurable via `PRODUCT_NAME` in `.env`, default `AquaRoster`. Don't
switch it to `RidgeHQ` for public copy until the name is cleared.
