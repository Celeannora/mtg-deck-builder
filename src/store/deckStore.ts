import { create } from "zustand";
import type { CardRecord } from "../lib/types";
import { validateDeck, type DeckEntry, type ValidationResult } from "../lib/legality";
import { analyzeArchetype, type ArchetypeResult } from "../lib/archetype";
import { computeManaCurve, recommendLandCount, type ManaCurve, type LandRecommendation } from "../lib/manaBase";
import { computeColorDistribution, type ColorDistribution } from "../lib/colorDistribution";

export interface DeckCard {
  card: CardRecord;
  quantity: number;
  board: "main" | "side";
  pinned?: boolean;
}

export interface DeckState {
  name: string;
  entries: DeckCard[];
  validation: ValidationResult | null;
  archetypeResult: ArchetypeResult | null;
  manaCurve: ManaCurve | null;
  landRec: LandRecommendation | null;
  colorDist: ColorDistribution | null;

  setName: (name: string) => void;
  addCard: (card: CardRecord, board?: "main" | "side") => void;
  removeCard: (oracleId: string, board: "main" | "side") => void;
  setQuantity: (oracleId: string, board: "main" | "side", qty: number) => void;
  moveCard: (oracleId: string, from: "main" | "side", to: "main" | "side") => void;
  togglePin: (oracleId: string, board: "main" | "side") => void;
  clearDeck: () => void;
  importDecklist: (text: string, cardLookup: (name: string) => CardRecord | undefined) => void;
  recompute: () => void;
}

function computeAll(entries: DeckCard[]) {
  const deckEntries: DeckEntry[] = entries.map((e) => ({
    card: e.card,
    quantity: e.quantity,
    board: e.board,
  }));
  const validation = validateDeck(deckEntries);
  const mainCards = entries
    .filter((e) => e.board === "main")
    .flatMap((e) => Array(e.quantity).fill(e.card) as CardRecord[]);
  const archetypeResult = analyzeArchetype(mainCards);
  const manaCurve = computeManaCurve(mainCards);
  const landRec = recommendLandCount(mainCards);
  const nonlands = mainCards.filter((c) => !c.typeLine.toLowerCase().includes("land"));
  const totalLands = mainCards.filter((c) => c.typeLine.toLowerCase().includes("land")).length;
  const colorDist = computeColorDistribution(nonlands, totalLands);
  return { validation, archetypeResult, manaCurve, landRec, colorDist };
}

export const useDeckStore = create<DeckState>((set, get) => ({
  name: "New Deck",
  entries: [],
  validation: null,
  archetypeResult: null,
  manaCurve: null,
  landRec: null,
  colorDist: null,

  setName: (name) => set({ name }),

  addCard: (card, board = "main") =>
    set((state) => {
      const existing = state.entries.find(
        (e) => e.card.oracleId === card.oracleId && e.board === board
      );
      let entries: DeckCard[];
      if (existing) {
        const isBasic =
          card.typeLine.includes("Basic") && card.typeLine.includes("Land");
        if (!isBasic && existing.quantity >= 4) return state;
        entries = state.entries.map((e) =>
          e.card.oracleId === card.oracleId && e.board === board
            ? { ...e, quantity: e.quantity + 1 }
            : e
        );
      } else {
        entries = [...state.entries, { card, quantity: 1, board }];
      }
      return { entries, ...computeAll(entries) };
    }),

  removeCard: (oracleId, board) =>
    set((state) => {
      const entries = state.entries.filter(
        (e) => !(e.card.oracleId === oracleId && e.board === board)
      );
      return { entries, ...computeAll(entries) };
    }),

  setQuantity: (oracleId, board, qty) =>
    set((state) => {
      const entries =
        qty <= 0
          ? state.entries.filter(
              (e) => !(e.card.oracleId === oracleId && e.board === board)
            )
          : state.entries.map((e) =>
              e.card.oracleId === oracleId && e.board === board
                ? { ...e, quantity: qty }
                : e
            );
      return { entries, ...computeAll(entries) };
    }),

  moveCard: (oracleId, from, to) =>
    set((state) => {
      const entries = state.entries.map((e) =>
        e.card.oracleId === oracleId && e.board === from ? { ...e, board: to } : e
      );
      return { entries, ...computeAll(entries) };
    }),

  togglePin: (oracleId, board) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.card.oracleId === oracleId && e.board === board
          ? { ...e, pinned: !e.pinned }
          : e
      ),
    })),

  clearDeck: () =>
    set({
      entries: [],
      validation: null,
      archetypeResult: null,
      manaCurve: null,
      landRec: null,
      colorDist: null,
    }),

  importDecklist: (text, cardLookup) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let board: "main" | "side" = "main";
    const entries: DeckCard[] = [];

    for (const line of lines) {
      if (line.startsWith("//")) {
        if (/sideboard/i.test(line)) board = "side";
        continue;
      }
      const match = line.match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/);
      if (!match) continue;
      const [, qtyStr, name] = match;
      const qty = parseInt(qtyStr, 10);
      const card = cardLookup(name.trim());
      if (!card) continue;
      const existing = entries.find(
        (e) => e.card.oracleId === card.oracleId && e.board === board
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        entries.push({ card, quantity: qty, board });
      }
    }

    set({ entries, ...computeAll(entries) });
  },

  recompute: () =>
    set((state) => ({ ...computeAll(state.entries) })),
}));
