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

## Architecture & Roadmap

- **[math-archer-plan.md](../math-archer-plan.md)**: Comprehensive game specifications, curriculum levels, and multi-phase roadmap.
- **[MVP Boundary & Scope](mvp-boundary.md)**: Frozen MVP definition, in-scope requirements, and explicitly deferred features.

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
