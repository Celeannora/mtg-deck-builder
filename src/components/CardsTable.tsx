import { useEffect, useState } from "react";
import { getAllKeywords, getAllSetCodes, searchCards } from "../lib/search";
import type { CardFilters, SearchResult } from "../lib/search";
import type { CardRecord } from "../lib/types";

const MANA_COLORS = ["W", "U", "B", "R", "G"] as const;
const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;
const CARD_TYPES = [
  "Creature",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Artifact",
  "Planeswalker",
  "Battle",
  "Land",
] as const;
const COLOR_LABEL: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

function useDebounce<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function CardsTable() {
  const [filters, setFilters] = useState<CardFilters>({
    legalityStandard: "legal",
    sortBy: "name",
    sortDir: "asc",
    page: 1,
  });
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [sets, setSets] = useState<{ code: string; name: string }[]>([]);
  const [nameInput, setNameInput] = useState("");
  const debouncedName = useDebounce(nameInput, 250);
  const [oracleInput, setOracleInput] = useState("");
  const debouncedOracle = useDebounce(oracleInput, 300);

  useEffect(() => {
    getAllKeywords().then(setKeywords);
    getAllSetCodes().then(setSets);
  }, []);

  useEffect(() => {
    setFilters((f) => ({ ...f, name: debouncedName, page: 1 }));
  }, [debouncedName]);

  useEffect(() => {
    setFilters((f) => ({ ...f, oracleText: debouncedOracle, page: 1 }));
  }, [debouncedOracle]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchCards(filters).then((r) => {
      if (!cancelled) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const setFilter = (patch: Partial<CardFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const toggleArray = (key: keyof CardFilters, value: string) => {
    const arr = (filters[key] as string[] | undefined) ?? [];
    const next = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    setFilter({
      [key]: next.length ? next : undefined,
    } as Partial<CardFilters>);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-zinc-100 bg-zinc-950 min-h-screen">
      <h1 className="text-xl font-semibold">Card Pool</h1>

      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Card Name</label>
          <input
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. Lightning"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Oracle Text</label>
          <input
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. draw a card"
            value={oracleInput}
            onChange={(e) => setOracleInput(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Mana Value</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={20}
              className="w-16 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Min"
              onChange={(e) =>
                setFilter({
                  cmcMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <span className="text-zinc-500">–</span>
            <input
              type="number"
              min={0}
              max={20}
              className="w-16 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Max"
              onChange={(e) =>
                setFilter({
                  cmcMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Sort</label>
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none"
              value={filters.sortBy}
              onChange={(e) =>
                setFilter({ sortBy: e.target.value as CardFilters["sortBy"] })
              }
            >
              <option value="name">Name</option>
              <option value="cmc">Mana Value</option>
              <option value="priceUsd">Price</option>
              <option value="edhrecRank">EDHREC Rank</option>
            </select>
            <button
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
              onClick={() =>
                setFilter({
                  sortDir: filters.sortDir === "asc" ? "desc" : "asc",
                })
              }
            >
              {filters.sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Colors */}
        <div className="flex flex-col gap-1 col-span-full sm:col-span-2">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Color Identity</label>
          <div className="flex flex-wrap gap-2">
            {MANA_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => toggleArray("colors", c)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  (filters.colors ?? []).includes(c)
                    ? "bg-teal-600 border-teal-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {c} — {COLOR_LABEL[c]}
              </button>
            ))}
            {(filters.colors?.length ?? 0) > 0 && (
              <select
                className="rounded-lg bg-zinc-800 px-2 py-1 text-xs outline-none"
                value={filters.colorMode ?? "includes"}
                onChange={(e) =>
                  setFilter({
                    colorMode: e.target.value as CardFilters["colorMode"],
                  })
                }
              >
                <option value="includes">Includes</option>
                <option value="exactly">Exactly</option>
                <option value="atMost">At Most</option>
              </select>
            )}
          </div>
        </div>

        {/* Card Types */}
        <div className="flex flex-col gap-1 col-span-full sm:col-span-2">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Type</label>
          <div className="flex flex-wrap gap-2">
            {CARD_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleArray("types", t)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  (filters.types ?? []).includes(t)
                    ? "bg-teal-600 border-teal-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Rarity */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Rarity</label>
          <div className="flex flex-wrap gap-2">
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => toggleArray("rarities", r)}
                className={`rounded-full px-3 py-1 text-xs capitalize font-medium border transition-colors ${
                  (filters.rarities ?? []).includes(r)
                    ? "bg-teal-600 border-teal-500 text-white"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Max price */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400 uppercase tracking-wide">Max Price (USD)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. 5.00"
            onChange={(e) =>
              setFilter({
                maxPriceUsd: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>

        {/* Set selector */}
        {sets.length > 0 && (
          <div className="flex flex-col gap-1 col-span-full sm:col-span-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Set</label>
            <select
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none"
              multiple
              size={3}
              value={filters.sets ?? []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(
                  (o) => o.value
                );
                setFilter({ sets: selected.length ? selected : undefined });
              }}
            >
              {sets.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code.toUpperCase()})
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500">Hold Ctrl/Cmd to select multiple</span>
          </div>
        )}

        {/* Future toggle */}
        <div className="flex items-center gap-2 col-span-full">
          <input
            id="future-toggle"
            type="checkbox"
            className="accent-teal-500"
            checked={filters.legalityStandard === "future"}
            onChange={(e) =>
              setFilter({
                legalityStandard: e.target.checked ? "future" : "legal",
              })
            }
          />
          <label htmlFor="future-toggle" className="text-sm text-zinc-300">
            Show "Coming Soon to Standard" cards
          </label>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {loading
            ? "Searching..."
            : `${result?.total.toLocaleString() ?? 0} cards`}
        </span>
        {result && result.pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={result.page <= 1}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page! - 1 }))
              }
              className="rounded px-2 py-1 bg-zinc-800 disabled:opacity-40 hover:bg-zinc-700"
            >
              ← Prev
            </button>
            <span>
              {result.page} / {result.pages}
            </span>
            <button
              disabled={result.page >= result.pages}
              onClick={() =>
                setFilters((f) => ({ ...f, page: f.page! + 1 }))
              }
              className="rounded px-2 py-1 bg-zinc-800 disabled:opacity-40 hover:bg-zinc-700"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Card</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">MV</th>
              <th className="px-4 py-3 text-left">Colors</th>
              <th className="px-4 py-3 text-left">Set</th>
              <th className="px-4 py-3 text-left">Rarity</th>
              <th className="px-4 py-3 text-right">USD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {result?.cards.map((card) => (
              <CardRow key={card.id} card={card} />
            ))}
            {!loading && result?.cards.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No cards match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CardRow({ card }: { card: CardRecord }) {
  const [imgError, setImgError] = useState(false);
  const colors: string[] = JSON.parse(card.colorsJson ?? "[]");

  return (
    <tr className="hover:bg-zinc-900 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {card.imageNormal && !imgError ? (
            <img
              src={card.imageNormal}
              alt={card.name}
              width={34}
              height={48}
              loading="lazy"
              decoding="async"
              className="rounded object-cover shadow"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-[34px] h-[48px] rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
              ?
            </div>
          )}
          <div>
            <div className="font-medium text-zinc-100">{card.name}</div>
            {card.manaCost && (
              <div className="text-xs text-zinc-500">{card.manaCost}</div>
            )}
            {card.gameChanger === 1 && (
              <span className="text-xs text-amber-400 font-semibold">
                ⚡ Game Changer
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">
        {card.typeLine}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
        {card.cmc}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {colors.map((c) => (
            <span
              key={c}
              className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs"
            >
              {c}
            </span>
          ))}
          {colors.length === 0 && (
            <span className="text-zinc-600 text-xs">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-zinc-400 uppercase text-xs">
        {card.setCode}
      </td>
      <td className="px-4 py-3">
        <RarityBadge rarity={card.rarity} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
        {card.priceUsd !== null ? `$${card.priceUsd.toFixed(2)}` : "—"}
      </td>
    </tr>
  );
}

function RarityBadge({ rarity }: { rarity: string | null }) {
  const map: Record<string, string> = {
    mythic: "text-orange-400",
    rare: "text-yellow-400",
    uncommon: "text-zinc-300",
    common: "text-zinc-500",
  };
  return (
    <span
      className={`text-xs capitalize font-medium ${
        map[rarity ?? ""] ?? "text-zinc-500"
      }`}
    >
      {rarity ?? "—"}
    </span>
  );
}
