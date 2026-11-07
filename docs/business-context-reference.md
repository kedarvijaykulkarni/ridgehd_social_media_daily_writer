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
channel, not superseded and not past `review_by` (inclusive), and — for
`feature.*` — implemented and verified. That mirrors the export's approval
filter in `fact-registry.md`, not its full tooling: there is no
`brain_revision` provenance until the tool reads a committed export. Every
record is first checked against the approval-relevant subset of the record
rules (ids, statement, the five states, channels, real dates, provenance:
repo/revision, verification date, evidence; supersession links and
cycles); one failing record rejects the whole registry. Full schema
validation — source notes/headings exist, owner, secret patterns — stays
with RidgeHQAPP's `scripts/ai_ops/brain_facts.py check`.
A kept chunk's `detail` becomes the fact's approved `statement`.
As of 2026-11-07 that leaves **one topic: waivers** (`feature.waivers`).
The pricing chunk is extracted but not offered: its headline is no
registry fact, and 0% commission (`commission.direct-bookings`) is a
supporting point, not a headline.

Every product prompt carries a CLAIM RULES block: the approved
statements (never the internal `scope`), a ban on presenting anything
else as available, and the internal writing rules verbatim (limited AI
undo, no AI exclusivity, no AquaRoster, no SMS), plus this tool's
`COPY_RULES` from the 2026-11-07 output review: no legal/compliance
outcomes, nothing "mandatory" or blocking, no check-in/integration/
automation/replacement claims, no invented numbers, results or
first-person operator experience, and 0% commission only as a supporting
detail. Website vertical/platform blurbs are not sent to the model, and
the rotated platform page is not linked or covered in long-form (no
approved feature fact). `PRODUCT_NAME` must match
`brand.public-name`, and `cover` refuses a day whose topic is not approved
today.

This gate decides *topics and instructions*; it cannot make a local model
obey them. After generation a lexical **claim check** flags risky wording
(undo, AI, prices, percentages, QR, SMS, exclusivity, security
architecture, and the `COPY_RULES` categories: legal/compliance,
mandatory/blocking, workflow/integration/replacement, results, operator
persona, numbers) at the top of `social-posts.txt`. It misses paraphrases
and flags harmless uses — human review before posting is still the control.

To put another topic back into rotation, the owner approves a fact for
`social` in the registry, then the chunk id is mapped in `TOPIC_FACTS`.
A missing or invalid registry, or no approved topic, stops the run.

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

**The registry is the authority on what may be marketed** (see the
marketing gate above). `business-context.md` §2 is implementation
evidence only — what is built, not what is approved:

- **`✅` list → built.** These map to `status: "shipped"`, but are offered
  only when a registry fact approves them for social.
- **`❌` list → not built.** Extracted as `status: "planned"`; prompts
  force roadmap framing for such a topic should one ever be approved. None
  is today. The rows the vault says not to market at all are not extracted.
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
