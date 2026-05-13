import { useRef, useCallback, useState } from "react";
import { useCardPool } from "../hooks/useCardPool";
import type { CardFilters, SortField, SortDirection } from "../lib/search";
import type { CardRecord } from "../lib/types";

const COLOR_BG: Record<string, string> = {
  W: "bg-yellow-50 text-yellow-900",
  U: "bg-blue-100 text-blue-900",
  B: "bg-zinc-700 text-zinc-100",
  R: "bg-red-100 text-red-900",
  G: "bg-green-100 text-green-900",
};

function ColorPips({ colorsJson }: { colorsJson: string }) {
  const colors: string[] = JSON.parse(colorsJson);
  if (!colors.length) return <span className="text-zinc-400 text-xs">C</span>;
  return (
    <span className="flex gap-0.5">
      {colors.map((c) => (
        <span
          key={c}
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
            COLOR_BG[c] ?? "bg-zinc-200 text-zinc-800"
          }`}
        >
          {c}
        </span>
      ))}
    </span>
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
    <span className={`text-xs font-semibold uppercase ${map[rarity ?? ""] ?? "text-zinc-500"}`}>
      {rarity?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function CardRow({
  card,
  onSelect,
}: {
  card: CardRecord;
  onSelect: (c: CardRecord) => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 rounded-lg text-left transition-colors group"
      onClick={() => onSelect(card)}
    >
      {card.imageNormal ? (
        <img
          src={card.imageNormal}
          alt={card.name}
          width={34}
          height={48}
          loading="lazy"
          className="rounded w-[34px] h-[48px] object-cover flex-shrink-0 shadow-sm"
        />
      ) : (
        <div className="w-[34px] h-[48px] rounded bg-zinc-700 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">{card.name}</span>
          {card.gameChanger === 1 && (
            <span className="text-[10px] font-bold text-teal-400 border border-teal-700 rounded px-1 py-px shrink-0">
              GC
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-400 truncate">{card.typeLine}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <ColorPips colorsJson={card.colorsJson} />
          <span className="text-xs text-zinc-500">
            {card.manaCost ?? (card.cmc === 0 ? "0" : `{${card.cmc}}`)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <RarityBadge rarity={card.rarity} />
        {card.priceUsd !== null && (
          <span className="text-xs text-zinc-400">${card.priceUsd.toFixed(2)}</span>
        )}
      </div>
    </button>
  );
}

interface Props {
  onCardSelect?: (card: CardRecord) => void;
}

export function CardPool({ onCardSelect }: Props) {
  const [text, setText] = useState("");
  const [sort, setSort] = useState<SortField>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [includeFuture, setIncludeFuture] = useState(false);

  const filters: CardFilters = {
    text: text || undefined,
    sort,
    direction,
    includeFuture,
  };

  const { cards, total, loading, error, hasMore, loadMore } =
    useCardPool(filters);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const setObserverTarget = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (node) {
        observerRef.current = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) loadMore();
          },
          { threshold: 0.1 }
        );
        observerRef.current.observe(node);
      }
    },
    [loadMore]
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by name, text, type…"
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-teal-600"
        />
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortField)}
            className="flex-1 text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-teal-600"
          >
            <option value="name">Sort: Name</option>
            <option value="cmc">Sort: CMC</option>
            <option value="priceUsd">Sort: Price</option>
            <option value="rarity">Sort: Rarity</option>
            <option value="edhrecRank">Sort: EDHREC</option>
            <option value="gameChanger">Sort: Game Changer</option>
          </select>
          <button
            onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
            className="px-2 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            aria-label="Toggle sort direction"
          >
            {direction === "asc" ? "↑" : "↓"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFuture}
              onChange={(e) => setIncludeFuture(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 accent-teal-500"
            />
            Future
          </label>
        </div>
      </div>

      <div className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-800">
        {loading && cards.length === 0
          ? "Searching…"
          : `${total.toLocaleString()} cards`}
      </div>

      {error && (
        <div className="mx-3 mt-2 p-3 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {cards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            onSelect={onCardSelect ?? (() => {})}
          />
        ))}

        {hasMore && (
          <div ref={setObserverTarget} className="h-8 flex items-center justify-center">
            {loading && <span className="text-xs text-zinc-500">Loading…</span>}
          </div>
        )}

        {!loading && cards.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <svg
              className="w-10 h-10 text-zinc-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"
              />
            </svg>
            <p className="text-sm text-zinc-400">No cards match your search.</p>
            <p className="text-xs text-zinc-600 max-w-[24ch]">
              Try broadening your filters or importing your Scryfall bulk file first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
