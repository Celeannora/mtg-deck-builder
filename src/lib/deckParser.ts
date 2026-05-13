import { db } from "./db";
import type { CardRecord } from "./types";

export interface ParsedDeckEntry {
  quantity: number;
  cardName: string;
  setCode?: string;
  collectorNumber?: string;
  board: "main" | "side";
}

export interface ParsedDeck {
  mainboard: ParsedDeckEntry[];
  sideboard: ParsedDeckEntry[];
  unmatched: string[];
}

export interface ResolvedDeckEntry {
  quantity: number;
  card: CardRecord;
  board: "main" | "side";
}

export interface DeckImportResult {
  resolved: ResolvedDeckEntry[];
  unmatched: string[];
}

// Parse MTGO / Arena decklist text
export function parseDecklistText(raw: string): ParsedDeck {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const mainboard: ParsedDeckEntry[] = [];
  const sideboard: ParsedDeckEntry[] = [];
  const unmatched: string[] = [];
  let board: "main" | "side" = "main";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower === "deck" || lower === "mainboard") { board = "main"; continue; }
    if (lower === "sideboard" || lower === "side") { board = "side"; continue; }
    if (line.startsWith("//") || line.startsWith("#")) continue;

    const entry = parseArenaLine(line) ?? parseMTGOLine(line);
    if (!entry) { unmatched.push(line); continue; }
    entry.board = board;
    if (board === "main") mainboard.push(entry);
    else sideboard.push(entry);
  }

  return { mainboard, sideboard, unmatched };
}

function parseArenaLine(line: string): ParsedDeckEntry | null {
  // Arena format: "4 Lightning Bolt (M21) 150"
  const arenaRe = /^(\d+)\s+(.+?)\s+\((\w+)\)\s+(\d+)$/;
  const m = line.match(arenaRe);
  if (m) return { quantity: Number(m[1]), cardName: m[2].trim(), setCode: m[3].toLowerCase(), collectorNumber: m[4], board: "main" };
  return null;
}

function parseMTGOLine(line: string): ParsedDeckEntry | null {
  // MTGO format: "4 Lightning Bolt"
  const re = /^(\d+)x?\s+(.+)$/;
  const m = line.match(re);
  if (m) return { quantity: Number(m[1]), cardName: m[2].trim(), board: "main" };
  return null;
}

export async function resolveDeckEntries(entries: ParsedDeckEntry[]): Promise<DeckImportResult> {
  const resolved: ResolvedDeckEntry[] = [];
  const unmatched: string[] = [];

  for (const entry of entries) {
    const card = await fuzzyMatchCard(entry.cardName, entry.setCode);
    if (card) resolved.push({ quantity: entry.quantity, card, board: entry.board });
    else unmatched.push(`${entry.quantity} ${entry.cardName}`);
  }

  return { resolved, unmatched };
}

async function fuzzyMatchCard(name: string, setCode?: string): Promise<CardRecord | undefined> {
  // Exact match first
  let card = await db.cards.where("name").equalsIgnoreCase(name).first();
  if (card) return card;

  // Try with set constraint
  if (setCode) {
    card = await db.cards
      .where("name").equalsIgnoreCase(name)
      .and((c) => c.setCode === setCode)
      .first();
    if (card) return card;
  }

  // Partial match — starts with
  const lower = name.toLowerCase();
  card = await db.cards.filter((c) => c.name.toLowerCase().startsWith(lower)).first();
  if (card) return card;

  // Partial match — contains
  card = await db.cards.filter((c) => c.name.toLowerCase().includes(lower)).first();
  return card;
}
