# MTG Deck Builder — Project TODO

> Living backlog for the React/TypeScript web app.
> Status: `✅ done` | `🔄 in progress` | `⏳ planned` | `❌ blocked`

---

## Core Infrastructure `✅ done`

| Task | Notes |
|------|-------|
| Vite + React + TypeScript scaffold | |
| Dexie IndexedDB schema (cards, meta, savedDecks, matchResults) | v2 migration in place |
| Scryfall bulk JSON import via Web Worker | Progress events, daemon thread |
| PWA service worker + offline support | |
| Zustand deck store | |
| Vitest test suite (12 files) | legality, mana, companion, consistency, search, rotation, rotationImpact, bo3, hypergeometric, handSimulator, scryfall, manaBase |
| GitHub Actions CI (lint → tsc → vitest --coverage → build) | Coverage comment on PRs via vitest-coverage-report-action |
| ESLint flat config | |

---

## Deck Builder `✅ done`

| Task | Notes |
|------|-------|
| Card search panel (FTS + color/CMC/type/rarity filters) | |
| Deck editor (main + sideboard, 60-card rule, 4-copy rule) | |
| Real-time legality validation + violation banners | |
| Companion restriction checker | |
| Mana curve chart | |
| Color identity + mana base analysis | |
| Consistency / hypergeometric calculator | |
| Archetype tagger | |
| Game plan summary | |
| BO3 sideboard planner | |
| Deck export (.txt) + shareable link | |
| Deck import (paste decklist) | |
| Card detail drawer (image, oracle text, legality) | |
| Rotation tracker + rotation impact panel | |
| Deck history / snapshot panel | |
| Advisor panel | |
| Collection tracker | |
| Multi-deck save / switch (DeckListPanel) | Persisted to IndexedDB |
| Match result tracker + win-rate display | Per-deck W/L/D, stored in IndexedDB |
| Deck Compare view (Mana Curve, Card Types, Overlap) | Deck B enriched from DB |
| Mobile-responsive layout (tab switcher) | |

---

## Upcoming `⏳ planned`

| Priority | Task | Notes |
|----------|------|-------|
| High | Deck B enrichment for cards not in local DB | Currently silently drops cmc/typeLine for unknown cards |
| High | `@vitest/coverage-v8` must be in devDependencies | CI will fail if missing |
| Medium | Match tracker: link win/loss to saved deck record correctly when deck was never saved | Currently skips W/L/D update if deck not in savedDecks table |
| Medium | DeckListPanel: inline rename (click name to edit in-place) | |
| Medium | Price trend sparkline per card | Requires historical price data source |
| Medium | Meta snapshot import (external JSON) | |
| Low | PWA install prompt / "Add to Home Screen" banner | SW exists, no prompt yet |
| Low | Keyboard shortcuts (Ctrl+K search, N new deck, S save) | |
| Low | Accessibility audit (screen reader labels, skip link) | |
| Low | Remove dead Python prototype files (main.py, core/, ui/) | Safe to delete; no longer used |

---

*Last updated: 2026-05-14*
