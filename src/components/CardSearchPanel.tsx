import { useCallback, useEffect, useRef, useState } from "react";
import { searchCards, type SearchFilters } from "../lib/search";
import type { CardRecord } from "../lib/types";
import { useDeckStore } from "../store/deckStore";
import { computeSynergy } from "../lib/synergy";

const COLORS = ["W", "U", "B", "R", "G"];
const COLOR_LABEL: Record<string, string> = {
  W: "☀ White", U: "💧 Blue", B: "💀 Black", R: "🔥 Red", G: "🌲 Green",
};
const RARITIES = ["common", "uncommon", "rare", "mythic"];

function ColorBadge({ colors }: { colors: string[] }) {
  const SYMBOLS: Record<string, string> = {
    W: "☀", U: "💧", B: "💀", R: "🔥", G: "🌲",
  };
  if (!colors.length) return <span className="text-zinc-500 text-xs">Colorless</span>;
  return (
    <span className="flex gap-0.5 text-xs">
      {colors.map((c) => (
        <span key={c}>{SYMBOLS[c] ?? c}</span>
      ))}
    </span>
  );
}

function CardRow({
  card,
  deckCards,
  onAdd,
}: {
  card: CardRecord;
  deckCards: CardRecord[];
  onAdd: (card: CardRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const synergy = deckCards.length > 0 ? computeSynergy(card, deckCards) : null;
  const colors = JSON.parse(card.colorIdentityJson) as string[];

  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-700"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-100">{card.name}</span>
            <div className="flex items-center gap-2">
              <ColorBadge colors={colors} />
              {card.cmc > 0 && (
                <span className="text-xs text-zinc-400">{card.cmc} CMC</span>
              )}
              {synergy && (
                <span
                  className={`text-xs ${
                    synergy.stars >= 4
                      ? "text-amber-400"
                      : synergy.stars >= 3
                      ? "text-teal-400"
                      : "text-zinc-500"
                  }`}
                >
                  {"★".repeat(synergy.stars)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-500 truncate">{card.typeLine}</p>
        </button>
        <button
          onClick={() => onAdd(card)}
          className="shrink-0 rounded bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-500"
          aria-label={`Add ${card.name} to deck`}
        >
          +
        </button>
      </div>

      {expanded && (
        <div className="mt-1 border-t border-zinc-800 pt-2 text-xs">
          {card.imageNormal && (
            <img
              src={card.imageNormal}
              alt={card.name}
              width={146}
              height={204}
              loading="lazy"
              className="mb-2 rounded-md"
            />
          )}
          <p className="whitespace-pre-wrap text-zinc-400">{card.oracleText}</p>
          {card.priceUsd !== null && (
            <p className="mt-1 text-zinc-500">${card.priceUsd.toFixed(2)}</p>
          )}
          {synergy && synergy.reasons.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-teal-400 space-y-0.5">
              {synergy.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CardSearchPanel() {
  const addCard = useDeckStore((s) => s.addCard);
  const entries = useDeckStore((s) => s.entries);
  const deckCards = entries
    .filter((e) => e.board === "main")
    .flatMap((e) => Array<CardRecord>(e.quantity).fill(e.card));

  const [query, setQuery] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);
  const [cmcMin, setCmcMin] = useState<string>("");
  const [cmcMax, setCmcMax] = useState<string>("");
  const [sortBy, setSortBy] = useState<SearchFilters["sortBy"]>("name");
  const [results, setResults] = useState<CardRecord[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE = 30;

  const run = useCallback(
    async (off: number) => {
      setLoading(true);
      const filters: SearchFilters = {
        query: query || undefined,
        colors: colors.length ? colors : undefined,
        rarities: rarities.length ? rarities : undefined,
        cmcMin: cmcMin !== "" ? Number(cmcMin) : undefined,
        cmcMax: cmcMax !== "" ? Number(cmcMax) : undefined,
        sortBy,
        sortDir: "asc",
        limit: PAGE,
        offset: off,
      };
      const data = await searchCards(filters);
      setResults((prev) => (off === 0 ? data : [...prev, ...data]));
      setLoading(false);
    },
    [query, colors, rarities, cmcMin, cmcMax, sortBy]
  );

  useEffect(() => {
    setOffset(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => run(0), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [run]);

  const loadMore = () => {
    const next = offset + PAGE;
    setOffset(next);
    run(next);
  };

  const toggleColor = (c: string) =>
    setColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const toggleRarity = (r: string) =>
    setRarities((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Search bar */}
      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => toggleColor(c)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              colors.includes(c)
                ? "bg-teal-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {COLOR_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {RARITIES.map((r) => (
          <button
            key={r}
            onClick={() => toggleRarity(r)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors ${
              rarities.includes(r)
                ? "bg-teal-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={cmcMin}
          onChange={(e) => setCmcMin(e.target.value)}
          placeholder="CMC min"
          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500"
        />
        <input
          type="number"
          min={0}
          value={cmcMax}
          onChange={(e) => setCmcMax(e.target.value)}
          placeholder="CMC max"
          className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SearchFilters["sortBy"])}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
        >
          <option value="name">Name</option>
          <option value="cmc">CMC</option>
          <option value="rarity">Rarity</option>
          <option value="price">Price</option>
          <option value="edhrecRank">Popularity</option>
        </select>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {results.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            deckCards={deckCards}
            onAdd={addCard}
          />
        ))}
        {loading && (
          <p className="text-center text-xs text-zinc-500 py-4">Loading...</p>
        )}
        {!loading && results.length >= PAGE && (
          <button
            onClick={loadMore}
            className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Load more
          </button>
        )}
        {!loading && results.length === 0 && (
          <p className="text-center text-xs text-zinc-500 py-8">No cards found</p>
        )}
      </div>
    </div>
  );
}
