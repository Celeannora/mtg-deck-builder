"""
SQLite persistence layer — Phase 1.

Uses a shadow FTS5 table (cards_fts) that is manually populated
alongside the main cards table, avoiding the content= FTS5 trigger
complexity that varies across SQLite versions.
"""
from __future__ import annotations

import json
import os
import sqlite3

from .models import Card

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cards.db")


def get_db_path() -> str:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return DB_PATH


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.row_factory = sqlite3.Row
    return conn


DDL_CARDS = """
CREATE TABLE IF NOT EXISTS cards (
    id                  TEXT PRIMARY KEY,
    oracle_id           TEXT NOT NULL,
    name                TEXT NOT NULL,
    lang                TEXT NOT NULL,
    layout              TEXT NOT NULL,
    card_faces_json     TEXT,

    mana_cost           TEXT,
    cmc                 REAL NOT NULL DEFAULT 0,
    colors_json         TEXT NOT NULL DEFAULT '[]',
    color_identity_json TEXT NOT NULL DEFAULT '[]',
    type_line           TEXT NOT NULL DEFAULT '',
    oracle_text         TEXT,
    keywords_json       TEXT NOT NULL DEFAULT '[]',
    power               TEXT,
    toughness           TEXT,
    loyalty             TEXT,
    produced_mana_json  TEXT NOT NULL DEFAULT '[]',

    legality_standard   TEXT,
    legality_future     TEXT,
    banned_in_standard  INTEGER NOT NULL DEFAULT 0,

    set_code            TEXT NOT NULL,
    set_name            TEXT NOT NULL,
    set_type            TEXT,
    collector_number    TEXT,
    rarity              TEXT,

    image_uri_normal    TEXT,
    price_usd           REAL,
    price_usd_foil      REAL,
    price_eur           REAL,
    edhrec_rank         INTEGER,
    game_changer        INTEGER NOT NULL DEFAULT 0,

    flavor_text         TEXT,
    artist              TEXT,
    imported_at         TEXT NOT NULL
);
"""

DDL_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_cards_cmc          ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_cards_rarity       ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_set_code     ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_legality_std ON cards(legality_standard);
CREATE INDEX IF NOT EXISTS idx_cards_banned       ON cards(banned_in_standard);
CREATE INDEX IF NOT EXISTS idx_cards_name         ON cards(name COLLATE NOCASE);
"""

DDL_FTS = """
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
    card_id UNINDEXED,
    name,
    oracle_text,
    type_line,
    keywords_text
);
"""

DDL_AUX = """
CREATE TABLE IF NOT EXISTS import_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_decks (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    archetype_tag  TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    mainboard_json TEXT NOT NULL DEFAULT '{}',
    sideboard_json TEXT NOT NULL DEFAULT '{}',
    notes          TEXT,
    meta_tier      TEXT,
    win_rate       REAL
);

CREATE TABLE IF NOT EXISTS card_sets (
    set_code     TEXT PRIMARY KEY,
    set_name     TEXT NOT NULL,
    release_date TEXT,
    set_type     TEXT
);
"""

CARD_INSERT = """
INSERT OR REPLACE INTO cards VALUES (
    :id, :oracle_id, :name, :lang, :layout, :card_faces_json,
    :mana_cost, :cmc, :colors_json, :color_identity_json,
    :type_line, :oracle_text, :keywords_json,
    :power, :toughness, :loyalty, :produced_mana_json,
    :legality_standard, :legality_future, :banned_in_standard,
    :set_code, :set_name, :set_type, :collector_number, :rarity,
    :image_uri_normal, :price_usd, :price_usd_foil, :price_eur,
    :edhrec_rank, :game_changer,
    :flavor_text, :artist, :imported_at
)
"""

FTS_INSERT = """
INSERT INTO cards_fts(card_id, name, oracle_text, type_line, keywords_text)
VALUES (?, ?, ?, ?, ?)
"""


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(DDL_CARDS + DDL_INDEXES + DDL_FTS + DDL_AUX)


def clear_and_insert_cards(
    cards: list[Card],
    progress_cb=None,
) -> None:
    """Replace all card data atomically inside a single transaction."""
    with _connect() as conn:
        conn.execute("DELETE FROM cards")
        conn.execute("DELETE FROM cards_fts")

        batch_cards: list[dict] = []
        batch_fts: list[tuple]  = []
        total = len(cards)

        def _flush():
            conn.executemany(CARD_INSERT, batch_cards)
            conn.executemany(FTS_INSERT, batch_fts)
            batch_cards.clear()
            batch_fts.clear()

        for i, c in enumerate(cards):
            batch_cards.append({
                "id":                  c.id,
                "oracle_id":           c.oracle_id,
                "name":                c.name,
                "lang":                c.lang,
                "layout":              c.layout,
                "card_faces_json":     json.dumps([
                    {
                        "name":             f.name,
                        "mana_cost":        f.mana_cost,
                        "type_line":        f.type_line,
                        "oracle_text":      f.oracle_text,
                        "colors":           f.colors,
                        "power":            f.power,
                        "toughness":        f.toughness,
                        "loyalty":          f.loyalty,
                        "image_uri_normal": f.image_uri_normal,
                    }
                    for f in c.card_faces
                ]) if c.card_faces else None,
                "mana_cost":           c.mana_cost,
                "cmc":                 c.cmc,
                "colors_json":         json.dumps(c.colors),
                "color_identity_json": json.dumps(c.color_identity),
                "type_line":           c.type_line,
                "oracle_text":         c.oracle_text,
                "keywords_json":       json.dumps(c.keywords),
                "power":               c.power,
                "toughness":           c.toughness,
                "loyalty":             c.loyalty,
                "produced_mana_json":  json.dumps(c.produced_mana),
                "legality_standard":   c.legality_standard,
                "legality_future":     c.legality_future,
                "banned_in_standard":  1 if c.banned_in_standard else 0,
                "set_code":            c.set_code,
                "set_name":            c.set_name,
                "set_type":            c.set_type,
                "collector_number":    c.collector_number,
                "rarity":              c.rarity,
                "image_uri_normal":    c.image_uri_normal,
                "price_usd":           c.price_usd,
                "price_usd_foil":      c.price_usd_foil,
                "price_eur":           c.price_eur,
                "edhrec_rank":         c.edhrec_rank,
                "game_changer":        1 if c.game_changer else 0,
                "flavor_text":         c.flavor_text,
                "artist":              c.artist,
                "imported_at":         c.imported_at,
            })

            batch_fts.append((
                c.id,
                c.name,
                c.oracle_text or "",
                c.type_line,
                " ".join(c.keywords),
            ))

            if len(batch_cards) >= 500:
                _flush()
                if progress_cb:
                    progress_cb(i, total, f"Saving to database\u2026 {i:,} / {total:,}")

        if batch_cards:
            _flush()


def save_import_meta(meta: dict) -> None:
    with _connect() as conn:
        for k, v in meta.items():
            conn.execute(
                "INSERT OR REPLACE INTO import_meta(key, value) VALUES (?, ?)",
                (k, str(v)),
            )


def get_import_meta() -> dict:
    with _connect() as conn:
        rows = conn.execute("SELECT key, value FROM import_meta").fetchall()
        return {r["key"]: r["value"] for r in rows}


def get_card_count() -> int:
    with _connect() as conn:
        row = conn.execute("SELECT COUNT(*) as n FROM cards").fetchone()
        return row["n"] if row else 0
