import type { DeckEntry } from "./legality";
import { getRoleComposition, ARCHETYPE_BENCHMARKS, detectArchetype } from "./archetype";
import { db } from "./db";
import { computeSynergy } from "./synergy";
import { computePowerSignal } from "./powerSignal";
import type { CardRecord } from "./types";

export interface MissingReport {
  gap: string;
  message: string;
  suggestions: CardRecord[];
}

export async function getWhatsMissing(entries: DeckEntry[]): Promise<MissingReport[]> {
  const { archetype } = detectArchetype(entries);
  const comp = getRoleComposition(entries);
  const bench = ARCHETYPE_BENCHMARKS[archetype];
  const reports: MissingReport[] = [];

  const colorSet = new Set<string>();
  for (const e of entries) {
    const ci: string[] = JSON.parse(e.card.colorIdentityJson || "[]");
    ci.forEach((c) => colorSet.add(c));
  }
  const colors = [...colorSet];

  async function topCards(textFilter: (t: string) => boolean, n = 5): Promise<CardRecord[]> {
    let pool = await db.cards.where("legalityStandard").equals("legal").toArray();
    pool = pool.filter((c) => {
      const ci: string[] = JSON.parse(c.colorIdentityJson || "[]");
      return ci.every((col) => colors.includes(col)) && textFilter((c.oracleText ?? "").toLowerCase());
    });
    return pool
      .map((c) => ({ c, score: computePowerSignal(c, computeSynergy(c, entries).score).cardScore }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map(({ c }) => c);
  }

  // Removal gap
  if (comp.removal < (bench.removal ?? 6) * 0.6) {
    const sug = await topCards((t) => t.includes("destroy target") || t.includes("exile target"));
    reports.push({
      gap: "Removal",
      message: `Removal package below target for ${archetype}. Have ${comp.removal}, recommend ${bench.removal}.`,
      suggestions: sug,
    });
  }

  // Counterspell gap (control)
  if (archetype === "Control" && comp.counterspells < 4) {
    const sug = await topCards((t) => t.includes("counter target spell"));
    reports.push({
      gap: "Counterspells",
      message: `Only ${comp.counterspells} counterspells — Control should run ${bench.counterspells ?? 8}–12. Top options:`,
      suggestions: sug,
    });
  }

  // Card draw gap
  if (comp.cardDraw < 4) {
    const sug = await topCards((t) => t.includes("draw a card") || t.includes("draw two"));
    reports.push({
      gap: "Card Draw",
      message: `Only ${comp.cardDraw} card-draw sources — risk of running out of gas. Recommend 6–10.`,
      suggestions: sug,
    });
  }

  // No enchantment answer in sideboard
  const hasEncAnswer = entries.some(
    (e) => e.board === "side" && (
      (e.card.oracleText ?? "").toLowerCase().includes("destroy target enchantment") ||
      (e.card.oracleText ?? "").toLowerCase().includes("exile target enchantment")
    )
  );
  if (!hasEncAnswer) {
    const sug = await topCards((t) => t.includes("destroy target enchantment") || t.includes("exile target enchantment"));
    reports.push({
      gap: "Enchantment Hate",
      message: "No enchantment removal in sideboard — vulnerable to enchantment-based strategies.",
      suggestions: sug,
    });
  }

  // No GY hate in sideboard
  const hasGYHate = entries.some(
    (e) => e.board === "side" &&
      (e.card.oracleText ?? "").toLowerCase().includes("exile") &&
      (e.card.oracleText ?? "").toLowerCase().includes("graveyard")
  );
  if (!hasGYHate) {
    const sug = await topCards((t) => t.includes("exile") && t.includes("graveyard"));
    reports.push({
      gap: "Graveyard Hate",
      message: "No graveyard hate in sideboard — vulnerable to Graveyard/Reanimator strategies.",
      suggestions: sug,
    });
  }

  return reports;
}
