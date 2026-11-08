# TODOS — social-media-daily-writer work queue

Reviewed execution order for this repository. GitHub issues are authoritative for status; reconcile this file when they differ. Created 2026-10-18 for the RidgeHQ AI operating plan (`RidgeHQAPP/Brain/RidgeHQAPP/wiki/ai-operations-plan.md`); the one-line workflow (`ridgehq-next-issue`) selects from the checklist below.

## Open

- [ ] [PR #12](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/12) — video script visual progression, typed intake rules, natural speech cadence, and Gemini I2V continuity notes. Implemented; awaiting owner review in [PR #12](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/12) (branch `feat/video-script-visual-progression`).

## Completed

- [x] [#5](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/issues/5) — SOCIAL-01 first slice: root `AGENTS.md` with the generated shared operating rules, `@AGENTS.md` import in `CLAUDE.md`, generated `ridgehq-next-issue` skill, this queue. Merged in [PR #6](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/6).
- [x] [#7](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/issues/7) — SOCIAL-02 first slice: default brand `RidgeHQ` (RidgeHQAPP DECISIONS #165) and no invented "no competitor offers this" fallback. Merged in [PR #8](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/8).
- [x] [PR #9](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/9) — feat(video): optional AI presenter character, product mode, and cover prompt. Merged.
- [x] [PR #10](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/10) — deep-review fixes (loader §2/§3, formatters, same-day re-run, local dates, Product Hunt guard). Merged.
- [x] [PR #11](https://github.com/kedarvijaykulkarni/ridgehd_social_media_daily_writer/pull/11) — fix: keep generated copy to approved claims (from reviews of real generate:long output). Merged.

## Planned, not yet filed (gated)

- SOCIAL-01 remainder: a versioned facts loader replacing prose-marker parsing, plus stable topic/claim IDs and schema tests. Partly started in PR #10, which reads `registry.json` directly with the export's filter rules; switch to the generated export (with `brain_revision`) once BRAIN-03 commits one, and widen the two-topic pool only through new registry facts.
- SOCIAL-02: remove the unsupported "no competitor offers this" differentiator fallback, distinguish drafts from publications, and consume the website route/focus manifest.
- Brand default: decided in RidgeHQAPP DECISIONS #165 (RidgeHQ); applied in #7.

## Shared rules maintenance

The block between the `RIDGEHQ-SHARED-RULES` markers in `AGENTS.md` and the `ridgehq-next-issue` skill are generated from the RidgeHQAPP Brain. Do not hand-edit them; regenerate or check with `<RidgeHQAPP>/apps/api/.venv/Scripts/python <RidgeHQAPP>/scripts/ai_ops/sync_adapters.py --repo . [--check]`.
