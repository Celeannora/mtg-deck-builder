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

## Phase Status

> Last audited: 2026-05-13. Status reflects what is **actually committed**, not what is planned.

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Data Foundation (import, DB, set extraction) | ⚠️ Partial | `scryfallApi.ts` and `DatabaseStatusBar.tsx` missing from repo; `LegalityPanel.tsx` renamed to `ValidationPanel.tsx` without changelog entry |
| 2 | Format Legality Engine | ⚠️ Partial | `legality.ts` present; `legality.test.ts` missing; `companion.ts` and `rotation.ts` present but undocumented |
| 3 | Mana Base Calculator | ⚠️ Partial | `manaBase.ts`, `manaBaseStore.ts`, `colorDistribution.ts`, `ManaBasePanel.tsx`, `ManaCurveChart.tsx` all present but undocumented in CHANGELOG |
| 4 | Archetype Engine | ⚠️ Partial | `archetype.ts`, `roles.ts`, `synergy.ts`, `ArchetypePanel.tsx` all present but undocumented |
| 5 | 3-Panel UI Shell | ⚠️ Partial | `CardSearchPanel.tsx`, `CardDetailDrawer.tsx`, `DeckPanel.tsx`, `DeckStatsBar.tsx`, `RightPanel.tsx`, `Header.tsx`, `App.tsx` all present but undocumented |
| 6 | AI Construction Assistant | ⚠️ Partial | `buildWizard.ts`, `budgetOptimizer.ts`, `comboFinder.ts`, `optimizeEngine.ts`, `suggestions.ts`, `AdvisorPanel.tsx` all present but undocumented |
| 7 | Metagame Engine | ⬜ Planned | No files present |
| 8 | Import / Export | ⬜ Planned | No files present |
| 9 | Bo3 Competitive Mode | ⬜ Planned | No files present |
| 10 | Tests + CI | ⬜ Planned | `legality.test.ts` listed in CHANGELOG but missing from repo |
| 11 | Competitive Intelligence | ⬜ Planned | No files present |
| 12 | Final Integration + PWA | ⬜ Planned | No files present |

---

## ⚠️ Audit Findings (2026-05-13)

A full file audit found significant drift between the CHANGELOG/README and the actual repository state.

### Files present but undocumented in CHANGELOG

**`src/lib/`**
- `manaBaseStore.ts`
- `colorDistribution.ts`
- `rotation.ts`
- `companion.ts`
- `archetype.ts`
- `roles.ts`
- `synergy.ts`
- `buildWizard.ts`
- `budgetOptimizer.ts`
- `comboFinder.ts`
- `optimizeEngine.ts`
- `powerScore.ts`
- `powerSignal.ts`
- `similarCards.ts`
- `suggestions.ts`
- `whatsMissing.ts`
- `deckComposition.ts`
- `search.ts`

**`src/components/`**
- `ValidationPanel.tsx` (replaces documented `LegalityPanel.tsx`)
- `CardSearchPanel.tsx`
- `CardDetailDrawer.tsx`
- `DeckPanel.tsx`
- `DeckStatsBar.tsx`
- `ManaBasePanel.tsx`
- `ManaCurveChart.tsx`
- `ArchetypePanel.tsx`
- `AdvisorPanel.tsx`
- `GamePlanSummary.tsx`
- `SuggestionPanel.tsx`
- `RightPanel.tsx`
- `Header.tsx`

**`src/store/`**
- `deckStore.ts`

**`src/hooks/`**
- `useDBStatus.ts`

### Files documented in CHANGELOG but missing from repo
- `src/lib/scryfallApi.ts`
- `src/lib/legality.test.ts`
- `src/components/DatabaseStatusBar.tsx`

### Undocumented parallel Python implementation
A second implementation exists at the root level that is not mentioned anywhere in the README or CHANGELOG:
- `main.py`
- `requirements.txt`
- `core/__init__.py`, `core/database.py`, `core/importer.py`, `core/models.py`, `core/parser.py`
- `ui/__init__.py`, `ui/phase1_import.py`

**These Python files need a decision: document them, move them to a separate branch, or remove them.**

---

## Full File Map (audited)

```
mtg-deck-builder/
├── README.md
├── CHANGELOG.md
├── TODO.md
├── .gitignore
│
├── main.py                        ← Python entry point (undocumented)
├── requirements.txt               ← Python deps (undocumented)
│
├── core/                          ← Python implementation (undocumented)
│   ├── __init__.py
│   ├── database.py
│   ├── importer.py
│   ├── models.py
│   └── parser.py
│
├── ui/                            ← Python UI (undocumented)
│   ├── __init__.py
│   └── phase1_import.py
│
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    │
    ├── lib/
    │   ├── types.ts               ✅ Phase 1 documented
    │   ├── db.ts                  ✅ Phase 1 documented
    │   ├── scryfall.ts            ✅ Phase 1 documented
    │   ├── scryfallApi.ts         ❌ Phase 1 documented — FILE MISSING
    │   ├── legality.ts            ✅ Phase 2 documented
    │   ├── legality.test.ts       ❌ Phase 2 documented — FILE MISSING
    │   ├── search.ts              ⚠️ Present, undocumented
    │   ├── rotation.ts            ⚠️ Present, undocumented
    │   ├── companion.ts           ⚠️ Present, undocumented
    │   ├── manaBase.ts            ⚠️ Present, undocumented (Phase 3)
    │   ├── manaBaseStore.ts       ⚠️ Present, undocumented
    │   ├── colorDistribution.ts   ⚠️ Present, undocumented
    │   ├── archetype.ts           ⚠️ Present, undocumented (Phase 4)
    │   ├── roles.ts               ⚠️ Present, undocumented
    │   ├── synergy.ts             ⚠️ Present, undocumented
    │   ├── buildWizard.ts         ⚠️ Present, undocumented (Phase 6)
    │   ├── budgetOptimizer.ts     ⚠️ Present, undocumented
    │   ├── comboFinder.ts         ⚠️ Present, undocumented
    │   ├── optimizeEngine.ts      ⚠️ Present, undocumented
    │   ├── deckComposition.ts     ⚠️ Present, undocumented
    │   ├── powerScore.ts          ⚠️ Present, undocumented
    │   ├── powerSignal.ts         ⚠️ Present, undocumented
    │   ├── similarCards.ts        ⚠️ Present, undocumented
    │   ├── suggestions.ts         ⚠️ Present, undocumented
    │   └── whatsMissing.ts        ⚠️ Present, undocumented
    │
    ├── workers/
    │   └── importWorker.ts        ✅ Phase 1 documented
    │
    ├── store/
    │   └── deckStore.ts           ⚠️ Present, undocumented
    │
    ├── hooks/
    │   └── useDBStatus.ts         ⚠️ Present, undocumented
    │
    └── components/
        ├── BulkImporter.tsx       ✅ Phase 1 documented
        ├── DatabaseStatusBar.tsx  ❌ Phase 1 documented — FILE MISSING
        ├── ValidationPanel.tsx    ⚠️ Present; replaces documented LegalityPanel.tsx
        ├── CardSearchPanel.tsx    ⚠️ Present, undocumented (Phase 5)
        ├── CardDetailDrawer.tsx   ⚠️ Present, undocumented
        ├── DeckPanel.tsx          ⚠️ Present, undocumented
        ├── DeckStatsBar.tsx       ⚠️ Present, undocumented
        ├── ManaBasePanel.tsx      ⚠️ Present, undocumented (Phase 3)
        ├── ManaCurveChart.tsx     ⚠️ Present, undocumented
        ├── ArchetypePanel.tsx     ⚠️ Present, undocumented (Phase 4)
        ├── AdvisorPanel.tsx       ⚠️ Present, undocumented
        ├── GamePlanSummary.tsx    ⚠️ Present, undocumented
        ├── SuggestionPanel.tsx    ⚠️ Present, undocumented
        ├── RightPanel.tsx         ⚠️ Present, undocumented
        └── Header.tsx             ⚠️ Present, undocumented
```

---

## Architecture (TypeScript)

```
src/lib/types.ts          — TypeScript interfaces (ScryfallCard → CardRecord)
src/lib/db.ts             — Dexie schema + deck CRUD + staleness helpers
src/lib/scryfall.ts       — Standard eligibility filter + card transformer
src/lib/legality.ts       — Full Standard rules engine (6 rules + companion + rotation)
src/workers/importWorker.ts — Web Worker: file/network import with progress
src/store/deckStore.ts    — Zustand deck state
src/components/
  BulkImporter.tsx        — Import UI
  ValidationPanel.tsx     — Legality violation + warning checklist
  ManaBasePanel.tsx       — Mana base calculator UI
  ManaCurveChart.tsx      — Mana curve histogram
  ArchetypePanel.tsx      — Archetype detection display
  CardSearchPanel.tsx     — Card search + filter panel
  CardDetailDrawer.tsx    — Card detail modal/drawer
  DeckPanel.tsx           — Mainboard + sideboard zones
  AdvisorPanel.tsx        — Build advisor
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
