import type { DeckEntry } from "./legality";
import type { CardRecord } from "./types";

export interface ComboResult {
  cardA: CardRecord;
  cardB: CardRecord;
  effect: string;
  confidence: "high" | "medium" | "low";
}

// Extract trigger clauses from oracle text
function extractTriggers(text: string): string[] {
  const triggers: string[] = [];
  const re = /whenever ([^,\.;]{4,60})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    triggers.push(m[1].trim().toLowerCase());
  }
  return triggers;
}

function extractTriggerConditions(text: string): string[] {
  const conditions: string[] = [];
  const re = /(?:when|whenever|at the beginning of) ([^,\.;]{4,60})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    conditions.push(m[1].trim().toLowerCase());
  }
  return conditions;
}

function sharesTokenType(textA: string, textB: string): string | null {
  const tokenRe = /create[^.]*?(\w+) token/gi;
  const typesA = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(textA)) !== null) typesA.add(m[1].toLowerCase());
  tokenRe.lastIndex = 0;
  const tokenTypes = Array.from(typesA);
  for (const t of tokenTypes) {
    if (textB.includes(t) && textB.includes("token")) return t;
  }
  return null;
}

export function findCombos(entries: DeckEntry[]): ComboResult[] {
  const combos: ComboResult[] = [];
  const cards = entries.map((e) => e.card);

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i];
      const b = cards[j];
      const textA = (a.oracleText ?? "").toLowerCase();
      const textB = (b.oracleText ?? "").toLowerCase();

      // 1. Shared trigger chain: A triggers on event that B produces
      const triggersA = extractTriggers(textA);
      const triggersB = extractTriggers(textB);
      const condA = extractTriggerConditions(textA);
      const condB = extractTriggerConditions(textB);

      for (const trig of triggersA) {
        if (textB.includes(trig.substring(0, Math.min(20, trig.length)))) {
          combos.push({
            cardA: a, cardB: b,
            effect: `${a.name} triggers whenever "${trig}" — ${b.name} can produce this event.`,
            confidence: "high",
          });
        }
      }

      for (const trig of triggersB) {
        if (textA.includes(trig.substring(0, Math.min(20, trig.length)))) {
          combos.push({
            cardA: b, cardB: a,
            effect: `${b.name} triggers whenever "${trig}" — ${a.name} can produce this event.`,
            confidence: "high",
          });
        }
      }

      // 2. Token synergy
      const tokenMatch = sharesTokenType(textA, textB) ?? sharesTokenType(textB, textA);
      if (tokenMatch) {
        combos.push({
          cardA: a, cardB: b,
          effect: `${a.name} creates ${tokenMatch} tokens — ${b.name} benefits from ${tokenMatch} tokens.`,
          confidence: "medium",
        });
      }

      // 3. Win-the-game combos: A says "win the game" and B enables a condition
      if (textA.includes("win the game") && (textB.includes("each turn") || textB.includes("infinite"))) {
        combos.push({
          cardA: a, cardB: b,
          effect: `${a.name} can win the game; ${b.name} may enable the required condition.`,
          confidence: "low",
        });
      }

      // 4. Sacrifice loops: A is an outlet, B is a recursion engine
      if (
        textA.includes("sacrifice a creature") &&
        (textB.includes("return") && textB.includes("from your graveyard"))
      ) {
        combos.push({
          cardA: a, cardB: b,
          effect: `${a.name} sacrifices creatures; ${b.name} returns them from the graveyard — potential value loop.`,
          confidence: "medium",
        });
      }

      // 5. Copy + ETB
      if (
        (textA.includes("copy") && textA.includes("enters")) &&
        textB.includes("enters the battlefield")
      ) {
        combos.push({
          cardA: a, cardB: b,
          effect: `${a.name} copies permanents; ${b.name} has a powerful ETB that could be doubled.`,
          confidence: "medium",
        });
      }
    }
  }

  // Deduplicate by cardA.id + cardB.id
  const seen = new Set<string>();
  return combos.filter((c) => {
    const key = [c.cardA.id, c.cardB.id].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
