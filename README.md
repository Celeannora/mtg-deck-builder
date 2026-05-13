# MTG Standard Deck Builder

A fully local, offline-capable Standard deck builder built on React + TypeScript + Dexie (IndexedDB).  
Card data sourced from [Scryfall bulk data](https://scryfall.com/docs/api/bulk-data). Images © Wizards of the Coast.

> **Development status:** Active  
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

> Last updated: 2026-05-13. Reflects what is **actually committed and verified**.

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Data Foundation | ✅ Complete | Import, search, DB, status bar |
| 2 | Format Legality Engine | ✅ Complete | legality, companion, rotation, deckStore, ValidationPanel, legality.test.ts |
| 3 | Mana Base Calculator | ✅ Complete | manaBase, manaBaseStore, ManaBasePanel, ManaCurveChart |
| 4 | Archetype Engine | ✅ Complete | archetype, roles, deckComposition, ArchetypePanel |
| 5 | 3-Panel UI Shell | ✅ Complete | CardSearchPanel, DeckPanel, DeckStatsBar, RightPanel, CardDetailDrawer |
| 6 | AI Construction Assistant | ⚠️ Partial | Files committed, unaudited |
| 7 | Metagame Engine | ⬜ Planned | — |
| 8 | Import / Export | ⬜ Planned | — |
| 9 | Bo3 Competitive Mode | ⬜ Planned | — |
| 10 | Tests + CI | ⚠️ Partial | legality.test.ts ✅, remainder pending |
| 11 | Competitive Intelligence | ⬜ Planned | — |
| 12 | Final Integration + PWA | ⬜ Planned | — |

---

## Bug Fixes (this commit)

| File | Bug | Fix |
|---|---|---|
| `DeckPanel.tsx` | `validation.issues` / `DeckCard` don't exist | Use `validation.violations` + `DeckEntry` |
| `DeckStatsBar.tsx` | Read dead props from deckStore | Rewritten to read `entries` + `useManaBaseStore` |
| `ArchetypePanel.tsx` | Import `analyzeDeckComposition` from wrong module | Import from `deckComposition` only |
| `ManaCurveChart.tsx` | Required props crash when called bare from RightPanel | Props now optional; falls back to stores |
| `CardSearchPanel.tsx` | `addCard(card)` missing board arg | Fixed to `addCard(card, "main")` |
| `deckComposition.ts` | `trafficLight` `||` → `&&` (every value passed yellow) | Fixed |

---

## Phase 1 — Data Foundation (✅ Complete)

| File | Purpose |
|---|---|
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/lib/db.ts` | Dexie v3 schema + CRUD + deck versioning |
| `src/lib/scryfall.ts` | Eligibility filter + card/set transformer |
| `src/lib/scryfallApi.ts` | Bulk-data API discovery |
| `src/lib/search.ts` | Card filter/sort/paginate engine |
| `src/workers/importWorker.ts` | Web Worker: file + network import |
| `src/components/BulkImporter.tsx` | Import UI (file + network mode) |
| `src/components/DatabaseStatusBar.tsx` | Persistent status bar |
| `src/components/Header.tsx` | App header + nav |
| `src/hooks/useDBStatus.ts` | Reactive DB status hook |
| `src/App.tsx` | Root component |

---

## Phase 2 — Format Legality Engine (✅ Complete)

| File | Purpose |
|---|---|
| `src/lib/legality.ts` | Standard rules: MIN_60, COPY_LIMIT, sideboard, banned, not_legal |
| `src/lib/companion.ts` | All 8 companion deck-building restrictions |
| `src/lib/rotation.ts` | Rotation warning computation (requires set release date feed) |
| `src/store/deckStore.ts` | Zustand deck state — add/remove/move/validate on every mutation |
| `src/components/ValidationPanel.tsx` | Legality UI: rule checklist, copy violations, companion check, color bar |
| `src/tests/legality.test.ts` | 20 unit tests covering all rules + 5 companions |

---

## Phase 3 — Mana Base Calculator (✅ Complete)

| File | Purpose |
|---|---|
| `src/lib/manaBase.ts` | Pip parser, land count algo, color source recommendation, dual land tiering, curve builder, hypergeometric castability |
| `src/lib/manaBaseStore.ts` | Zustand async compute store; queries DB for dual land suggestions |
| `src/components/ManaBasePanel.tsx` | Land count, color sources, dual suggestions, castability warnings |
| `src/components/ManaCurveChart.tsx` | Stacked SVG histogram with archetype ideal overlay. Props optional — reads from stores when bare |

---

## Phase 4 — Archetype Engine (✅ Complete)

| File | Purpose |
|---|---|
| `src/lib/roles.ts` | Text/keyword → CardRole classifier (17 roles) |
| `src/lib/archetype.ts` | Role composition + signal-based archetype detection (10 archetypes) |
| `src/lib/deckComposition.ts` | TrafficLight composition checker vs archetype benchmarks + weak-spot advisor |
| `src/components/ArchetypePanel.tsx` | Archetype header, signals, role composition grid, weak spots |

---

## Phase 5 — 3-Panel UI Shell (✅ Complete)

| File | Purpose |
|---|---|
| `src/components/CardSearchPanel.tsx` | Search + filters (color, rarity, CMC, sort) with synergy stars |
| `src/components/DeckPanel.tsx` | Mainboard/sideboard list, inline violations, export .txt |
| `src/components/DeckStatsBar.tsx` | Compact bar: card count, legality, archetype, avg MV, color pips, violation badge |
| `src/components/RightPanel.tsx` | 5-tab panel: Curve / Mana / Archetype / Validate / Game Plan |
| `src/components/CardDetailDrawer.tsx` | Card detail overlay |
| `src/components/GamePlanSummary.tsx` | Natural-language game plan + stat chips |
| `src/store/deckStore.ts` | Zustand: add/remove/move/setQuantity/clear/setName + live validation |

---

## Phase 6 — AI Construction Assistant (⚠️ Partial — Unaudited)

Files committed but not yet audited for correctness or wiring:

`buildWizard.ts`, `budgetOptimizer.ts`, `comboFinder.ts`, `optimizeEngine.ts`,  
`powerScore.ts`, `powerSignal.ts`, `similarCards.ts`, `suggestions.ts`, `whatsMissing.ts`,  
`AdvisorPanel.tsx`, `SuggestionPanel.tsx`

---

## Open Issues

| Issue | Status |
|---|---|
| `rotation.ts` — `setReleaseDates` map never populated | ⚠️ Needs wiring to `db.cardSets` |
| Python implementation (`main.py`, `core/`, `ui/`) — no docs or decision | ❌ Needs decision: document, branch, or delete |
| Ph6 files need audit pass | ❌ In queue |
| `manaBaseStore.compute()` always passes `archetypeProfile = "midrange"` | ⚠️ Should read from detected archetype |

---

## Standard Legality Rules Implemented

- Minimum 60 mainboard cards
- Maximum 4 copies per card (by oracle ID; basic lands exempt)
- All cards must be `legal` in Standard (`legalities.standard === "legal"`)
- Banned cards flagged separately
- Sideboard: exactly 0 or 15 cards
- Companion deck-building restrictions: Lurrus, Yorion, Kaheera, Obosh, Umori, Gyruda, Jegantha, Zirda
- Rotation warnings for sets ≥18 months old when next rotation is ≤90 days away

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build + dev server)
- **Dexie 3** (IndexedDB ORM)
- **Tailwind CSS v4**
- **Zustand** (deck state + mana base store)
- **Vitest** (unit tests)
- **Playwright** (E2E — Phase 10)

---

## Card Data Attribution

Card data provided by [Scryfall](https://scryfall.com) under their
[non-commercial use policy](https://scryfall.com/docs/api/bulk-data).  
Magic: The Gathering card images © Wizards of the Coast.  
This project is not affiliated with or endorsed by Wizards of the Coast.
