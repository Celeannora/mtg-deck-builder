import type { CardRecord } from "./types";

export type CardRole =
  | "Beater"
  | "Evasive Threat"
  | "Finisher"
  | "Value Engine"
  | "Planeswalker"
  | "Removal"
  | "Counterspell"
  | "Bounce"
  | "Discard"
  | "Board Wipe"
  | "Graveyard Hate"
  | "Card Draw"
  | "Tutor"
  | "Ramp"
  | "Land Fetch"
  | "Lifegain"
  | "Protection"
  | "Token Producer"
  | "Combo Piece"
  | "Land";

const patterns: Array<[CardRole, (card: CardRecord) => boolean]> = [
  ["Land", (c) => c.typeLine.toLowerCase().includes("land")],
  ["Planeswalker", (c) => c.typeLine.includes("Planeswalker")],
  [
    "Board Wipe",
    (c) =>
      /destroy all|exile all|each creature gets -/i.test(c.oracleText ?? ""),
  ],
  [
    "Counterspell",
    (c) => /counter target spell/i.test(c.oracleText ?? ""),
  ],
  [
    "Removal",
    (c) =>
      /destroy target|exile target|deals? \d+ damage to target creature/i.test(
        c.oracleText ?? ""
      ),
  ],
  [
    "Bounce",
    (c) => /return target.*to (its owner's hand|your hand)/i.test(c.oracleText ?? ""),
  ],
  [
    "Discard",
    (c) => /target player discards/i.test(c.oracleText ?? ""),
  ],
  [
    "Graveyard Hate",
    (c) =>
      /exile (target card|all cards) from (a|all|target player's) graveyard/i.test(
        c.oracleText ?? ""
      ),
  ],
  [
    "Tutor",
    (c) => /search your library for a card/i.test(c.oracleText ?? ""),
  ],
  [
    "Land Fetch",
    (c) => /search your library for a basic land/i.test(c.oracleText ?? ""),
  ],
  [
    "Ramp",
    (c) =>
      c.producedManaJson !== "[]" ||
      /add \{|search your library for a.*land.*put it onto the battlefield/i.test(
        c.oracleText ?? ""
      ),
  ],
  [
    "Card Draw",
    (c) => /draw (a|\d+|two|three) cards?/i.test(c.oracleText ?? ""),
  ],
  [
    "Lifegain",
    (c) => /gain \d+ life/i.test(c.oracleText ?? ""),
  ],
  [
    "Protection",
    (c) =>
      /hexproof|indestructible|ward|shroud|protection from/i.test(
        (c.oracleText ?? "") + c.keywordsJson
      ),
  ],
  [
    "Token Producer",
    (c) =>
      /create (a|\d+|two|three|four|five|x) .* token/i.test(c.oracleText ?? ""),
  ],
  [
    "Finisher",
    (c) =>
      c.cmc >= 5 &&
      (/win the game|each opponent loses/i.test(c.oracleText ?? "") ||
        Number(c.power ?? 0) >= 6),
  ],
  [
    "Evasive Threat",
    (c) =>
      c.typeLine.includes("Creature") &&
      /flying|menace|shadow|trample/i.test(
        (c.oracleText ?? "") + c.keywordsJson
      ) &&
      Number(c.power ?? 0) >= 3,
  ],
  [
    "Beater",
    (c) =>
      c.typeLine.includes("Creature") &&
      Number(c.power ?? 0) >= 3 &&
      c.cmc <= 3,
  ],
  [
    "Value Engine",
    (c) =>
      c.typeLine.includes("Creature") &&
      /when .* enters|whenever .* (attacks|deals damage|dies)/i.test(
        c.oracleText ?? ""
      ),
  ],
];

export function assignRoles(card: CardRecord): CardRole[] {
  return patterns.filter(([, test]) => test(card)).map(([role]) => role);
}

export function assignRolesJson(card: CardRecord): string {
  return JSON.stringify(assignRoles(card));
}
