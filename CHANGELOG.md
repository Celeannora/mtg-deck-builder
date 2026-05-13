# Changelog

All notable changes to **MTG Standard Deck Builder** are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Active Development

> Built iteratively in a Perplexity AI chat session.
> Each "Phase" maps to a discrete code-generation block.

---

## Phase 1 — Data Foundation (✅ Complete — 2026-05-13)

### Summary
Full local-first card ingestion pipeline. Parses Scryfall `oracle_cards.json`,
filters to Standard-legal cards, extracts sets, persists to IndexedDB via Dexie,
and surfaces a live status bar. Supports both local file picker and network download.

### Files

| File | Purpose |
|---|---|
| `src/lib/types.ts` | `ScryfallCard`, `ScryfallCardFace`, `CardRecord`, `SetRecord`, `DatabaseStatus`, `ImportProgress`, `ImportResult`, `ScryfallBulkDataEntry` |
| `src/lib/db.ts` | Dexie v2 schema: `cards`, `cardSets`, `userDecks`, `deckVersions`, `meta`. `replaceAllCards()` (transaction). `getDatabaseStatus()`. `isDatabaseStale()`. `saveDeck()` with 20-version history. `getDeckVersions()`. |
| `src/lib/scryfall.ts` | `isStandardEligible()` filter. `toCardRecord()` mapper (handles DFC, price, searchText). `extractSetsFromCards()`. |
| `src/lib/scryfallApi.ts` | `discoverOracleCardsDumpUri()` — fetches Scryfall bulk-data index, finds `oracle_cards` entry, returns `{ downloadUri, updatedAt, sizeBytes }`. |
| `src/lib/search.ts` | `searchCards()` — full filter/sort/paginate over IndexedDB cards. `getDistinctKeywords()`. `getStandardSets()`. |
| `src/workers/importWorker.ts` | Web Worker. Accepts `File` (local) OR `{ url: string }` (network/XHR with per-byte progress). Filter → transform → set extraction → `replaceAllCards()`. Posts `progress / done / error`. |
| `src/components/BulkImporter.tsx` | Import UI. Mode toggle (local / network). File picker. Network path calls `discoverOracleCardsDumpUri()`. Live `aria-progressbar`. Import result `<dl>`. Error display. |
| `src/components/DatabaseStatusBar.tsx` | Slim status bar: card count, set count, last-imported date. Amber "May be outdated" badge + Refresh button if >12 h stale. Auto-refreshes every 60 s. |
| `src/hooks/useDBStatus.ts` | `useDBStatus()` — reactive DB status hook. Fires on mount and re-fires after `cards` table writes. Returns `{ isReady, cardCount, setCount, lastImportedAt, isStale, isEmpty, refresh }`. |
| `src/components/Header.tsx` | App header with SVG logo, view toggle (Builder / Import Data), Scryfall attribution. |
| `src/App.tsx` | Root component. Routes between import view (empty DB) and 3-panel builder. Mounts `DatabaseStatusBar`. Passes `refresh` to `BulkImporter.onImportDone`. |

### Dexie Schema (v2)

```
cards        — id (PK), oracleId, name, cmc, legalityStandard, legalityFuture,
               bannedInStandard, setCode, setName, rarity, releasedAt, imageNormal, importedAt, typeLine
cardSets     — code (PK), name, releaseDate, setType, importedAt
userDecks    — id (PK), archetypeTag, createdAt, updatedAt
deckVersions — ++id (auto PK), deckId, savedAt
meta         — key (PK), value  [lastImportedAt, cardCount, setCount]
```

### Standard Eligibility Filter
- `lang === "en"`
- `legalities.standard === "legal"`
- `type_line` NOT containing: Token, Scheme, Vanguard, Conspiracy, Art Series
- `set_type` NOT IN: token, memorabilia, minigame

### CardRecord Fields Added vs Previous
- `releasedAt` — from `card.released_at` (needed for rotation engine in Phase 2)
- `setsExtracted` on `ImportResult`

### Key Decisions

| Decision | Rationale |
|---|---|
| Local file picker as primary mode | Avoids CORS, works offline, fastest startup |
| XHR (not fetch) for network download | `onprogress` events unavailable on fetch streams in Workers |
| Dexie v2 schema bump | Added `cardSets`, `userDecks`, `deckVersions`, `releasedAt` index |
| `oracleId` for deduplication | Multiple printings share oracle ID; 4-copy rule is per oracle |
| `searchText` denormalized field | Enables fast substring search without FTS extension |
| `extractSetsFromCards()` in scryfall.ts | Sets derived from card data — no separate Scryfall sets API needed |
| `useDBStatus` re-fires on `cards` write hook | Avoids polling; status updates automatically after import |

---

## Phase 2 — Format Legality Engine (⚠️ Partially committed — needs audit)

> `legality.ts` and `ValidationPanel.tsx` are present in the repo but were
> not formally documented when committed. `legality.test.ts` is missing.
> Full Phase 2 CHANGELOG entry to be written when the audit pass is complete.

### Files Present (undocumented at time of audit)
- `src/lib/legality.ts`
- `src/lib/companion.ts`
- `src/lib/rotation.ts`
- `src/components/ValidationPanel.tsx`

### Files Missing
- `src/lib/legality.test.ts` — referenced in original CHANGELOG, never committed

---

## Phase 3 — Mana Base Calculator (⚠️ Partially committed — undocumented)

> Files present but not formally documented.

### Files Present
- `src/lib/manaBase.ts`
- `src/lib/manaBaseStore.ts`
- `src/lib/colorDistribution.ts`
- `src/components/ManaBasePanel.tsx`
- `src/components/ManaCurveChart.tsx`

---

## Phase 4 — Archetype Engine (⚠️ Partially committed — undocumented)

### Files Present
- `src/lib/archetype.ts`
- `src/lib/roles.ts`
- `src/lib/synergy.ts`
- `src/components/ArchetypePanel.tsx`

---

## Phase 5 — 3-Panel UI Shell (⚠️ Partially committed — undocumented)

### Files Present
- `src/components/CardSearchPanel.tsx`
- `src/components/CardDetailDrawer.tsx`
- `src/components/DeckPanel.tsx`
- `src/components/DeckStatsBar.tsx`
- `src/components/RightPanel.tsx`
- `src/store/deckStore.ts`

---

## Phase 6 — AI Construction Assistant (⚠️ Partially committed — undocumented)

### Files Present
- `src/lib/buildWizard.ts`
- `src/lib/budgetOptimizer.ts`
- `src/lib/comboFinder.ts`
- `src/lib/optimizeEngine.ts`
- `src/lib/deckComposition.ts`
- `src/lib/powerScore.ts`
- `src/lib/powerSignal.ts`
- `src/lib/similarCards.ts`
- `src/lib/suggestions.ts`
- `src/lib/whatsMissing.ts`
- `src/components/AdvisorPanel.tsx`
- `src/components/GamePlanSummary.tsx`
- `src/components/SuggestionPanel.tsx`

---

## Phase 7 — Metagame Engine (⬜ Planned)
## Phase 8 — Import / Export (⬜ Planned)
## Phase 9 — Bo3 Competitive Mode (⬜ Planned)
## Phase 10 — Tests + CI (⬜ Planned)
## Phase 11 — Competitive Intelligence (⬜ Planned)
## Phase 12 — Final Integration + PWA (⬜ Planned)

---

## Session Notes

### Tech Stack

```
Framework:  React 18 + TypeScript
Build:      Vite
DB:         Dexie 3 (IndexedDB)
Styling:    Tailwind CSS v4
State:      Zustand (deck store)
Icons:      Lucide React
Charts:     Chart.js (Phase 3+)
Workers:    Native Web Workers (type:module)
Tests:      Vitest
E2E:        Playwright (Phase 10)
```

### Undocumented Python Implementation

A parallel Python implementation exists at the repo root (`main.py`,
`requirements.txt`, `core/`, `ui/`). It is NOT part of the canonical
TypeScript build. Decision pending: document, branch, or remove.
