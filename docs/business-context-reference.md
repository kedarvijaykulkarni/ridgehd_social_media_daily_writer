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
| `wiki/pricing.md` | §3 `### ✅ Published pricing` subsection only: its (wrapped) `Page headline:` paragraph. The tier table is not read (plan prices are not approved for social); stale tier/unit-economics tables elsewhere are ignored; the chunk headline leads with flat monthly pricing, not 0% commission | one `pricing-model` chunk |

## The marketing gate (`src/claimRules.js`)

Those chunks are what the vault says is *built*. What may be *marketed*
is decided by the owner in `wiki/ai-operations/facts/registry.json`
(DECISIONS.md #165/#166; schema in `wiki/ai-operations/fact-registry.md`).
`loadKnowledgeBase` keeps only chunks that `TOPIC_FACTS` maps to a fact
that is accepted, `audience: public`, marketing `allowed` on the `social`
channel, not superseded and not past `review_by` — the export's own
rules. A kept chunk's `detail` becomes the fact's approved `statement`.
As of 2026-11-07 that leaves two topics: waivers (`feature.waivers`) and
the pricing model (`commission.direct-bookings`). Every product prompt also
carries a CLAIM RULES block: the approved statements with their scope
limits, a ban on presenting anything else as available, and the internal
writing rules verbatim (limited AI undo, no AI exclusivity, no AquaRoster,
no SMS).

To put another topic back into rotation, the owner approves a fact for
`social` in the registry, then the chunk id is mapped in `TOPIC_FACTS`.
A missing registry, or no approved topic, stops the run.

A missing `## 2.` section, `✅ … sell on this` marker or `❌ Not yet sellable`
marker in `business-context.md` throws — the optional competitor/pricing
chunks must not mask a broken primary source.

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

The public brand is **RidgeHQ** (RidgeHQAPP DECISIONS #165, 2026-10-18);
**AquaRoster** is not a public name. The vault also flags `ridgehq.com` as
an unrelated active business (name-collision risk — `competitors.md` §2,
`business-context.md` §1) and trademark clearance is undecided, so copy
never claims a registered trademark. The name stays configurable via
`PRODUCT_NAME` in `.env`, default `RidgeHQ`.
