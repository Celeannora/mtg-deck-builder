# MTG Deck Builder — Project TODO

> Living log of every phase, task, and decision.
> Status: `✅ done` | `🔄 in progress` | `⏳ planned` | `❌ blocked`

---

## Phase 1 — Data Foundation `✅ done`

**Goal:** Parse, filter, and persist the full Scryfall Standard card pool locally.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Define `Card` + `CardFace` dataclasses (all 34 spec fields) | ✅ | `core/models.py` |
| 1.2 | Scryfall bulk JSON parser w/ eligibility filter | ✅ | `core/parser.py` — English, standard-legal, no tokens/memorabilia |
| 1.3 | SQLite schema: `cards`, `cards_fts` (FTS5), `user_decks`, `card_sets`, `import_meta` | ✅ | `core/database.py` — WAL mode, 6 indexes |
| 1.4 | Background import thread + `queue.Queue` progress events | ✅ | `core/importer.py` — daemon thread, never blocks GUI |
| 1.5 | customtkinter GUI panel: status card, progress bar, log | ✅ | `ui/phase1_import.py` |
| 1.6 | Main window with header, theme toggle, status bar | ✅ | `main.py` |
| 1.7 | Parser unit tests (5 card fixtures, all filter branches) | ✅ | Verified: 2 imported / 3 skipped |
| 1.8 | Database unit tests (FTS, game_changer flag, DFC faces) | ✅ | All assertions pass |
| 1.9 | Publish to private GitHub repo | ✅ | `Celeannora/mtg-deck-builder` |

**Decisions logged:**
- Local file picker instead of runtime Scryfall API fetch (avoids rate limits, works offline)
- FTS5 shadow table (no `content=` triggers) for SQLite version portability
- `user_decks` and `card_sets` tables provisioned now so Phase 2 has no migration needed

---

## Phase 2 — Legality Engine + Set Rotation `⏳ planned`

**Goal:** Track active Standard sets, flag rotation dates, validate deck legality in real-time.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Populate `card_sets` from imported card data | ⏳ | Deduplicate set_code/set_name/set_type from cards |
| 2.2 | Rotation calendar: map sets → rotation date | ⏳ | Use Scryfall `released_at` + 2-year Standard window |
| 2.3 | `LegalityService` — check card.legality_standard on deck add | ⏳ | Real-time flag: legal / not_legal / banned |
| 2.4 | Banned list overlay panel | ⏳ | Show `banned_in_standard=1` cards with warning |
| 2.5 | Set rotation warning banner (30-day countdown) | ⏳ | Highlight cards rotating within 30 days |
| 2.6 | `future`-legal preview cards indicator | ⏳ | legality_future == "legal" but not yet in Standard |

---

## Phase 3 — Card Browser + Search `⏳ planned`

**Goal:** Full-featured card browser: FTS search, multi-filter sidebar, card detail panel.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | `CardRepository` query layer (FTS + SQL filters) | ⏳ | name, oracle_text, type_line, color, CMC, rarity |
| 3.2 | Searchable card table widget (virtual/lazy-load rows) | ⏳ | customtkinter `CTkScrollableFrame` + row recycling |
| 3.3 | Filter sidebar: colors, CMC range, type, rarity, set | ⏳ | Instant re-query on any filter change |
| 3.4 | Card detail panel (image, oracle text, prices, legality) | ⏳ | Right-click or single-click to expand |
| 3.5 | DFC flip animation (front/back toggle) | ⏳ | |
| 3.6 | game_changer badge on card row | ⏳ | Gold star icon next to name |

---

## Phase 4 — Deck Builder Core `⏳ planned`

**Goal:** Create, edit, and persist mainboard/sideboard decks with real-time validation.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | `DeckService`: create/read/update/delete decks (`user_decks` table) | ⏳ | |
| 4.2 | Mainboard / sideboard split editor | ⏳ | 60-card main, 15-card side |
| 4.3 | 4-copy rule enforcement | ⏳ | Except basic lands + rule exceptions |
| 4.4 | Real-time mana curve chart (bar chart, CMC 0–7+) | ⏳ | Embedded matplotlib or custom canvas |
| 4.5 | Color identity pie / symbol breakdown | ⏳ | |
| 4.6 | Deck export: `.txt` (MTGO format), clipboard copy | ⏳ | |
| 4.7 | Deck import: parse pasted decklist | ⏳ | Handle qty + name, match to DB |
| 4.8 | Archetype tag + meta tier label on deck | ⏳ | Free-text + dropdown |

---

## Phase 5 — Meta & Analytics `⏳ planned`

**Goal:** Win-rate tracking, meta share display, EDHREC-rank sort for card selection.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Match result logger (win/loss/draw per deck) | ⏳ | |
| 5.2 | Win-rate display on deck list | ⏳ | Stored in `user_decks.win_rate` |
| 5.3 | EDHREC rank sort in card browser | ⏳ | Already in DB; just expose in filter |
| 5.4 | Price trend sparkline per card (historical stub) | ⏳ | |
| 5.5 | Meta snapshot import (external JSON) | ⏳ | |

---

## Phase 6 — Polish & Distribution `⏳ planned`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Package with PyInstaller (Windows .exe, macOS .app) | ⏳ | |
| 6.2 | Auto-update check against Scryfall bulk-data `updated_at` | ⏳ | |
| 6.3 | Settings panel (DB path, theme, default filters) | ⏳ | |
| 6.4 | Keyboard shortcuts (Ctrl+F search, Ctrl+N new deck) | ⏳ | |
| 6.5 | Accessibility: screen reader labels on all widgets | ⏳ | |

---

*Last updated: 2026-05-13 by AI assistant — Phase 1 complete.*
