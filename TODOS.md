# TODOS — social-media-daily-writer work queue

Reviewed execution order for this repository. GitHub issues are authoritative for status; reconcile this file when they differ. Created 2026-10-18 for the RidgeHQ AI operating plan (`RidgeHQAPP/Brain/RidgeHQAPP/wiki/ai-operations-plan.md`); the one-line workflow (`ridgehq-next-issue`) selects from the checklist below.

## Open

- [ ] [#5](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/issues/5) — SOCIAL-01 first slice: root `AGENTS.md` with the generated shared operating rules, `@AGENTS.md` import in `CLAUDE.md`, generated `ridgehq-next-issue` skill, this queue. Implemented; awaiting owner review in [PR #6](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/6) (branch `codex/5-shared-operating-rules`).
- [ ] [#7](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/issues/7) — SOCIAL-02 first slice: default brand `RidgeHQ` (RidgeHQAPP DECISIONS #165) and no invented "no competitor offers this" fallback. Implemented; awaiting owner review in [PR #8](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/8). Not in this slice: drafts-versus-publications, the route/focus manifest (not built yet), and whether the AI-copilot chunk should be offered at all (#166 holds AI claims back).

## Planned, not yet filed (gated)

- SOCIAL-01 remainder: a versioned facts loader replacing prose-marker parsing, plus stable topic/claim IDs and schema tests. Gated on the approved-fact export (BRAIN-02/03 in RidgeHQAPP).
- SOCIAL-02: remove the unsupported "no competitor offers this" differentiator fallback, distinguish drafts from publications, and consume the website route/focus manifest.
- Brand default: decided in RidgeHQAPP DECISIONS #165 (RidgeHQ); applied in #7.

## Shared rules maintenance

The block between the `RIDGEHQ-SHARED-RULES` markers in `AGENTS.md` and the `ridgehq-next-issue` skill are generated from the RidgeHQAPP Brain. Do not hand-edit them; regenerate or check with `<RidgeHQAPP>/apps/api/.venv/Scripts/python <RidgeHQAPP>/scripts/ai_ops/sync_adapters.py --repo . [--check]`.
