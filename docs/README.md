# Math Archer Documentation

Welcome to the documentation for **Math Archer**, an adaptive math game for children.

## Repository Layout

```text
Math Archer/
├── apps/
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
# Start web app
pnpm dev

# Run unit tests across all packages
pnpm test

# Run build across all packages
pnpm build

# Lint code
pnpm lint
```

## Architecture & Roadmap

- **[math-archer-plan.md](../math-archer-plan.md)**: Comprehensive game specifications, curriculum levels, and multi-phase roadmap.
- **[MVP Boundary & Scope](mvp-boundary.md)**: Frozen MVP definition, in-scope requirements, and explicitly deferred features.
