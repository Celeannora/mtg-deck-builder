import { create } from "zustand";
import { validateDeck, BASIC_LAND_NAMES } from "../lib/legality";
import { checkCompanionRestriction } from "../lib/companion";
import type { CardRecord } from "../lib/types";
import type { DeckEntry, ValidationResult } from "../lib/legality";
import type { CompanionCheckResult } from "../lib/companion";

export interface DeckState {
  deckId: string | null;
  deckName: string;
  entries: DeckEntry[];
  validation: ValidationResult;
  companionCheck: CompanionCheckResult | null;

  addCard: (card: CardRecord, board: "main" | "side") => void;
  removeCard: (oracleId: string, board: "main" | "side") => void;
  setQuantity: (oracleId: string, board: "main" | "side", qty: number) => void;
  moveCard: (oracleId: string, from: "main" | "side", to: "main" | "side") => void;
  clearDeck: () => void;
  setDeckName: (name: string) => void;
}

function revalidate(
  entries: DeckEntry[]
): { validation: ValidationResult; companionCheck: CompanionCheckResult | null } {
  const validation = validateDeck(entries);
  const sideCards = entries
    .filter(e => e.board === "side")
    .flatMap(e => Array(e.quantity).fill(e.card) as CardRecord[]);
  const mainCards = entries
    .filter(e => e.board === "main")
    .flatMap(e => Array(e.quantity).fill(e.card) as CardRecord[]);
  const companionCheck = checkCompanionRestriction(sideCards, mainCards);
  return { validation, companionCheck };
}

export const useDeckStore = create<DeckState>((set, get) => ({
  deckId: null,
  deckName: "New Deck",
  entries: [],
  validation: {
    legal: false,
    mainCount: 0,
    sideCount: 0,
    violations: [{ rule: "MIN_60", message: "Mainboard has 0 cards — minimum is 60." }]
  },
  companionCheck: null,

  addCard(card, board) {
    const { entries } = get();
    const existing = entries.find(e => e.card.oracleId === card.oracleId && e.board === board);
    const isBasic = BASIC_LAND_NAMES.has(card.name);
    const maxCopies = isBasic ? 99 : 4;

    let updated: DeckEntry[];
    if (existing) {
      if (existing.quantity >= maxCopies) return;
      updated = entries.map(e =>
        e.card.oracleId === card.oracleId && e.board === board
          ? { ...e, quantity: e.quantity + 1 }
          : e
      );
    } else {
      updated = [...entries, { card, quantity: 1, board }];
    }

    set({ entries: updated, ...revalidate(updated) });
  },

  removeCard(oracleId, board) {
    const { entries } = get();
    const existing = entries.find(e => e.card.oracleId === oracleId && e.board === board);
    if (!existing) return;

    let updated: DeckEntry[];
    if (existing.quantity <= 1) {
      updated = entries.filter(e => !(e.card.oracleId === oracleId && e.board === board));
    } else {
      updated = entries.map(e =>
        e.card.oracleId === oracleId && e.board === board
          ? { ...e, quantity: e.quantity - 1 }
          : e
      );
    }

    set({ entries: updated, ...revalidate(updated) });
  },

  setQuantity(oracleId, board, qty) {
    const { entries } = get();
    const cardName = entries.find(e => e.card.oracleId === oracleId)?.card.name;
    const maxCopies = cardName && BASIC_LAND_NAMES.has(cardName) ? 99 : 4;
    const clampedQty = Math.max(0, Math.min(qty, maxCopies));

    let updated: DeckEntry[];
    if (clampedQty === 0) {
      updated = entries.filter(e => !(e.card.oracleId === oracleId && e.board === board));
    } else {
      const exists = entries.some(e => e.card.oracleId === oracleId && e.board === board);
      if (!exists) return;
      updated = entries.map(e =>
        e.card.oracleId === oracleId && e.board === board
          ? { ...e, quantity: clampedQty }
          : e
      );
    }

    set({ entries: updated, ...revalidate(updated) });
  },

  moveCard(oracleId, from, to) {
    const { entries } = get();
    const entry = entries.find(e => e.card.oracleId === oracleId && e.board === from);
    if (!entry) return;

    const withoutSource = entries.filter(
      e => !(e.card.oracleId === oracleId && e.board === from)
    );
    const destExisting = withoutSource.find(e => e.card.oracleId === oracleId && e.board === to);
    const isBasic = BASIC_LAND_NAMES.has(entry.card.name);
    const maxCopies = isBasic ? 99 : 4;

    let updated: DeckEntry[];
    if (destExisting) {
      updated = withoutSource.map(e =>
        e.card.oracleId === oracleId && e.board === to
          ? { ...e, quantity: Math.min(e.quantity + entry.quantity, maxCopies) }
          : e
      );
    } else {
      updated = [...withoutSource, { ...entry, board: to }];
    }

    set({ entries: updated, ...revalidate(updated) });
  },

  clearDeck() {
    const entries: DeckEntry[] = [];
    set({ entries, ...revalidate(entries) });
  },

  setDeckName(name) {
    set({ deckName: name });
  }
}));
