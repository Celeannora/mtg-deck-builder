import { create } from "zustand";
import { db } from "./db";
import type { CardRecord } from "./types";
import type { DeckEntry } from "./legality";
import {
  recommendLandCount,
  recommendColorSources,
  recommendDualLands,
  buildManaCurve,
  computeCastabilityWarnings,
  type LandRecommendation,
  type ColorSourceRecommendation,
  type DualLandSuggestion,
  type CurveSlot,
  type CastabilityWarning,
  type ArchetypeCurveProfile
} from "./manaBase";

export interface ManaBaseAnalysis {
  landRec: LandRecommendation;
  colorSources: ColorSourceRecommendation[];
  dualSuggestions: DualLandSuggestion[];
  curve: CurveSlot[];
  avgMV: number;
  castabilityWarnings: CastabilityWarning[];
  archetypeProfile: ArchetypeCurveProfile;
}

interface ManaBaseState {
  analysis: ManaBaseAnalysis | null;
  loading: boolean;
  compute: (entries: DeckEntry[], archetypeProfile?: ArchetypeCurveProfile) => Promise<void>;
}

export const useManaBaseStore = create<ManaBaseState>((set) => ({
  analysis: null,
  loading: false,

  async compute(entries, archetypeProfile = "midrange") {
    set({ loading: true });

    const landRec = recommendLandCount(entries);
    const totalCards = entries.reduce((s, e) => s + e.quantity, 0);
    const deckSize = totalCards;

    // Derive active colors from color identity of nonland cards
    const colorSet = new Set<"W" | "U" | "B" | "R" | "G">();
    for (const entry of entries.filter(e => !e.card.typeLine.includes("Land"))) {
      const ci: string[] = JSON.parse(entry.card.colorIdentityJson || "[]");
      for (const c of ci) {
        if (["W", "U", "B", "R", "G"].includes(c)) {
          colorSet.add(c as "W" | "U" | "B" | "R" | "G");
        }
      }
    }
    const activeColors = [...colorSet];

    const colorSources = recommendColorSources(entries, landRec.recommended);

    // Load all Standard-legal lands from DB for dual recommendations
    let allLands: CardRecord[] = [];
    try {
      allLands = await db.cards
        .where("legalityStandard")
        .equals("legal")
        .filter(c => c.typeLine.includes("Land"))
        .toArray();
    } catch {
      allLands = [];
    }

    const dualSuggestions = recommendDualLands(allLands, activeColors, landRec.recommended);
    const curve = buildManaCurve(entries);

    const nonlandTotal = entries
      .filter(e => !e.card.typeLine.includes("Land"))
      .reduce((s, e) => s + e.quantity, 0);
    const totalCmc = entries
      .filter(e => !e.card.typeLine.includes("Land"))
      .reduce((s, e) => s + e.card.cmc * e.quantity, 0);
    const avgMV = nonlandTotal > 0 ? Math.round((totalCmc / nonlandTotal) * 100) / 100 : 0;

    const castabilityWarnings = computeCastabilityWarnings(entries, deckSize);

    set({
      loading: false,
      analysis: {
        landRec,
        colorSources,
        dualSuggestions,
        curve,
        avgMV,
        castabilityWarnings,
        archetypeProfile
      }
    });
  }
}));
