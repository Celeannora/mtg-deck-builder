// Re-export shim: components import from "../lib/deckStore" but the
// real store lives at "../store/deckStore". This file bridges the gap.
export * from "../store/deckStore";
