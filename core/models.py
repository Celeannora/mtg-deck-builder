"""
Dataclass definitions for every Scryfall field the app persists.
All fields mirror the Phase 1 spec exactly.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CardFace:
    name: Optional[str] = None
    mana_cost: Optional[str] = None
    type_line: Optional[str] = None
    oracle_text: Optional[str] = None
    colors: list[str] = field(default_factory=list)
    power: Optional[str] = None
    toughness: Optional[str] = None
    loyalty: Optional[str] = None
    image_uri_normal: Optional[str] = None


@dataclass
class Card:
    # Identity
    id: str = ""
    oracle_id: str = ""
    name: str = ""
    lang: str = ""
    layout: str = ""
    card_faces: list[CardFace] = field(default_factory=list)

    # Game rules
    mana_cost: Optional[str] = None
    cmc: float = 0.0
    colors: list[str] = field(default_factory=list)
    color_identity: list[str] = field(default_factory=list)
    type_line: str = ""
    oracle_text: Optional[str] = None
    keywords: list[str] = field(default_factory=list)
    power: Optional[str] = None
    toughness: Optional[str] = None
    loyalty: Optional[str] = None
    produced_mana: list[str] = field(default_factory=list)

    # Legality
    legality_standard: str = ""
    legality_future: str = ""
    banned_in_standard: bool = False

    # Print / market
    set_code: str = ""
    set_name: str = ""
    set_type: str = ""
    collector_number: str = ""
    rarity: str = ""
    image_uri_normal: Optional[str] = None
    price_usd: Optional[float] = None
    price_usd_foil: Optional[float] = None
    price_eur: Optional[float] = None
    edhrec_rank: Optional[int] = None
    game_changer: bool = False

    # Search support
    flavor_text: Optional[str] = None
    artist: Optional[str] = None

    # Computed at import time
    imported_at: str = ""
