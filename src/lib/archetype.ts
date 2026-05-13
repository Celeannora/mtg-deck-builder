import type { CardRecord } from "./types";
import { assignRoles, type CardRole } from "./roles";

export type Archetype =
  | "Aggro"
  | "Burn"
  | "Midrange"
  | "Control"
  | "Combo"
  | "Tempo"
  | "Ramp"
  | "Tokens"
  | "Graveyard"
  | "Sacrifice"
  | "Unknown";

export interface ArchetypeBenchmark {
  threats: [number, number];
  removal: [number, number];
  cardDraw: [number, number];
  counterspells: [number, number];
  lands: [number, number];
}

export const BENCHMARKS: Record<Archetype, ArchetypeBenchmark> = {
  Aggro:     { threats: [24, 28], removal: [4, 8],   cardDraw: [0, 4],   counterspells: [0, 2],  lands: [20, 22] },
  Burn:      { threats: [20, 24], removal: [8, 12],  cardDraw: [0, 4],   counterspells: [0, 2],  lands: [20, 22] },
  Midrange:  { threats: [16, 20], removal: [8, 12],  cardDraw: [4, 8],   counterspells: [0, 4],  lands: [22, 24] },
  Control:   { threats: [6, 10],  removal: [12, 16], cardDraw: [10, 14], counterspells: [8, 12], lands: [24, 26] },
  Combo:     { threats: [8, 12],  removal: [4, 8],   cardDraw: [4, 8],   counterspells: [0, 4],  lands: [22, 24] },
  Tempo:     { threats: [16, 20], removal: [6, 10],  cardDraw: [4, 8],   counterspells: [4, 8],  lands: [20, 22] },
  Ramp:      { threats: [8, 14],  removal: [4, 8],   cardDraw: [4, 8],   counterspells: [0, 4],  lands: [24, 27] },
  Tokens:    { threats: [16, 22], removal: [4, 8],   cardDraw: [4, 8],   counterspells: [0, 4],  lands: [22, 24] },
  Graveyard: { threats: [12, 18], removal: [4, 8],   cardDraw: [4, 8],   counterspells: [0, 4],  lands: [22, 24] },
  Sacrifice: { threats: [16, 22], removal: [6, 10],  cardDraw: [4, 8],   counterspells: [0, 4],  lands: [22, 24] },
  Unknown:   { threats: [10, 20], removal: [4, 12],  cardDraw: [2, 10],  counterspells: [0, 6],  lands: [20, 26] },
};

export interface RoleComposition {
  threats: number;
  removal: number;
  cardDraw: number;
  counterspells: number;
  boardWipes: number;
  ramp: number;
  lands: number;
  other: number;
}

export interface ArchetypeResult {
  archetype: Archetype;
  confidence: number;
  composition: RoleComposition;
  speedRating: "Turn 3-4 Kill" | "Turn 4-6 Midgame" | "Grindy / Late Game";
}

const THREAT_ROLES: CardRole[] = ["Beater", "Evasive Threat", "Finisher", "Value Engine", "Planeswalker"];

export function analyzeArchetype(
  cards: CardRecord[]
): ArchetypeResult {
  const roleMap = new Map<CardRole, number>();
  for (const card of cards) {
    const roles = assignRoles(card);
    for (const role of roles) {
      roleMap.set(role, (roleMap.get(role) ?? 0) + 1);
    }
  }

  const get = (role: CardRole) => roleMap.get(role) ?? 0;

  const composition: RoleComposition = {
    threats: THREAT_ROLES.reduce((sum, r) => sum + get(r), 0),
    removal: get("Removal"),
    cardDraw: get("Card Draw"),
    counterspells: get("Counterspell"),
    boardWipes: get("Board Wipe"),
    ramp: get("Ramp"),
    lands: get("Land"),
    other: 0,
  };
  composition.other =
    cards.length -
    composition.threats -
    composition.removal -
    composition.cardDraw -
    composition.counterspells -
    composition.ramp -
    composition.lands;

  // Auto-detect archetype
  let archetype: Archetype = "Unknown";
  let confidence = 0;

  const avmv =
    cards.filter((c) => !c.typeLine.includes("Land")).reduce((s, c) => s + c.cmc, 0) /
    Math.max(1, cards.filter((c) => !c.typeLine.includes("Land")).length);

  const tokenCards = cards.filter((c) =>
    /create.*token/i.test(c.oracleText ?? "")
  ).length;
  const graveyardCards = cards.filter((c) =>
    /from (your|a|target player's) graveyard|mill|discard.*creature/i.test(
      c.oracleText ?? ""
    )
  ).length;
  const sacrificeCards = cards.filter((c) =>
    /sacrifice a creature/i.test(c.oracleText ?? "")
  ).length;
  const directDamage = cards.filter((c) =>
    /damage to (any target|target player|each opponent)/i.test(c.oracleText ?? "")
  ).length;
  const rampCards = composition.ramp;
  const counters = composition.counterspells + composition.boardWipes;

  if (avmv <= 2.2 && composition.threats >= 20 && directDamage >= 6) {
    archetype = "Burn"; confidence = 0.85;
  } else if (avmv <= 2.4 && composition.threats >= 22) {
    archetype = "Aggro"; confidence = 0.8;
  } else if (counters >= 10 && composition.cardDraw >= 8) {
    archetype = "Control"; confidence = 0.8;
  } else if (rampCards >= 6 && avmv >= 3.0) {
    archetype = "Ramp"; confidence = 0.75;
  } else if (tokenCards >= 6) {
    archetype = "Tokens"; confidence = 0.7;
  } else if (graveyardCards >= 6) {
    archetype = "Graveyard"; confidence = 0.7;
  } else if (sacrificeCards >= 4) {
    archetype = "Sacrifice"; confidence = 0.7;
  } else if (composition.counterspells >= 4 && avmv <= 2.8) {
    archetype = "Tempo"; confidence = 0.65;
  } else if (avmv >= 2.5 && avmv <= 3.5) {
    archetype = "Midrange"; confidence = 0.6;
  } else {
    archetype = "Unknown"; confidence = 0.3;
  }

  const speedRating =
    archetype === "Aggro" || archetype === "Burn"
      ? "Turn 3-4 Kill"
      : archetype === "Control" || archetype === "Ramp"
      ? "Grindy / Late Game"
      : "Turn 4-6 Midgame";

  return { archetype, confidence, composition, speedRating };
}

export function getBenchmarkStatus(
  value: number,
  range: [number, number]
): "green" | "yellow" | "red" {
  if (value >= range[0] && value <= range[1]) return "green";
  if (value >= range[0] - 2 && value <= range[1] + 2) return "yellow";
  return "red";
}
