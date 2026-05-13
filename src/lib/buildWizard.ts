import { db } from "./db";
import type { CardRecord } from "./types";
import type { Archetype } from "./archetype";
import { ARCHETYPE_BENCHMARKS } from "./archetype";
import { assignRoles, isThreat, isInteraction, isSupport } from "./roles";
import { computeSynergy } from "./synergy";
import { computePowerSignal } from "./powerSignal";
import { recommendLandCount } from "./manaBase";
import type { DeckEntry } from "./legality";

export interface WizardInput {
  archetype: Archetype;
  colors: string[];          // e.g. ["W","U"]
  budgetUsd: number | null;  // null = no cap
  anchorCardIds: string[];   // pinned cards
}

export interface WizardResult {
  entries: DeckEntry[];
  warnings: string[];
}

function entryMap(entries: DeckEntry[]): Map<string, DeckEntry> {
  return new Map(entries.map((e) => [e.card.id, e]));
}

function totalMain(entries: DeckEntry[]): number {
  return entries.filter((e) => e.board === "main").reduce((s, e) => s + e.quantity, 0);
}

function addCard(entries: DeckEntry[], card: CardRecord, qty: number, board: "main" | "side"): DeckEntry[] {
  const existing = entries.find((e) => e.card.id === card.id && e.board === board);
  if (existing) {
    return entries.map((e) =>
      e.card.id === card.id && e.board === board ? { ...e, quantity: e.quantity + qty } : e
    );
  }
  return [...entries, { card, quantity: qty, board }];
}

async function fetchCandidates(colors: string[], budgetUsd: number | null): Promise<CardRecord[]> {
  let query = db.cards.where("legalityStandard").equals("legal");
  let cards = await query.toArray();

  // Filter by color identity
  cards = cards.filter((c) => {
    const ci: string[] = JSON.parse(c.colorIdentityJson || "[]");
    return ci.every((col) => colors.includes(col));
  });

  // Filter by budget
  if (budgetUsd !== null) {
    cards = cards.filter((c) => c.priceUsd === null || c.priceUsd <= budgetUsd);
  }

  return cards;
}

function scoreCard(card: CardRecord, currentEntries: DeckEntry[]): number {
  const syn = computeSynergy(card, currentEntries);
  const pw  = computePowerSignal(card, syn.score);
  return pw.cardScore;
}

function fillSlots(
  candidates: CardRecord[],
  entries: DeckEntry[],
  roleFilter: (roles: ReturnType<typeof assignRoles>) => boolean,
  target: number,
  maxPerCard: number
): DeckEntry[] {
  let result = [...entries];
  const used = new Set(result.map((e) => e.card.id));

  const pool = candidates
    .filter((c) => !used.has(c.id) && roleFilter(assignRoles(c)))
    .sort((a, b) => scoreCard(b, result) - scoreCard(a, result));

  for (const card of pool) {
    if (totalMain(result) >= target) break;
    const qty = Math.min(maxPerCard, target - totalMain(result), 4);
    result = addCard(result, card, qty, "main");
    used.add(card.id);
  }
  return result;
}

function synergyOptimizationPass(
  candidates: CardRecord[],
  entries: DeckEntry[],
  passes: number
): DeckEntry[] {
  let result = [...entries];
  for (let p = 0; p < passes; p++) {
    const mainEntries = result.filter((e) => e.board === "main");
    for (const entry of mainEntries) {
      const isAnchor = entry.card.typeLine.includes("Basic Land");
      if (isAnchor) continue;

      const currentScore = scoreCard(entry.card, result.filter((e) => e !== entry));
      const alternatives = candidates
        .filter((c) => c.id !== entry.card.id && !result.some((e) => e.card.id === c.id))
        .sort((a, b) => scoreCard(b, result) - scoreCard(a, result))
        .slice(0, 5);

      for (const alt of alternatives) {
        const altScore = scoreCard(alt, result.filter((e) => e !== entry));
        if (altScore > currentScore + 0.5) {
          result = result.map((e) =>
            e === entry ? { ...e, card: alt } : e
          );
          break;
        }
      }
    }
  }
  return result;
}

async function buildManaBase(
  entries: DeckEntry[],
  colors: string[],
  candidates: CardRecord[]
): Promise<DeckEntry[]> {
  let result = [...entries];
  const nonLandEntries = result.filter((e) => e.board === "main" && !e.card.typeLine.includes("Land"));
  const totalNonLand = nonLandEntries.reduce((s, e) => s + e.quantity, 0);
  const avgCmc = totalNonLand > 0
    ? nonLandEntries.reduce((s, e) => s + e.card.cmc * e.quantity, 0) / totalNonLand
    : 2.5;

  const landCount = recommendLandCount(avgCmc, 0, 0);
  const target = Math.round(landCount);
  const currentLands = result.filter((e) => e.board === "main" && e.card.typeLine.includes("Land")).reduce((s, e) => s + e.quantity, 0);
  const needed = target - currentLands;
  if (needed <= 0) return result;

  // Try to add dual lands first
  const duals = candidates
    .filter((c) => {
      const tl = c.typeLine;
      return tl.includes("Land") && !tl.includes("Basic") && c.legalityStandard === "legal";
    })
    .filter((c) => !result.some((e) => e.card.id === c.id))
    .slice(0, Math.min(8, needed));

  for (const dual of duals) {
    if (totalMain(result) >= 60) break;
    result = addCard(result, dual, 4, "main");
  }

  // Fill remaining with basics
  const basicNames: Record<string, string> = {
    W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest"
  };
  for (const color of colors) {
    const basicName = basicNames[color];
    if (!basicName) continue;
    const basic = await db.cards
      .where("name").equals(basicName)
      .filter((c) => c.typeLine.includes("Basic"))
      .first();
    if (!basic) continue;
    const stillNeeded = target - result.filter((e) => e.board === "main" && e.card.typeLine.includes("Land")).reduce((s, e) => s + e.quantity, 0);
    if (stillNeeded <= 0) break;
    const perColor = Math.ceil(stillNeeded / colors.length);
    result = addCard(result, basic, perColor, "main");
  }

  return result;
}

async function buildSideboard(
  mainEntries: DeckEntry[],
  candidates: CardRecord[]
): Promise<DeckEntry[]> {
  const side: DeckEntry[] = [];
  const used = new Set(mainEntries.map((e) => e.card.id));

  const addSide = (card: CardRecord, qty: number) => {
    if (!used.has(card.id) && side.reduce((s, e) => s + e.quantity, 0) + qty <= 15) {
      side.push({ card, quantity: qty, board: "side" });
      used.add(card.id);
    }
  };

  // Graveyard hate
  const gyHate = candidates.filter((c) =>
    (c.oracleText ?? "").toLowerCase().includes("exile") &&
    (c.oracleText ?? "").toLowerCase().includes("graveyard") &&
    !used.has(c.id)
  ).slice(0, 2);
  gyHate.forEach((c) => addSide(c, 2));

  // Enchantment/artifact removal
  const encRemoval = candidates.filter((c) => {
    const t = (c.oracleText ?? "").toLowerCase();
    return (t.includes("destroy target enchantment") || t.includes("exile target artifact") || t.includes("destroy target artifact")) && !used.has(c.id);
  }).slice(0, 2);
  encRemoval.forEach((c) => addSide(c, 2));

  // Anti-aggro
  const sweepers = candidates.filter((c) => {
    const roles = assignRoles(c);
    return roles.includes("BoardWipe") && !used.has(c.id);
  }).slice(0, 1);
  sweepers.forEach((c) => addSide(c, 2));

  // Extra interaction (removal)
  const extraRemoval = candidates.filter((c) => {
    const roles = assignRoles(c);
    return roles.includes("Removal") && !used.has(c.id);
  }).slice(0, 2);
  extraRemoval.forEach((c) => addSide(c, 2));

  // Fill remaining with high-scored support
  const remaining = 15 - side.reduce((s, e) => s + e.quantity, 0);
  if (remaining > 0) {
    const fill = candidates.filter((c) => !used.has(c.id))
      .sort((a, b) => (b.edhrecRank ?? 99999) < (a.edhrecRank ?? 99999) ? 1 : -1)
      .slice(0, 5);
    let left = remaining;
    for (const c of fill) {
      if (left <= 0) break;
      const qty = Math.min(2, left);
      addSide(c, qty);
      left -= qty;
    }
  }

  return side;
}

export async function runBuildWizard(input: WizardInput): Promise<WizardResult> {
  const warnings: string[] = [];
  const bench = ARCHETYPE_BENCHMARKS[input.archetype];

  const candidates = await fetchCandidates(input.colors, input.budgetUsd);
  if (candidates.length < 20) {
    warnings.push("Very few cards match the selected color/budget. Widening selection.");
  }

  // Step 1: Anchor cards
  let entries: DeckEntry[] = [];
  for (const id of input.anchorCardIds) {
    const card = await db.cards.get(id);
    if (card) entries = addCard(entries, card, 4, "main");
  }

  // Step 2: Fill threats
  entries = fillSlots(candidates, entries, isThreat, (bench.threats ?? 18) + totalMain(entries), 4);

  // Step 3: Fill interaction
  entries = fillSlots(candidates, entries, isInteraction, (bench.threats ?? 18) + (bench.removal ?? 8) + totalMain(entries.filter(e => e.board !== "main")), 4);

  // Step 4: Fill support
  entries = fillSlots(candidates, entries, isSupport, 36 + totalMain(entries.filter(e => e.board !== "main")), 4);

  // Step 5: Synergy optimization — 3 passes
  entries = synergyOptimizationPass(candidates, entries, 3);

  // Step 6: Mana base
  entries = await buildManaBase(entries, input.colors, candidates);

  // Step 7: Pad to 60 if short
  if (totalMain(entries) < 60) {
    const remaining = 60 - totalMain(entries);
    const pad = candidates
      .filter((c) => !entries.some((e) => e.card.id === c.id) && !c.typeLine.includes("Land"))
      .sort((a, b) => scoreCard(b, entries) - scoreCard(a, entries))
      .slice(0, remaining);
    for (const c of pad) entries = addCard(entries, c, 1, "main");
  }

  // Step 8: Sideboard
  const side = await buildSideboard(entries.filter((e) => e.board === "main"), candidates);
  entries = [...entries, ...side];

  return { entries, warnings };
}
