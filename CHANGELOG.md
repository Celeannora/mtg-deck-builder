# Changelog

All notable changes to **MTG Standard Deck Builder** are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Active Development (Session: 2026-05-12)

> This project is being built iteratively in a Perplexity AI chat session.
> Each "Phase" below maps to a discrete code-generation block.
> Commit this file at the end of every session to preserve context.

---

## Phase 1 — Data Foundation (Complete)

### Spec Origin
The full product specification is stored in `new-2.txt` (attached to the original
chat session). Key decisions made during planning:
- **Local-first ingestion**: Phase 1 uses a local `oracle_cards.json` file from
  Scryfall bulk-data, NOT runtime API discovery (corrected from original spec).
- **Stack**: React + TypeScript + Vite + Dexie (IndexedDB) on the client side.
- **No server**: Pure static SPA. All data lives in IndexedDB.

### Files Added — Round 1

| File | Purpose |
|---|---|
| `src/lib/types.ts` | Full TypeScript type surface: `ScryfallCard`, `ScryfallCardFace`, `CardRecord`, `ImportProgress`, `ImportResult`, `ScryfallSet`, `DatabaseStatus` |
| `src/lib/db.ts` | Dexie schema v2: `cards`, `cardSets`, `userDecks`, `deckVersions`, `metaSnapshots`, `meta` tables. `replaceAllCards()` transaction. `getDatabaseStatus()`. `isDatabaseStale()`. `saveDeck()` with 20-version history. `getDeckVersions()`. |
| `src/lib/scryfall.ts` | `isStandardEligible()` filter (lang=en, legality=legal, excludes tokens/memorabilia/minigame/scheme/vanguard). `toCardRecord()` mapper. `getNormalImage()` (handles DFC). `extractSetsFromCards()`. `toSetRecord()`. |
| `src/lib/scryfallApi.ts` | `discoverOracleCardsDumpUri()` — fetches Scryfall bulk-data index, finds `oracle_cards` entry, returns `downloadUri + updatedAt + sizeBytes`. |
| `src/workers/importWorker.ts` | Dedicated Web Worker. Accepts `File` (local picker) OR `{ url: string }` (network). XHR-based download with per-percent progress. JSON parse → filter → transform loop with 5000-card progress ticks. Calls `replaceAllCards()`. Posts `progress / done / error` messages. |
| `src/components/BulkImporter.tsx` | React component. Mode toggle (local file / network). File picker input. Network path calls `discoverOracleCardsDumpUri()` then posts URL to worker. Live progress bar with `aria-progressbar`. Import result summary (`<dl>`). Error display. Staleness guard with confirm dialog. |
| `src/components/DatabaseStatusBar.tsx` | Persistent top bar. Shows card count, set count, last-imported timestamp. Amber "may be outdated" badge if >12h stale. "↻ Refresh Database" button. Scryfall attribution link. |

### Schema (Dexie v2)

```
cards          — id (PK), oracleId, name, cmc, legalityStandard, legalityFuture,
                 bannedInStandard, setCode, setName, rarity, importedAt, typeLine
cardSets       — code (PK), name, releaseDate, setType, importedAt
userDecks      — id (PK), archetypeTag, createdAt, updatedAt
                 mainboardJson, sideboardJson, notes, metaTier, winRate, pinnedCardIds
deckVersions   — ++id (auto PK), deckId, mainboardJson, sideboardJson, savedAt
metaSnapshots  — ++id (auto PK), timestamp, sourceUrl, archetypeDataJson
meta           — key (PK), value  [lastImportedAt, cardCount, setCount]
```

### CardRecord Fields

```
id, oracleId, name, lang, layout, cardFacesJson
manaCost, cmc, colorsJson, colorIdentityJson
typeLine, oracleText, keywordsJson
power, toughness, loyalty, producedManaJson
legalityStandard, legalityFuture, bannedInStandard
setCode, setName, setType, collectorNumber, rarity
imageNormal, priceUsd, priceUsdFoil, priceEur
edhrecRank, gameChanger, flavorText, artist
searchText (denormalized lowercase for FTS), importedAt
```

### Standard Eligibility Filter
- `lang === "en"`
- `legalities.standard === "legal"`
- `type_line` does NOT contain: Token, Scheme, Vanguard, Conspiracy, Art Series
- `set_type` NOT IN: token, memorabilia, minigame

---

## Phase 2 — Format Legality Engine (Complete)

### Files Added

| File | Purpose |
|---|---|
| `src/lib/legality.ts` | Full Standard legality validator. |
| `src/components/LegalityPanel.tsx` | Persistent rule-checklist UI panel. |
| `src/lib/legality.test.ts` | Vitest unit tests — 9 test cases covering all rules. |

### Legality Rules Implemented

| Rule | Code | Behaviour |
|---|---|---|
| Minimum 60 mainboard cards | `BELOW_60` | Hard violation |
| More than 60 cards | `ABOVE_60_WARN` | Warning only (legal) |
| Over 4 copies (by oracleId) | `OVER_4_COPIES` | Hard violation; basics exempt |
| Card not Standard-legal | `ILLEGAL_CARD` | Hard violation |
| Banned card | `BANNED_CARD` | Hard violation |
| Sideboard not 0 or 15 | `SIDEBOARD_SIZE` | Hard violation |
| Companion restriction violated | `COMPANION_RESTRICTION` | Hard violation |

### Companion Restrictions Encoded
- **Lurrus of the Dream-Den**: all non-land permanents CMC ≤ 2
- **Yorion, Sky Nomad**: starting deck ≥ 80 cards
- **Kaheera, the Orphanguard**: all non-land creatures are Cat/Elemental/Nightmare/Dinosaur/Beast
- **Umori, the Collector**: all non-land cards share a card type

### Rotation Warning System
- Checks `cardSets.releaseDate` for every card in the deck
- Cards from sets ≤ 90 days from their 730-day (2-year) rotation window
  generate `RotationWarning` entries (not violations — advisory only)
- Displayed in `LegalityPanel` with days-until-rotation and set name

### LegalityResult Shape
```typescript
{
  isLegal: boolean
  violations: LegalityViolation[]   // hard failures
  warnings: LegalityViolation[]     // advisory
  mainboardCount: number
  sideboardCount: number
  rotationWarnings: RotationWarning[]
}
```

### Test Coverage (Phase 2)
- ✅ Legal 60-card deck passes
- ✅ 59-card deck fails BELOW_60
- ✅ 64-card basic-land deck warns ABOVE_60_WARN (still legal)
- ✅ 5 copies of a non-basic fails OVER_4_COPIES
- ✅ 8 copies of basic land passes (exempt from 4-copy rule)
- ✅ Banned card fails BANNED_CARD
- ✅ 10-card sideboard fails SIDEBOARD_SIZE
- ✅ 0-card sideboard passes
- ✅ 15-card sideboard passes
- ✅ Lurrus companion violation detected

---

## Phase 3 — Mana Base Calculator (In Progress)

> See next session continuation or `src/lib/mana.ts` when committed.

### Planned
- Pip parser: extract `{W}`, `{U}`, `{B}`, `{R}`, `{G}`, `{C}`, `{X}`, `{2/W}`, `{W/U}` etc.
- Land slot recommendation: Frank Karsten formula per color
- Mana curve histogram data (CMC 0–7+)
- On-curve probability (hypergeometric): P(≥1 of card | hand=7, turn=T)
- Sequencing advisor: flags turn-1 gaps, double-pip requirements, CIPT lands
- `ManaBasePanel` component: curve chart + land counts + pip breakdown

---

## Phase 4 — Archetype Engine (Planned)

- Tag cards with role buckets: removal, draw, threat, ramp, disruption, finisher
- Detect archetype (aggro/midrange/control/combo) from mainboard composition
- Auto-suggest role gaps

---

## Phase 5 — 3-Panel UI Shell (Planned)

- Left: card search + filter panel
- Center: deck builder (mainboard + sideboard zones, drag-and-drop)
- Right: stats sidebar (legality + mana base + curve)
- Persistent layout, resizable panels

---

## Phase 6 — AI Construction Assistant (Planned)

- Prompt builder feeding deck context to LLM
- Suggest cuts, fills, sideboard tech
- Explain meta reasoning

---

## Phase 7 — Metagame Engine (Planned)

- Ingest MTGO/tournament JSON
- Archetype frequency tracking
- Matchup matrix
- Card prevalence by archetype

---

## Phase 8 — Import / Export (Planned)

- Import: Arena format, MTGO format, Moxfield URL
- Export: Arena clipboard, MTGO .dek, JSON
- Deck image export (card grid PNG)

---

## Phase 9 — Bo3 Competitive Mode (Planned)

- Sideboard planner: 15 slots mapped to matchups
- Bring-in / take-out guide per archetype
- Post-board win-rate tracking

---

## Phase 10 — Tech Architecture / Tests (Planned)

- Vitest full suite for all lib modules
- Playwright E2E for import → build → validate flow
- Lighthouse CI budget: LCP < 2s, CLS < 0.1

---

## Phase 11 — Competitive Intelligence (Planned)

- "Beat the meta" mode
- Hate card suggestions per meta archetype
- Tournament prep checklist

---

## Phase 12 — Final Integration (Planned)

- Complete 3-panel wiring
- Mobile layout
- Onboarding flow (first-run bulk import wizard)
- PWA manifest + service worker for offline use

---

## Session Notes

### Key Decisions Log

| Decision | Rationale |
|---|---|
| Local file picker (not runtime fetch) for Phase 1 | Avoids CORS, faster startup, offline-capable |
| Dexie over raw IndexedDB | Transaction safety, typed tables, bulk operations |
| Web Worker for import | Keeps UI thread unblocked during 300k+ card parse |
| `oracleId` for deduplication | Multiple printings share an oracle ID; 4-copy rule is per oracle |
| `searchText` denormalized field | Enables fast substring search without FTS extension |
| Rotation warning at 90 days | Gives players time to pivot before GP/RCQ seasons |
| No `localStorage` / `sessionStorage` | Sandboxed iframe environment blocks storage access |

### Tech Stack

```
Framework:    React 18 + TypeScript
Build:        Vite
DB:           Dexie 3 (IndexedDB)
Styling:      Tailwind CSS v4
Icons:        Lucide React
Charts:       Chart.js (Phase 3+)
Workers:      Native Web Workers (type:module)
Tests:        Vitest
E2E:          Playwright (Phase 10)
```

### File Map (current)

```
src/
  lib/
    types.ts          — all TypeScript interfaces
    db.ts             — Dexie schema + CRUD helpers
    scryfall.ts       — card transformation + eligibility
    scryfallApi.ts    — bulk-data endpoint discovery
    legality.ts       — Standard rules engine
    legality.test.ts  — Vitest unit tests
  workers/
    importWorker.ts   — File/network import Web Worker
  components/
    BulkImporter.tsx      — import UI (file + network)
    DatabaseStatusBar.tsx — persistent status bar
    LegalityPanel.tsx     — violation + warning display
```
