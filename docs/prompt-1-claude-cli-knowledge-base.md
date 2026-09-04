# Prompt 1 — Claude CLI: Generate the Marketing Knowledge Base

> ⚠️ **Superseded (repo split).** This app no longer consumes a checked-in
> `./marketing/knowledge-base.json`. Since moving out of the aquarosters
> monorepo it reads the RidgeHQ business Obsidian vault directly at runtime
> via `src/loadKnowledgeBase.js` — see `docs/business-context-reference.md`.
> This prompt is kept for provenance: it documents how the original
> knowledge base was built and what the `status: shipped | planned |
> unverified` safety rail was for (that rail now lives in the vault's
> `wiki/business-context.md` §2 `✅` / `❌` lists).

**What this did:** Run with Claude Code in the root of the product repo. It built a structured, verified knowledge base of features and differentiators by reading strategy docs *and* the actual codebase — so the output reflected what's really shipped, not just what's documented or planned.

**Where to run it:** Repo root, via `claude` CLI, in a session with read access to `apps/api`, `apps/web`, and your docs folder.

**Output produced:** `./marketing/knowledge-base.json` + `./marketing/knowledge-base-audit.md`

---

## The prompt

```
You are building a structured marketing knowledge base for AquaRoster, a B2B SaaS
platform for dive center operations, by reading this repository directly.

GOAL
Produce a single file at ./marketing/knowledge-base.json containing an array of
"topic chunks" — small, self-contained facts or angles that a social media post
could be built around. This file will be consumed by a separate daily post
generator, so it must be structured, deduplicated, and accurate to the current
codebase — not aspirational copy.

STEPS
1. Read existing strategy docs if present: aquaroster-strategy.md,
   aquaroster-business-analysis.md, docs/qa-context.md, CLAUDE.md files,
   AQUAROSTER-TDD.md, and any DESIGN.md. Extract positioning, ICP, and
   competitive-differentiation facts already established there.
2. Scan the actual codebase (apps/api and apps/web) to verify which features
   are real and working today vs. planned: look at route/endpoint definitions,
   the AI copilot tool registry, domain models (scheduling, bookings, staff,
   gear, POS, partners/commissions, accommodation), and test coverage.
3. Cross-check: if a strategy doc claims a feature is "done" but you find no
   corresponding tested code path, tag it as status "planned" not "shipped" —
   marketing must never claim more than the code supports. If unsure, tag
   status "unverified" rather than guessing.
4. For each distinct fact/feature/differentiator, produce one knowledge-base
   entry with this exact schema:

{
  "id": "kebab-case-unique-id",
  "category": "feature | differentiator | pain-point-solved | architecture | icp | pricing-model | competitive | roadmap",
  "status": "shipped | planned | unverified",
  "headline": "one sentence, plain language, no jargon",
  "detail": "2-4 sentences a non-technical dive shop owner would understand",
  "proof_point": "the specific code/doc evidence for this claim, for your own audit trail — not for public posting",
  "audience_angle": "why a dive center owner would care about this specifically",
  "suggested_visual_theme": "a short phrase describing what an image for this topic could show (e.g. 'AI copilot suggesting a reschedule after a storm alert')",
  "used_count": 0
}

5. Deduplicate aggressively — merge near-identical entries rather than listing
   the same feature five ways.
6. Aim for 40-80 entries. Fewer, well-verified entries are better than many
   thin or speculative ones.
7. Never invent a feature, statistic, or customer claim that isn't backed by
   something in the repo or docs. If you can't verify it, mark it "unverified"
   and lower-priority rather than omit-or-fabricate.
8. Write the final array to ./marketing/knowledge-base.json. Also write a short
   ./marketing/knowledge-base-audit.md summarizing what you verified vs. flagged
   as unverified/planned, so I can review before this goes anywhere near a
   public post.

Do not write any social copy yet. This step only produces the knowledge base.
```

---

## Why it's built this way

- **The `status` field is the safety rail.** Your own business context flags real gaps right now (P0 signup bug, AI-copilot undo not functionally complete, promo code billing risk) — this prompt makes sure none of those accidentally get marketed as present-tense fact.
- **`proof_point` is for your eyes only.** It's not meant for public posting — it's so you (or a future Claude session) can audit *why* a claim was tagged "shipped" without re-reading the whole codebase again.
- **40–80 entries** is deliberately capped — enough for months of daily posts without so many that quality drops or duplicates sneak in.

## Before you move to Prompt 2

Read `knowledge-base-audit.md` yourself. This is the one manual checkpoint in the whole pipeline — everything downstream (Ollama, then Node.js) trusts that this file is accurate.
