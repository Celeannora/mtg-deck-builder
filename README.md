# MTG Deck Builder

A local-first, offline-capable Magic: The Gathering deck builder built with React, TypeScript, Vite, Dexie (IndexedDB), and Zustand.

## Features

- **Card database** — full Scryfall bulk import (~300k cards) stored in IndexedDB via a Web Worker; no server required
- **Deck builder** — search, filter, add/remove cards with quantity tracking and 4-copy enforcement
- **Mana base analysis** — auto-detects archetype, recommends land count, color sources, and dual lands
- **Curve analysis** — mana curve visualization with archetype-specific curve profiles
- **Legality checker** — validates deck against Standard, Pioneer, Modern, Legacy, Vintage, Commander, Pauper
- **Rotation warnings** — flags cards within 90 days of Standard rotation
- **AI assistant (Phase 6)** — suggestions, synergy scoring, combo detection, budget optimization, role assignment, trend analysis, what's missing analysis
- **Export** — Arena, MTGO, and plain-text formats
- **Collection tracker** — separate IndexedDB table for owned cards
- **PWA** — service worker registered; installable as desktop/mobile app

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Celeannora/mtg-deck-builder.git
cd mtg-deck-builder

# 2. Install
npm install

# 3. Dev server (http://localhost:5173)
npm run dev
```

On first load the app will prompt you to import the Scryfall bulk data (~300 MB download, stored locally). This is a one-time setup.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` (no emit, type errors only) |
| `npm run lint` | ESLint with zero warnings allowed |
| `npm test` | Run all Vitest tests (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Coverage report via v8 |
| `npm run test:ui` | Vitest browser UI |

## Deploy to Vercel

### One-time setup

```bash
npx vercel link      # connect repo to Vercel project
npx vercel --prod    # deploy to production
```

### Automatic deploys

Connect the GitHub repo in the [Vercel dashboard](https://vercel.com/dashboard). Every push to `main` triggers a production deploy automatically. The `vercel.json` in the repo handles:
- SPA routing (deep-links don't 404)
- Immutable cache headers for hashed assets
- Security headers (X-Frame-Options, X-Content-Type-Options, XSS-Protection)

## CI

GitHub Actions runs on every push to `main` and `feat/electron-and-bug-fixes`, and on all PRs to `main`:

```
typecheck → lint → test → build
```

See `.github/workflows/ci.yml`.

## Project Structure

```
src/
├── components/     # React components
├── lib/            # Pure logic (no React)
│   ├── __tests__/  # Vitest unit tests
│   ├── archetype.ts
│   ├── db.ts           # Dexie schema
│   ├── manaBase.ts
│   ├── manaBaseStore.ts
│   ├── rotation.ts
│   └── ... (40+ lib files)
├── workers/        # Web Worker for bulk import
└── main.tsx
public/
└── sw.js           # Service worker
```

## Known Limitations

- **Metagame data** is a bundled snapshot, not a live feed. Updates require a new release.
- **node_modules** exists in the remote git history (pre-gitignore commit). It does not affect builds or deploys. Clean it with `git filter-repo --path node_modules --invert-paths` if desired.

## License

MIT
