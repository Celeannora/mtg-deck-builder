# MTG Standard Deck Builder

A fully local, offline-capable Standard deck builder built on React + TypeScript + Dexie (IndexedDB).  
Card data sourced from [Scryfall bulk data](https://scryfall.com/docs/api/bulk-data). Images © Wizards of the Coast.

> **Development status:** Active — see [CHANGELOG.md](./CHANGELOG.md) for full phase-by-phase history.
> **Rule:** Every commit that changes code must also update this file.

---

## Quick Start

```bash
npm install
npm run dev
```

On first load you will be prompted to import card data. Either:
- Choose a local `oracle_cards.json` from [Scryfall Bulk Data](https://scryfall.com/docs/api/bulk-data), or
- Click **"Download from Scryfall"** to fetch the latest dump directly (~150 MB)

The import runs in a Web Worker — the UI stays responsive during the ~300k card parse.  
All data is stored in IndexedDB (Dexie). No server required.

---

## Phase Status

> Last updated: 2026-05-13 (commit `d6f4fa1`). Reflects what is **actually committed**.

| Phase | Description | Status | Last commit |
|---|---|---|---|
| 1 | Data Foundation | ✅ Complete | `d6f4fa1` |
| 2 | Format Legality Engine | ⚠️ Partial | undocumented |
| 3 | Mana Base Calculator | ⚠️ Partial | undocumented |
| 4 | Archetype Engine | ⚠️ Partial | undocumented |
| 5 | 3-Panel UI Shell | ⚠️ Partial | undocumented |
| 6 | AI Construction Assistant | ⚠️ Partial | undocumented |
| 7 | Metagame Engine | ⬜ Planned | — |
| 8 | Import / Export | ⬜ Planned | — |
| 9 | Bo3 Competitive Mode | ⬜ Planned | — |
| 10 | Tests + CI | ⬜ Planned | — |
| 11 | Competitive Intelligence | ⬜ Planned | — |
| 12 | Final Integration + PWA | ⬜ Planned | — |

---

## Phase 1 — Data Foundation (✅ Complete)

Full local-first card ingestion pipeline. Parses Scryfall `oracle_cards.json`,
filters to Standard-legal cards, extracts sets, persists to IndexedDB via Dexie,
and surfaces a live status bar. Supports both local file picker and network download.

| File | Purpose |
|---|---|
| `src/lib/types.ts` | All TypeScript interfaces: `ScryfallCard`, `CardRecord`, `SetRecord`, `DatabaseStatus`, `ImportProgress`, `ImportResult`, `ScryfallBulkDataEntry` |
| `src/lib/db.ts` | Dexie v2 schema (`cards`, `cardSets`, `userDecks`, `deckVersions`, `meta`). `replaceAllCards()`, `getDatabaseStatus()`, `isDatabaseStale()`, `saveDeck()`, `getDeckVersions()` |
| `src/lib/scryfall.ts` | `isStandardEligible()`, `toCardRecord()`, `extractSetsFromCards()` |
| `src/lib/scryfallApi.ts` | `discoverOracleCardsDumpUri()` — discovers latest oracle_cards dump from Scryfall bulk-data index |
| `src/lib/search.ts` | `searchCards()` — full filter/sort/paginate over IndexedDB. `getDistinctKeywords()`, `getStandardSets()` |
| `src/workers/importWorker.ts` | Web Worker. Accepts `File` (local) or `{ url }` (network/XHR). Filter → transform → set extraction → save. Posts `progress/done/error` |
| `src/components/BulkImporter.tsx` | Import UI with mode toggle (local/network), progress bar, result summary |
| `src/components/DatabaseStatusBar.tsx` | Status bar: card count, set count, staleness badge, auto-refresh every 60s |
| `src/hooks/useDBStatus.ts` | Reactive DB status hook — re-fires on Dexie `cards` write |
| `src/components/Header.tsx` | App header: SVG logo, view toggle, Scryfall attribution |
| `src/App.tsx` | Root component. Import/builder routing, mounts all top-level components |

---

## Phases 2–6 — Partially Committed (Undocumented)

The following files exist in the repo but were committed without CHANGELOG entries.
They will be formally documented as each phase is audited and completed.

**Phase 2 — Legality Engine**
- `src/lib/legality.ts`, `src/lib/companion.ts`, `src/lib/rotation.ts`
- `src/components/ValidationPanel.tsx`
- ❌ `legality.test.ts` — listed in original CHANGELOG, never committed

**Phase 3 — Mana Base**
- `src/lib/manaBase.ts`, `src/lib/manaBaseStore.ts`, `src/lib/colorDistribution.ts`
- `src/components/ManaBasePanel.tsx`, `src/components/ManaCurveChart.tsx`

**Phase 4 — Archetype Engine**
- `src/lib/archetype.ts`, `src/lib/roles.ts`, `src/lib/synergy.ts`
- `src/components/ArchetypePanel.tsx`

**Phase 5 — 3-Panel UI Shell**
- `src/components/CardSearchPanel.tsx`, `src/components/CardDetailDrawer.tsx`
- `src/components/DeckPanel.tsx`, `src/components/DeckStatsBar.tsx`
- `src/components/RightPanel.tsx`, `src/store/deckStore.ts`

**Phase 6 — AI Construction Assistant**
- `src/lib/buildWizard.ts`, `src/lib/budgetOptimizer.ts`, `src/lib/comboFinder.ts`
- `src/lib/optimizeEngine.ts`, `src/lib/deckComposition.ts`, `src/lib/powerScore.ts`
- `src/lib/powerSignal.ts`, `src/lib/similarCards.ts`, `src/lib/suggestions.ts`, `src/lib/whatsMissing.ts`
- `src/components/AdvisorPanel.tsx`, `src/components/GamePlanSummary.tsx`, `src/components/SuggestionPanel.tsx`

---

## ⚠️ Open Issues

| Issue | Status |
|---|---|
| `legality.test.ts` documented in CHANGELOG but never committed | ❌ Needs to be written |
| Python implementation (`main.py`, `core/`, `ui/`) exists with no docs or decision | ❌ Needs decision: document, branch, or delete |
| Phases 2–6 files need audit passes and formal CHANGELOG entries | ❌ In queue |

---

## Full File Map

```
mtg-deck-builder/
├── README.md                      ← updated every commit
├── CHANGELOG.md
├── TODO.md
├── .gitignore
├── main.py                        ⚠️ Python entry point (decision pending)
├── requirements.txt               ⚠️ Python deps (decision pending)
├── core/                          ⚠️ Python implementation (decision pending)
├── ui/                            ⚠️ Python UI (decision pending)
└── src/
    ├── App.tsx                    ✅ Ph1
    ├── main.tsx
    ├── index.css
    ├── lib/
    │   ├── types.ts               ✅ Ph1
    │   ├── db.ts                  ✅ Ph1
    │   ├── scryfall.ts            ✅ Ph1
    │   ├── scryfallApi.ts         ✅ Ph1
    │   ├── search.ts              ✅ Ph1
    │   ├── legality.ts            ⚠️ Ph2 (undocumented)
    │   ├── companion.ts           ⚠️ Ph2 (undocumented)
    │   ├── rotation.ts            ⚠️ Ph2 (undocumented)
    │   ├── manaBase.ts            ⚠️ Ph3 (undocumented)
    │   ├── manaBaseStore.ts       ⚠️ Ph3 (undocumented)
    │   ├── colorDistribution.ts   ⚠️ Ph3 (undocumented)
    │   ├── archetype.ts           ⚠️ Ph4 (undocumented)
    │   ├── roles.ts               ⚠️ Ph4 (undocumented)
    │   ├── synergy.ts             ⚠️ Ph4 (undocumented)
    │   ├── buildWizard.ts         ⚠️ Ph6 (undocumented)
    │   ├── budgetOptimizer.ts     ⚠️ Ph6 (undocumented)
    │   ├── comboFinder.ts         ⚠️ Ph6 (undocumented)
    │   ├── optimizeEngine.ts      ⚠️ Ph6 (undocumented)
    │   ├── deckComposition.ts     ⚠️ Ph6 (undocumented)
    │   ├── powerScore.ts          ⚠️ Ph6 (undocumented)
    │   ├── powerSignal.ts         ⚠️ Ph6 (undocumented)
    │   ├── similarCards.ts        ⚠️ Ph6 (undocumented)
    │   ├── suggestions.ts         ⚠️ Ph6 (undocumented)
    │   └── whatsMissing.ts        ⚠️ Ph6 (undocumented)
    ├── workers/
    │   └── importWorker.ts        ✅ Ph1
    ├── store/
    │   └── deckStore.ts           ⚠️ Ph5 (undocumented)
    ├── hooks/
    │   └── useDBStatus.ts         ✅ Ph1
    └── components/
        ├── BulkImporter.tsx       ✅ Ph1
        ├── DatabaseStatusBar.tsx  ✅ Ph1
        ├── Header.tsx             ✅ Ph1
        ├── ValidationPanel.tsx    ⚠️ Ph2 (undocumented)
        ├── CardSearchPanel.tsx    ⚠️ Ph5 (undocumented)
        ├── CardDetailDrawer.tsx   ⚠️ Ph5 (undocumented)
        ├── DeckPanel.tsx          ⚠️ Ph5 (undocumented)
        ├── DeckStatsBar.tsx       ⚠️ Ph5 (undocumented)
        ├── ManaBasePanel.tsx      ⚠️ Ph3 (undocumented)
        ├── ManaCurveChart.tsx     ⚠️ Ph3 (undocumented)
        ├── ArchetypePanel.tsx     ⚠️ Ph4 (undocumented)
        ├── AdvisorPanel.tsx       ⚠️ Ph6 (undocumented)
        ├── GamePlanSummary.tsx    ⚠️ Ph6 (undocumented)
        ├── SuggestionPanel.tsx    ⚠️ Ph6 (undocumented)
        └── RightPanel.tsx         ⚠️ Ph5 (undocumented)
```

---

## Architecture (TypeScript)

```
src/lib/types.ts            — All TypeScript interfaces
src/lib/db.ts               — Dexie schema + CRUD + deck versioning
src/lib/scryfall.ts         — Eligibility filter + card/set transformer
src/lib/scryfallApi.ts      — Scryfall bulk-data API discovery
src/lib/search.ts           — Card filter/sort/paginate engine
src/lib/legality.ts         — Standard rules engine
src/workers/importWorker.ts — Web Worker: file + network import
src/store/deckStore.ts      — Zustand deck state
src/hooks/useDBStatus.ts    — Reactive DB status hook
src/components/
  BulkImporter.tsx          — Import UI (file + network mode)
  DatabaseStatusBar.tsx     — Persistent status bar
  Header.tsx                — App header + nav
  ValidationPanel.tsx       — Legality violations + warnings
  ManaBasePanel.tsx         — Mana base calculator UI
  ManaCurveChart.tsx        — Mana curve histogram
  ArchetypePanel.tsx        — Archetype detection
  CardSearchPanel.tsx       — Card search + filters
  CardDetailDrawer.tsx      — Card detail drawer
  DeckPanel.tsx             — Mainboard + sideboard zones
  DeckStatsBar.tsx          — Deck stats bar
  AdvisorPanel.tsx          — Build advisor
  RightPanel.tsx            — Right stats column
```

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
- **Zustand** (deck state)
- **Vitest** (unit tests)
- **Playwright** (E2E — Phase 10)

---

## Card Data Attribution

Card data provided by [Scryfall](https://scryfall.com) under their
[non-commercial use policy](https://scryfall.com/docs/api/bulk-data).  
Magic: The Gathering card images © Wizards of the Coast.  
This project is not affiliated with or endorsed by Wizards of the Coast.
