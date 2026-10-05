# Math Archer Documentation

Welcome to the documentation for **Math Archer**, an adaptive math game for children.

## Repository Layout

```text
Math Archer/
├── apps/
│   ├── api/                # Cloudflare Worker API + D1 Database
│   └── web/                # Main React + Vite web client (PWA)
├── packages/
│   └── learning-engine/    # Standalone math question generator and skill tracking engine
└── docs/                   # Architecture, specifications, and guides
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Installation

```bash
pnpm install
```

### Development

```bash
# Apply local D1 database migrations (first time or schema change)
pnpm db:migrate

# Start backend Worker API (http://localhost:8787)
pnpm dev:api

# Start web app (http://localhost:3010)
pnpm dev

# Run unit tests across all packages
pnpm test

# Run build across all packages
pnpm build

# Lint code
pnpm lint
```

## Automatic deployment

The [Check and deploy workflow](../.github/workflows/deploy.yml) builds all
packages and runs the tests for pull requests and pushes to `main`. A successful
push to `main` then deploys the tested frontend and API together using Wrangler
to [learn.chuonglv.site](https://learn.chuonglv.site). Local commits do not deploy
until they are pushed. Pull requests run checks without deploying.

Before the first deployment, add these repository secrets in GitHub under
**Settings → Secrets and variables → Actions → New repository secret**:

| Secret                  | Value                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | A Cloudflare API token with Account / Workers Scripts / Edit and Account / D1 / Edit for the game's account, plus Zone / Workers Routes / Edit and Zone / Zone / Read for `chuonglv.site`. |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account ID that owns the `math-archer` Worker and `math-archer-db` database.                                                                                                |

Wrangler uses the existing custom domain and D1 binding in
`apps/api/wrangler.jsonc`. The deployment workflow applies pending database migrations before deploying
code that needs them. Existing Worker secrets remain managed in Cloudflare.

To redeploy `main` without a new commit, open **Actions → Check and deploy → Run
workflow** and select `main`. Check the run's summary for the live URL.

## Game updates

The version button above the game shows the running release (package version and
Git revision, or build timestamp for local builds). Click it to check the deployed release immediately, even inside
the automatic-check interval. It reports whether the game is current, offers
**Reload to update** for a new release, or displays a check/download error.

In production, the game checks for a new release when you return to the browser
tab, regain connectivity, or switch game views. Checks are limited to once every
30 seconds. When the service worker finishes downloading a new release, a
**Reload to update** banner appears. Clicking it activates the new offline cache
and reloads the game; updates never force a reload during play. Saved local
progress is preserved. Offline checks fail silently and retry on the next check.
The banner is disabled in local Vite development.

## Architecture & Roadmap

- **[math-archer-plan.md](../math-archer-plan.md)**: Comprehensive game specifications, curriculum levels, and multi-phase roadmap.
- **[MVP Boundary & Scope](mvp-boundary.md)**: Frozen MVP definition, in-scope requirements, and explicitly deferred features.
- **[Reasoning Missions Plan](reasoning-missions-plan.md)**: Post-MVP plan for Vietnamese problem comprehension, choosing solution steps, and all five story/puzzle families, with phased checklists and completion criteria.
- **[Reasoning Missions Teaching Specification](reasoning-missions-content.md)**: M0 Vietnamese teaching flows, hint ladders, prerequisites, transfer questions, interaction sketches, and a baseline observation sheet.
- **[Reasoning Missions Engine Contracts](reasoning-missions-engine.md)**: Implemented M1 instruction-chain contracts, local evidence/resume behavior, D1/API persistence, and versioned mission evidence.
- **[Reasoning Missions Browser Integration](reasoning-missions-browser.md)**: Completed M1 offline sync, per-child opt-in, progress hydration, and parent conflict recovery; M2 Training is next.

## Parent practice skills

In Parent Dashboard, select a child and use the **Practice skills** switches to
turn any of the seven curriculum skills on or off. Changes save automatically
for that child and apply to Adventure, Training, and Challenge. Disabled skills
are removed from the training focus menu. Existing progress stays available,
and switching a skill back on resumes practice. At least one skill must remain
on. Sample preview does not allow changes. Cloud save failures leave the current
settings unchanged and display an error so you can retry.

Apply `0004_skill_preferences.sql` with `pnpm db:migrate` locally. GitHub Actions
applies it in production before deploying; for manual deployment, run
`pnpm db:migrate:remote` first. Existing
children start with all skills on. Cloud preferences are included in child
profiles, so they also apply when the child logs in on another device.

## Per-child animation speed

In Parent Dashboard, select a child and choose **Fast**, **Normal**, or **Slow**
under **Animation speed**. Changes save automatically to that child’s profile
and sync across devices. All characters use the selected speed for projectile
flight and the pause before the next question. Existing and new children default
to Fast.

| Speed  | Projectile flight | Next question after answer |
| ------ | ----------------- | -------------------------- |
| Fast   | 250 ms            | 750 ms                     |
| Normal | 500 ms            | 1400 ms                    |
| Slow   | 1000 ms           | 2400 ms                    |

Migration `0005_animation_speed.sql` stores the preference; the deployment workflow
applies it before deploying the API and frontend.

## Reasoning practice groundwork

The parent dashboard has an **Instruction chains** opt-in under **Reasoning practice**,
with separate evidence counts and conflict recovery. Existing and new children
start with reasoning off. Preferences save to the child profile and survive
changes to arithmetic skills and animation speed. The playable reasoning Training
screen is the next milestone; enabling the preference prepares that child for it.

Migration `0007_reasoning_settings.sql` follows `0006_mission_attempts.sql`; apply
pending migrations before deploying manually. GitHub Actions applies them before
deploying automatically. Offline mission queues and cloud histories stay separate
from arithmetic mastery, daily arrows, and rewards.
