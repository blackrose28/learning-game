# AGENTS.md

Work style: telegraph; noun-phrases ok; drop grammar.

## First moves — every task, before the first repo file read

**Use ripwire CLI first. These steps are required, not optional navigation tips.**

1. Task from a plan/spec doc (`math-archer-plan.md`, `SYNC_CHECKLIST.md`, `docs/*.md`):
   `ripwire . --recall="<slice/topic>"`; never read the whole plan.
2. Orient: `ripwire . --pack-task="<task>"` (or `--for="<question>"`);
   open only what it ranks.
3. Read a function: `ripwire . --expand=SYM --top-k=0`, not a whole-file dump.
   Exact literals/regex: `ripwire . --grep='<pattern>'`.
4. Before editing a symbol: `ripwire . --impact=SYM`; report blast radius as a floor.
   Before writing a new one: `ripwire . --exemplar="<purpose>"`; reuse the house pattern.
5. Before done: `ripwire . --situ` + `ripwire . --quality-delta`.

Bounded direct reads allowed for exact edit bytes after locating the region.
If ripwire is unavailable, say so and use focused, bounded reads/searches.

## Project map

Math Archer: adaptive math game & Vietnamese reasoning missions for children; offline-first PWA + Cloudflare Worker sync.

- `packages/learning-engine/`: pure TS math question generator, distractors, hints, curriculum, skill mastery, reasoning missions (`missions/`), rewards, world state, session & dashboard logic.
- `apps/web/`: React 19 + Vite PWA; Adventure/Training/Challenge screens, parent dashboard, audio/input, offline sync queues (`src/sync/`), API client (`src/api/`), auth/session recovery (`src/context/`).
- `apps/api/`: Cloudflare Worker + D1 SQLite (`migrations/`); parent/child PIN auth, attempt/mission sync, profile & skill/speed/reasoning settings.
- `docs/`: architecture, MVP boundary, reasoning mission specs (`reasoning-missions-*.md`). Root `math-archer-plan.md` & `SYNC_CHECKLIST.md`: master roadmap & sync checklists.

Progressive loading: `docs/README.md`, then relevant spec in `docs/`.
Typical homes: curriculum/skills `packages/learning-engine/src/curriculum.ts`; reasoning missions `packages/learning-engine/src/missions/`; Worker routes `apps/api/src/index.ts` + D1 queries `apps/api/src/db.ts`; web root `apps/web/src/App.tsx`; game UI `apps/web/src/components/GameScreen.tsx`; sync queues `apps/web/src/sync/`.

## Rules

- Pragmatism; avoid overengineering. Necessary tests only.
- Strict TypeScript; no untyped code.
- Prettier formatting (`.prettierrc`: single quotes, semicolons, 100-column lines, 2-space indent, ES5 trailing commas).
  - Before ending a turn that touched files, run `pnpm format:check` and fix reported files with `pnpm exec prettier --write <file>`. Do not run `pnpm format` repo-wide inside an unrelated change.
  - `.prettierignore` excludes vendored ripwire skills (`.claude/skills`, `.agents/skills`). Never hand-edit or reformat them; keep byte-identical to upstream.
  - Run `pnpm lint` (ESLint) alongside `pnpm format:check` when finishing.
- Fix root causes. Unsure: focused code reads, then ask with short options.
- Unrecognized changes: assume another agent; preserve them, focus your diff. Stop/ask if conflicting.

## Commands — repo root, pnpm workspaces

```bash
pnpm typecheck
pnpm test                                       # All packages (Vitest)
pnpm --filter @math-archer/learning-engine test # Scoped to learning-engine
pnpm --filter api test                          # Scoped to Worker API
pnpm --filter web test                          # Scoped to web PWA
pnpm lint                                       # ESLint
pnpm format:check                               # Prettier check
pnpm dev                                        # Web app (http://localhost:3010)
pnpm dev:api                                    # Worker API (http://localhost:8787)
pnpm db:migrate                                 # Apply D1 migrations locally
pnpm build                                      # Build all packages
```

Tests live beside source (`*.test.ts[x]`).
Hook tests: `python3 -m unittest discover -s .claude/hooks -p 'test_*.py'`.

## Architecture gotchas

- HTTP routes in `apps/api/src/index.ts` and client calls in `apps/web/src/api/` use string URL paths; call graphs cannot trace across the client/Worker boundary. Search path literals on both sides.
- Offline-first sync: arithmetic attempts and reasoning mission attempts use durable local queues (`apps/web/src/sync/`) with idempotent server ingestion and conflict/session recovery. Keep arithmetic mastery/rewards separate from reasoning mission evidence.
- When changing `@math-archer/learning-engine` exports used by `apps/api` or `apps/web`, build `learning-engine` (`pnpm --filter @math-archer/learning-engine build`) so downstream `dist/` types/imports stay current.
- D1 schema changes require a new numbered SQL file in `apps/api/migrations/` and `pnpm db:migrate` locally.

## Output discipline and ripwire limits

Long plans (`math-archer-plan.md`, `SYNC_CHECKLIST.md`, `docs/reasoning-missions-*.md`): recall relevant sections, not entire files.
Ripwire counts are floors; dynamic/string-keyed dispatch is missed. Overloaded names:
use `--uses=SYM` for call sites; qualify with `path/to/file.ts:SYM` to select a definition.
Large logs/tests/data: filter or summarize output with shell/Python; avoid repeated raw dumps.

`.claude/hooks/route-code-reads.py`: PostToolUse advisory only, based on actual Bash/Read output
over 300 lines or 16 KiB; never blocks or overrides permissions. Agent chooses next read scope.
Disable with `ROUTE_HOOK=off`.
