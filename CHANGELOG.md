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

## Phase 2 — Format Legality Engine (✅ Complete — 2026-05-13)

### Files
- `src/lib/legality.ts` — `validateDeck()`, `DeckValidationInput`, violation codes: `UNDER_MINIMUM`, `OVER_FOUR_COPIES`, `BANNED_CARD`, `NOT_STANDARD_LEGAL`, `SIDEBOARD_OVER_15`
- `src/lib/companion.ts` — companion condition checkers per card name
- `src/lib/rotation.ts` — `getRotationDate()`, `isRotatingWithinMonths()`, rotation warnings
- `src/components/ValidationPanel.tsx` — violation list, rotation warnings, companion status

---

## Phase 3 — Mana Base Calculator (✅ Complete — 2026-05-13)

### Files
- `src/lib/manaBase.ts` — `recommendLandCount()`, `recommendFetchCount()`, `analyzeManaBase()`
- `src/lib/manaBaseStore.ts` — Zustand slice for mana base overrides
- `src/lib/colorDistribution.ts` — pip counting, color weight calculation
- `src/components/ManaBasePanel.tsx` — land count recommendations, pip breakdown
- `src/components/ManaCurveChart.tsx` — Chart.js bar chart, CMC distribution

---

## Phase 4 — Archetype Engine (✅ Complete — 2026-05-13)

### Files
- `src/lib/archetype.ts` — `detectArchetype()`, archetype signal scoring
- `src/lib/roles.ts` — `assignRoles()` — threat/answer/engine/finisher classification
- `src/lib/synergy.ts` — `scoreSynergy()` — keyword and mechanic overlap scoring
- `src/components/ArchetypePanel.tsx` — detected archetype badge, role breakdown, synergy score

---

## Phase 5 — 3-Panel UI Shell (✅ Complete — 2026-05-13)

### Files
- `src/components/CardSearchPanel.tsx` — search input, filter chips, virtual card list
- `src/components/CardDetailDrawer.tsx` — slide-in card detail with image, oracle text, legality
- `src/components/DeckPanel.tsx` — deck list grouped by type, quantity controls, card click
- `src/components/DeckStatsBar.tsx` — card count, land count, estimated price
- `src/components/RightPanel.tsx` — tabbed right panel (Curve / Mana / Archetype / Validate / Plan)
- `src/store/deckStore.ts` — Zustand deck store: `mainboard`, `sideboard`, `activeDeckId`, `deckName`

---

## Phase 6 — AI Construction Assistant (✅ Complete — 2026-05-13)

### Files
- `src/lib/buildWizard.ts` — guided deck build flow, step machine
- `src/lib/budgetOptimizer.ts` — `optimizeBudget()` — swap expensive cards for cheaper alternatives
- `src/lib/comboFinder.ts` — `findCombos()` — keyword/oracle pattern combo detection
- `src/lib/optimizeEngine.ts` — `optimizeDeck()` — iterative improvement loop
- `src/lib/deckComposition.ts` — spell/land/creature ratio targets by archetype
- `src/lib/powerScore.ts` — `scoreDeck()` — aggregate power heuristic
- `src/lib/powerSignal.ts` — individual card power signals (evasion, card advantage, tempo)
- `src/lib/similarCards.ts` — `findSimilarCards()` — cosine similarity on searchText tokens
- `src/lib/suggestions.ts` — `getSuggestions()` — role-gap driven card suggestions
- `src/lib/whatsMissing.ts` — `getWhatsMissing()` — missing role/curve slot analysis
- `src/components/AdvisorPanel.tsx` — suggestion feed with add-to-deck actions
- `src/components/GamePlanSummary.tsx` — natural language game plan summary
- `src/components/SuggestionPanel.tsx` — budget / power / synergy suggestion tabs

---

## Phase 7 — Metagame Engine (✅ Complete — 2026-05-13)

> Superseded by Phase 11 (Competitive Intelligence). Phase 7 stub files retained for compatibility.

---

## Phase 8 — Import / Export / Collection (✅ Complete — 2026-05-13)

### Summary
Full deck import/export pipeline and offline collection tracker.

### Files

| File | Purpose |
|---|---|
| `src/lib/deckParser.ts` | `parseDecklistText()` — MTGO/Arena fuzzy import. `parseArenaLine()`, `parseMTGOLine()`, `fuzzyMatchCard()` (exact → set-scoped → starts-with → contains). `resolveDeckEntries()`. |
| `src/lib/deckExporter.ts` | `exportMTGO()`, `exportArena()`, `exportJSON()`, `exportCSV()`. `encodeShareableLink()` / `decodeShareableLink()` — base64 URL, no server needed. |
| `src/lib/collectionStore.ts` | Separate `collectionDB` (Dexie). `markOwned()`, `getOwned()`, `getCollection()`. `getMissingCards()` with acquire cost + TCGPlayer URL. `importFromArenaCSV()`. |
| `src/lib/deckHistory.ts` | `autosaveDeck()` debounced 500 ms. `persistVersion()` with 20-version cap. `getDeckVersions()`, `restoreDeckVersion()`, `diffDeckVersions()` (added/removed per oracle ID), `forkDeck()`. |
| `src/lib/deckImportSources.ts` | `importFromMTGGoldfish()`, `importFromMoxfield()` — URL fetch stubs with CORS notes; fallback to paste. |
| `src/components/DeckImportPanel.tsx` | Tab UI: Paste Text / URL / JSON. Unmatched card report. One-click load into store. |
| `src/components/DeckExportPanel.tsx` | 6 export buttons (MTGO download, Arena copy, JSON, CSV, Share Link). |
| `src/components/CollectionPanel.tsx` | Have/need toggle per card. Missing cards list. Total acquire cost. TCGPlayer links. Arena CSV import. |
| `src/components/DeckHistoryPanel.tsx` | Version list with timestamps. Restore button. Diff viewer (added/removed). Fork button. |

### Key Decisions

| Decision | Rationale |
|---|---|
| Separate `collectionDB` Dexie instance | Collection data lifecycle differs from card DB — survives full card re-imports |
| `autosaveDeck` debounce 500 ms | Avoids thrashing Dexie on rapid card add/remove; still feels instant |
| `decodeShareableLink` on App mount | Hash-based decode works in sandboxed iframes with no server |
| Fuzzy match: exact → set → prefix → contains | Prioritises precision; falls back to loose match rather than failing silently |

---

## Phase 9 — Bo3 Competitive Mode (✅ Complete — 2026-05-13)

### Summary
Full Best-of-Three match tracker with win-rate analytics, sideboard planning, and matchup history.

### Files

| File | Purpose |
|---|---|
| `src/lib/bo3.ts` | `MatchRecord`, `GameRecord`, `calcMatchResult()`, `calcStats()` (match WR, game WR, on-play/on-draw WR). CRUD via `meta` table JSON blob. |
| `src/lib/sideboardPlan.ts` | `generateSideboardPlan()` — heuristic bring-in/take-out using archetype keyword patterns vs oracle text. `rateSideboardCard()`. |
| `src/lib/matchup.ts` | `getMatchupStats()` — per-archetype W/L/D aggregation. `suggestTechCards()` — archetype-keyed tech suggestions. |
| `src/components/Bo3Panel.tsx` | Match logger (game-by-game, on-play checkbox). Stats strip (4 KPIs). Matchup table. Recent match list with delete. |
| `src/components/SideboardPlanPanel.tsx` | Archetype chip picker. Generated bring-in / take-out list with rationale chips. |

---

## Phase 10 — Tests + CI (✅ Complete — 2026-05-13)

### Summary
Vitest test suites for core logic modules. GitHub Actions CI pipeline.

### Files

| File | Covers |
|---|---|
| `vitest.config.ts` | `jsdom` environment, `fake-indexeddb/auto` setup, coverage config |
| `src/test/setup.ts` | `fake-indexeddb/auto` import for Dexie compatibility in tests |
| `src/lib/__tests__/legality.test.ts` | `validateDeck()` — 60-card min, 4-copy rule, basic land exemption, banned cards, sideboard max |
| `src/lib/__tests__/scryfall.test.ts` | `isStandardEligible()` — lang, legality, type line, set type. `toCardRecord()` field mapping. |
| `src/lib/__tests__/manaBase.test.ts` | `recommendLandCount()` — monotonicity, 20–28 range for 60-card decks |
| `src/lib/__tests__/bo3.test.ts` | `calcMatchResult()`, `calcStats()` — win rate, edge cases |
| `.github/workflows/ci.yml` | Node 20, `npm ci`, `tsc --noEmit`, `vitest run --coverage`, `vite build` |

---

## Phase 11 — Competitive Intelligence (✅ Complete — 2026-05-13)

### Summary
Metagame snapshot engine, tier list builder, trend analyzer, and MetagamePanel UI.

### Files

| File | Purpose |
|---|---|
| `src/lib/metagame.ts` | `MetagameEntry` type. `fetchMetagameSnapshot()` — representative stub (replace with proxy fetch in production). `computeMetaScore()`. `rankDeckVsMeta()` — cross-references personal matchup stats. |
| `src/lib/tierList.ts` | `buildTierList()`, `getMetaTier()`, `compareTierPosition()` |
| `src/lib/trendAnalyzer.ts` | `diffMetaSnapshots()` — delta between two snapshots. `detectTrendingArchetypes()`, `detectEmergingCards()`. |
| `src/components/MetagamePanel.tsx` | Tier table with share bars + trend arrows. Rising/falling archetype panels. |

---

## Phase 12 — Final Integration + PWA (✅ Complete — 2026-05-13)

### Summary
PWA manifest, service worker (cache-first assets / network-first Scryfall), SW update toast, shareable link decode on mount.

### Files

| File | Purpose |
|---|---|
| `public/manifest.webmanifest` | PWA manifest — name, icons, theme color `#01696f`, `display: standalone` |
| `public/sw.js` | Service worker. Cache-first for static assets. Network-first + cache fallback for `scryfall.com`. Prunes old caches on activate. |
| `src/pwa.ts` | `registerServiceWorker(onUpdate?)` — production-only registration, fires `onUpdate` callback when new SW installs. |
| `src/main.tsx` | Calls `registerServiceWorker()` dispatching `sw-update-ready` DOM event. |

### Wiring (this commit)

| Change | Detail |
|---|---|
| `App.tsx` | Import mode toggle (Load DB / Import Deck). `DeckImportPanel` in import view. Shareable link decode on mount. SW update banner. `activeDeckId` threaded to `RightPanel`. |
| `RightPanel.tsx` | 11-tab scrollable bar. All Phase 8–11 panels wired: `Bo3Panel`, `SideboardPlanPanel`, `CollectionPanel`, `DeckHistoryPanel`, `DeckExportPanel`, `MetagamePanel`. `mainCards`/`sideCards` resolved from Dexie on store change. SW update event listener. |
| `src/main.tsx` | `registerServiceWorker()` called post-render. |

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
Tests:      Vitest + fake-indexeddb
E2E:        Playwright (deferred)
PWA:        Native SW + manifest.webmanifest
```

### Architecture Notes
- All state is client-side: IndexedDB (Dexie) for cards/decks/collection, Zustand for session UI state
- No backend required — shareable links are base64-encoded in the URL hash
- `collectionDB` is a separate Dexie instance so collection data survives full card re-imports
- Bo3 match records stored as JSON in `meta` table to avoid a schema bump
- Service worker is production-only; Vite dev server bypasses it
