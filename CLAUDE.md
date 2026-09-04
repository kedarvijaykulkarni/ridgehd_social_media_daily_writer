# CLAUDE.md — apps/social-daily

This is a standalone Node.js CLI, unrelated to the AquaRosters FastAPI/
Next.js/Postgres stack it happens to live alongside. **The rules in the
repo-root `CLAUDE.md`** (RLS on every tenant table, money as integer
cents, UUIDv7 IDs, MVP scope, module boundaries) **describe the AquaRoster
product and do not apply here.** This app doesn't touch the database,
the API, or the frontend — it reads a marketing knowledge base and writes
draft social posts to local files.

See `README.md` in this directory for the full pipeline (topic selection →
Ollama prompt → per-platform formatters → `output/YYYY-MM-DD/`). Don't
duplicate that here; this file only covers things the README doesn't.

## What this app is

A CLI that turns one AquaRoster marketing topic into reviewable X,
LinkedIn, Instagram, and Reddit drafts via a local Ollama model.

```bash
npm install
cp .env.example .env
npm run generate:dry-run   # prints drafts, writes nothing
npm run generate           # writes output/YYYY-MM-DD/*, updates history
```

## Rules specific to this app

1. **Never auto-publish.** This tool writes reviewable draft files only.
   Posting to any platform is a separate, human-triggered step. Do not
   add a posting integration without being asked explicitly.
2. **Secrets live in `.env` only** (gitignored). Never print `.env`
   contents to output, commits, or generated drafts.
3. **`output/` is gitignored and transient** — treat it as scratch, not
   source. Don't add files there to git.
4. **Fact-check generated copy against the actual product before it goes
   out.** Ollama drafts marketing claims about AquaRoster (e.g. security
   architecture, feature availability) without access to the real
   codebase. Before treating a draft as ready to publish, verify any
   specific technical claim (a security guarantee, a compliance claim, a
   feature that "exists") against `../../CLAUDE.md` / `../../DECISIONS.md`
   in the aquarosters root — don't let an LLM-generated claim about the
   product go out unverified.
5. **Respect the documented honesty limitations in `README.md`** (target
   character-count bands, hashtag counts, ad-tone detection are all
   best-effort heuristics, not guarantees) — don't silently "fix" a draft
   to look more polished by fabricating content the formatter didn't
   actually produce.
