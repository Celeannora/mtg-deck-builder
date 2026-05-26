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
import { detectArchetype } from "./archetype";

// Map archetype detection result to the ArchetypeCurveProfile expected by manaBase
function toArchetypeCurveProfile(arch: string): ArchetypeCurveProfile {
  switch (arch) {
    case "Aggro":     return "aggro";
    case "Burn":      return "aggro";  // Burn is an aggro-style curve
    case "Control":   return "control";
    case "Ramp":      return "ramp";
    case "Combo":     return "combo";
    case "Midrange":  return "midrange";
    case "Tempo":     return "midrange"; // Tempo sits between aggro/midrange
    case "Tokens":    return "midrange";
    case "Graveyard": return "midrange";
    case "Sacrifice": return "midrange";
    default:          return "midrange";
  }
}

export interface ManaBaseAnalysis {
  landRec: LandRecommendation;
  colorSources: ColorSourceRecommendation[];
  dualSuggestions: DualLandSuggestion[];
  curve: CurveSlot[];
  avgMV: number;
  castabilityWarnings: CastabilityWarning[];
  archetypeProfile: ArchetypeCurveProfile;
  detectedArchetype: string;
  archetypeConfidence: number;
  archetypeSignals: string[];
}

interface ManaBaseState {
  analysis: ManaBaseAnalysis | null;
  loading: boolean;
  // archetypeProfile is now optional — if omitted, it is auto-detected from entries
  compute: (entries: DeckEntry[], archetypeProfile?: ArchetypeCurveProfile) => Promise<void>;
}

export const useManaBaseStore = create<ManaBaseState>((set) => ({
  analysis: null,
  loading: false,

  async compute(entries, archetypeProfile) {
    set({ loading: true });

    // Auto-detect archetype from the deck if no explicit profile is provided
    const detection = detectArchetype(entries);
    const resolvedProfile: ArchetypeCurveProfile =
      archetypeProfile ?? toArchetypeCurveProfile(detection.archetype);

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
        archetypeProfile: resolvedProfile,
        detectedArchetype: detection.archetype,
        archetypeConfidence: detection.confidence,
        archetypeSignals: detection.signals,
      }
    });
  }
}));
