/**
 * Phase 2 — Deck Store (Zustand)
 *
 * Central state for the active deck being built.
 * All deck mutations go through this store; the validation engine runs
 * synchronously on every mutation and the result is always current.
 */

import { create } from "zustand";
import { validateDeck, type DeckEntry, type ValidationResult } from "../lib/legality";
import type { CardRecord } from "../lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Deck {
  id: string;
  name: string;
  archetypeTag: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface DeckState {
  deck: Deck;
  entries: DeckEntry[];
  validation: ValidationResult;

  // Mutations
  setDeckMeta: (meta: Partial<Omit<Deck, "id" | "createdAt">>) => void;
  addCard: (card: CardRecord, zone?: "mainboard" | "sideboard", quantity?: number) => void;
  removeCard: (oracleId: string, zone: "mainboard" | "sideboard", quantity?: number) => void;
  removeAllCopies: (oracleId: string, zone?: "mainboard" | "sideboard" | "all") => void;
  moveToSideboard: (oracleId: string) => void;
  moveToMainboard: (oracleId: string) => void;
  importEntries: (entries: DeckEntry[]) => void;
  clearDeck: () => void;
  newDeck: (name?: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeDeck(name = "Untitled Deck"): Deck {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    archetypeTag: null,
    createdAt: now,
    updatedAt: now,
    notes: "",
  };
}

const EMPTY_VALIDATION: ValidationResult = {
  legal: false,
  mainboardCount: 0,
  sideboardCount: 0,
  violations: [
    {
      code: "MIN_60",
      severity: "error",
      message: "Mainboard has 0 cards. Minimum is 60.",
    },
  ],
  warnings: [],
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDeckStore = create<DeckState>((set, get) => ({
  deck: makeDeck(),
  entries: [],
  validation: EMPTY_VALIDATION,

  setDeckMeta(meta) {
    set((s) => ({
      deck: { ...s.deck, ...meta, updatedAt: new Date().toISOString() },
    }));
  },

  addCard(card, zone = "mainboard", quantity = 1) {
    set((s) => {
      const existing = s.entries.find(
        (e) => e.card.oracleId === card.oracleId && e.zone === zone
      );

      let nextEntries: DeckEntry[];

      if (existing) {
        nextEntries = s.entries.map((e) =>
          e.card.oracleId === card.oracleId && e.zone === zone
            ? { ...e, quantity: e.quantity + quantity }
            : e
        );
      } else {
        nextEntries = [...s.entries, { card, quantity, zone }];
      }

      return {
        entries: nextEntries,
        validation: validateDeck(nextEntries),
        deck: { ...s.deck, updatedAt: new Date().toISOString() },
      };
    });
  },

  removeCard(oracleId, zone, quantity = 1) {
    set((s) => {
      const nextEntries = s.entries
        .map((e) =>
          e.card.oracleId === oracleId && e.zone === zone
            ? { ...e, quantity: e.quantity - quantity }
            : e
        )
        .filter((e) => e.quantity > 0);

      return {
        entries: nextEntries,
        validation: validateDeck(nextEntries),
        deck: { ...s.deck, updatedAt: new Date().toISOString() },
      };
    });
  },

  removeAllCopies(oracleId, zone = "all") {
    set((s) => {
      const nextEntries = s.entries.filter(
        (e) =>
          !(e.card.oracleId === oracleId && (zone === "all" || e.zone === zone))
      );

      return {
        entries: nextEntries,
        validation: validateDeck(nextEntries),
        deck: { ...s.deck, updatedAt: new Date().toISOString() },
      };
    });
  },

  moveToSideboard(oracleId) {
    set((s) => {
      const nextEntries = s.entries.map((e) =>
        e.card.oracleId === oracleId && e.zone === "mainboard"
          ? { ...e, zone: "sideboard" as const }
          : e
      );
      return {
        entries: nextEntries,
        validation: validateDeck(nextEntries),
        deck: { ...s.deck, updatedAt: new Date().toISOString() },
      };
    });
  },

  moveToMainboard(oracleId) {
    set((s) => {
      const nextEntries = s.entries.map((e) =>
        e.card.oracleId === oracleId && e.zone === "sideboard"
          ? { ...e, zone: "mainboard" as const }
          : e
      );
      return {
        entries: nextEntries,
        validation: validateDeck(nextEntries),
        deck: { ...s.deck, updatedAt: new Date().toISOString() },
      };
    });
  },

  importEntries(entries) {
    set((s) => ({
      entries,
      validation: validateDeck(entries),
      deck: { ...s.deck, updatedAt: new Date().toISOString() },
    }));
  },

  clearDeck() {
    set((s) => ({
      entries: [],
      validation: EMPTY_VALIDATION,
      deck: { ...s.deck, updatedAt: new Date().toISOString() },
    }));
  },

  newDeck(name) {
    set({
      deck: makeDeck(name),
      entries: [],
      validation: EMPTY_VALIDATION,
    });
  },
}));
