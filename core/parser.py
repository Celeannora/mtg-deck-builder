"""
Scryfall oracle_cards bulk JSON → list[Card].

Key decisions:
  • Local file only — no runtime API fetch.
  • English cards only (lang == "en").
  • Only legalities.standard == "legal" cards kept.
  • Excluded set_types: token, memorabilia, minigame.
  • Excluded type_line terms: Token, Scheme, Vanguard, Conspiracy, Art Series.
  • DFC / split / adventure cards unified into one Card entry with card_faces.
  • Progress reported via callback(processed, total, phase_msg).
"""
from __future__ import annotations

import json
import os
from typing import Callable, Optional

from .models import Card, CardFace

EXCLUDED_SET_TYPES = {"token", "memorabilia", "minigame"}
EXCLUDED_TYPE_TERMS = ("Token", "Scheme", "Vanguard", "Conspiracy", "Art Series")


def _safe_float(val) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


def _safe_price(val) -> Optional[float]:
    try:
        return float(val) if val else None
    except (TypeError, ValueError):
        return None


def _parse_face(raw: dict) -> CardFace:
    img = raw.get("image_uris") or {}
    return CardFace(
        name=raw.get("name"),
        mana_cost=raw.get("mana_cost"),
        type_line=raw.get("type_line"),
        oracle_text=raw.get("oracle_text"),
        colors=raw.get("colors") or [],
        power=raw.get("power"),
        toughness=raw.get("toughness"),
        loyalty=raw.get("loyalty"),
        image_uri_normal=img.get("normal"),
    )


def _get_normal_image(raw: dict) -> Optional[str]:
    if raw.get("image_uris", {}).get("normal"):
        return raw["image_uris"]["normal"]
    for face in raw.get("card_faces") or []:
        uri = (face.get("image_uris") or {}).get("normal")
        if uri:
            return uri
    return None


def _is_eligible(raw: dict) -> bool:
    if raw.get("lang", "") != "en":
        return False
    legalities = raw.get("legalities") or {}
    if legalities.get("standard", "") != "legal":
        return False
    type_line = raw.get("type_line", "")
    if any(term in type_line for term in EXCLUDED_TYPE_TERMS):
        return False
    if raw.get("set_type", "") in EXCLUDED_SET_TYPES:
        return False
    return True


def _raw_to_card(raw: dict, imported_at: str) -> Card:
    legalities = raw.get("legalities") or {}
    prices = raw.get("prices") or {}

    card_faces = [_parse_face(f) for f in (raw.get("card_faces") or [])]

    return Card(
        id=raw.get("id", ""),
        oracle_id=raw.get("oracle_id", ""),
        name=raw.get("name", ""),
        lang=raw.get("lang", ""),
        layout=raw.get("layout", ""),
        card_faces=card_faces,
        mana_cost=raw.get("mana_cost"),
        cmc=_safe_float(raw.get("cmc", 0)),
        colors=raw.get("colors") or [],
        color_identity=raw.get("color_identity") or [],
        type_line=raw.get("type_line", ""),
        oracle_text=raw.get("oracle_text"),
        keywords=raw.get("keywords") or [],
        power=raw.get("power"),
        toughness=raw.get("toughness"),
        loyalty=raw.get("loyalty"),
        produced_mana=raw.get("produced_mana") or [],
        legality_standard=legalities.get("standard", ""),
        legality_future=legalities.get("future", ""),
        banned_in_standard=legalities.get("standard", "") == "banned",
        set_code=raw.get("set", ""),
        set_name=raw.get("set_name", ""),
        set_type=raw.get("set_type", ""),
        collector_number=raw.get("collector_number", ""),
        rarity=raw.get("rarity", ""),
        image_uri_normal=_get_normal_image(raw),
        price_usd=_safe_price(prices.get("usd")),
        price_usd_foil=_safe_price(prices.get("usd_foil")),
        price_eur=_safe_price(prices.get("eur")),
        edhrec_rank=raw.get("edhrec_rank"),
        game_changer=bool(raw.get("game_changer", False)),
        flavor_text=raw.get("flavor_text"),
        artist=raw.get("artist"),
        imported_at=imported_at,
    )


def parse_bulk_file(
    filepath: str,
    progress_cb: Optional[Callable[[int, int, str], None]] = None,
) -> tuple[list[Card], dict]:
    """
    Parse a Scryfall oracle_cards bulk JSON file.
    Returns (cards, meta) where meta = {total_seen, imported, skipped, file_size_mb, timestamp}.
    progress_cb(processed, total, message) called every 1,000 records.
    """
    from datetime import datetime, timezone

    if progress_cb:
        progress_cb(0, 0, "Reading file…")

    file_size = os.path.getsize(filepath)

    with open(filepath, "r", encoding="utf-8") as fh:
        if progress_cb:
            progress_cb(0, 0, "Parsing JSON…")
        raw_list: list[dict] = json.load(fh)

    total = len(raw_list)
    imported_at = datetime.now(timezone.utc).isoformat()
    cards: list[Card] = []
    skipped = 0

    if progress_cb:
        progress_cb(0, total, "Filtering & transforming cards…")

    for i, raw in enumerate(raw_list):
        if _is_eligible(raw):
            cards.append(_raw_to_card(raw, imported_at))
        else:
            skipped += 1

        if progress_cb and i % 1_000 == 0:
            progress_cb(i, total, f"Processed {i:,} / {total:,} cards…")

    meta = {
        "total_seen": total,
        "imported": len(cards),
        "skipped": skipped,
        "file_size_mb": round(file_size / 1_048_576, 1),
        "timestamp": imported_at,
    }

    if progress_cb:
        progress_cb(total, total, f"Done — {len(cards):,} Standard-legal cards imported.")

    return cards, meta
