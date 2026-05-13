import { db } from "./db";
import { getMatchRecords } from "./bo3";

export interface MatchupRecord {
  opponentArchetype: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface MatchupStats extends MatchupRecord {
  total: number;
  winRate: number;
}

export async function getMatchupStats(deckId: string): Promise<MatchupStats[]> {
  const records = await getMatchRecords(deckId);
  const map = new Map<string, MatchupRecord>();

  for (const r of records) {
    const arch = r.opponentArchetype || "Unknown";
    const existing = map.get(arch) ?? { opponentArchetype: arch, wins: 0, losses: 0, draws: 0 };
    if (r.matchResult === "win") existing.wins++;
    else if (r.matchResult === "loss") existing.losses++;
    else existing.draws++;
    map.set(arch, existing);
  }

  return [...map.values()].map((m) => ({
    ...m,
    total: m.wins + m.losses + m.draws,
    winRate: m.wins + m.losses + m.draws > 0 ? m.wins / (m.wins + m.losses + m.draws) : 0,
  })).sort((a, b) => b.total - a.total);
}

export async function suggestTechCards(
  deckId: string,
  worstArchetype: string
): Promise<string[]> {
  // Placeholder: return generic tech suggestions based on archetype name
  const tips: Record<string, string[]> = {
    aggro:   ["Flame-Blessed Bolt", "Sheoldred, the Apocalypse", "Temporary Lockdown"],
    control: ["Duress", "Veil of Summer", "Urabrask, Heretic Praetor"],
    midrange:["Go for the Throat", "Sunfall", "Reckoner Bankbuster"],
    combo:   ["Haywire Mite", "Grafdigger's Cage", "Graveyard Trespasser"],
    ramp:    ["Breach the Multiverse", "Invasion of Zendikar", "Nissa, Resurgent Animist"],
  };
  const arch = worstArchetype.toLowerCase();
  for (const [key, cards] of Object.entries(tips)) {
    if (arch.includes(key)) return cards;
  }
  return ["Duress", "Negate", "Cut Down"];
}
