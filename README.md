# MTG Standard Deck Builder

A fully local, offline-capable Standard deck builder built on React + TypeScript + Dexie (IndexedDB).  
Card data sourced from [Scryfall bulk data](https://scryfall.com/docs/api/bulk-data). Images © Wizards of the Coast.

> **Development status:** Active — see [CHANGELOG.md](./CHANGELOG.md) for full phase-by-phase history.

---

## Quick Start

```bash
npm install
npm run dev
```

On first load, click **"Load Card Database"** and either:
- Choose a local `oracle_cards.json` from Scryfall bulk downloads, or
- Click **"Download from Scryfall"** to fetch the latest dump directly

The import runs in a Web Worker — the UI stays responsive during the ~300k card parse.
All data is stored in IndexedDB (Dexie). No server required.

---

## Architecture

```
src/lib/types.ts          — TypeScript interfaces (ScryfallCard → CardRecord)
src/lib/db.ts             — Dexie schema + deck CRUD + staleness helpers
src/lib/scryfall.ts       — Standard eligibility filter + card transformer
src/lib/scryfallApi.ts    — Scryfall bulk-data API discovery
src/lib/legality.ts       — Full Standard rules engine (6 rules + companion + rotation)
src/workers/importWorker.ts — Web Worker: file/network import with progress
src/components/
  BulkImporter.tsx          — Import UI
  DatabaseStatusBar.tsx     — Status bar (card count, staleness)
  LegalityPanel.tsx         — Violation + warning checklist
```

---

## Phase Status

| Phase | Description | Status |
|---|---|---|
| 1 | Data Foundation (import, DB, set extraction) | ✅ Complete |
| 2 | Format Legality Engine | ✅ Complete |
| 3 | Mana Base Calculator | 🔄 In Progress |
| 4 | Archetype Engine | ⬜ Planned |
| 5 | 3-Panel UI Shell | ⬜ Planned |
| 6 | AI Construction Assistant | ⬜ Planned |
| 7 | Metagame Engine | ⬜ Planned |
| 8 | Import / Export | ⬜ Planned |
| 9 | Bo3 Competitive Mode | ⬜ Planned |
| 10 | Tests + CI | ⬜ Planned |
| 11 | Competitive Intelligence | ⬜ Planned |
| 12 | Final Integration + PWA | ⬜ Planned |

See [CHANGELOG.md](./CHANGELOG.md) for detailed implementation notes on each phase.

---

## Standard Legality Rules Implemented

- Minimum 60 mainboard cards
- Maximum 4 copies per card (by oracle ID; basic lands exempt)
- All cards must be `legal` in Standard (`legalities.standard === "legal"`)
- Banned cards flagged separately
- Sideboard: exactly 0 or 15 cards
- Companion deck-building restrictions (Lurrus, Yorion, Kaheera, Umori)
- Rotation warnings for cards within 90 days of rotating out

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build + dev server)
- **Dexie 3** (IndexedDB ORM)
- **Tailwind CSS v4**
- **Vitest** (unit tests)
- **Playwright** (E2E — Phase 10)

---

## Card Data Attribution

Card data provided by [Scryfall](https://scryfall.com) under their
[non-commercial use policy](https://scryfall.com/docs/api/bulk-data).  
Magic: The Gathering card images © Wizards of the Coast.
This project is not affiliated with or endorsed by Wizards of the Coast.
