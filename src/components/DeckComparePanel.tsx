import { useState, useMemo } from "react";
import { useDeckStore } from "../store/deckStore";
import { compareDecks, parsePlainDecklist } from "../lib/deckCompare";
import type { SimpleEntry, DeckCompareResult } from "../lib/deckCompare";

// ─── helpers ────────────────────────────────────────────────────────────────

function deckEntriesToSimple(
  entries: ReturnType<typeof useDeckStore>["entries"]
): SimpleEntry[] {
  return entries
    .filter(e => e.board === "main")
    .map(e => ({
      name:     e.card.name,
      quantity: e.quantity,
      cmc:      e.card.cmc,
      typeLine: e.card.typeLine,
      setCode:  e.card.setCode?.toLowerCase(),
    }));
}

const BAR_COLORS = { a: "bg-teal-500", b: "bg-violet-500" };

function BarRow({ label, valA, valB, max }: { label: string; valA: number; valB: number; max: number }) {
  const pA = max > 0 ? (valA / max) * 100 : 0;
  const pB = max > 0 ? (valB / max) * 100 : 0;
  return (
    <div className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2 text-xs">
      <span className="truncate text-zinc-400">{label}</span>
      <div className="flex h-4 items-center gap-1">
        <div className="h-full rounded-sm bg-teal-500/20 w-full relative">
          <div className={`h-full rounded-sm ${BAR_COLORS.a} absolute left-0`} style={{ width: `${pA}%` }} />
        </div>
        <span className="w-5 text-right text-zinc-300">{valA}</span>
      </div>
      <div className="flex h-4 items-center gap-1">
        <div className="h-full rounded-sm bg-violet-500/20 w-full relative">
          <div className={`h-full rounded-sm ${BAR_COLORS.b} absolute left-0`} style={{ width: `${pB}%` }} />
        </div>
        <span className="w-5 text-right text-zinc-300">{valB}</span>
      </div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export function DeckComparePanel() {
  const entries = useDeckStore(s => s.entries);
  const deckNameA = useDeckStore(s => s.deckName);
  const [rawB, setRawB] = useState("");
  const [nameB, setNameB] = useState("Deck B");
  const [activeTab, setActiveTab] = useState<"overlap" | "curve" | "types">("overlap");

  const deckA: SimpleEntry[] = useMemo(() => deckEntriesToSimple(entries), [entries]);

  const deckB: SimpleEntry[] = useMemo(() => {
    if (!rawB.trim()) return [];
    return parsePlainDecklist(rawB);
  }, [rawB]);

  const result: DeckCompareResult | null = useMemo(() => {
    if (deckA.length === 0 || deckB.length === 0) return null;
    return compareDecks(deckA, deckB);
  }, [deckA, deckB]);

  const curvMax = result
    ? Math.max(...result.curve.map(c => Math.max(c.countA, c.countB)), 1)
    : 1;
  const typeMax = result
    ? Math.max(...result.types.map(t => Math.max(t.countA, t.countB)), 1)
    : 1;

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500" />
          <span className="text-zinc-300">{deckNameA || "Deck A"} (current)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-500" />
          <span className="text-zinc-300">{nameB}</span>
        </span>
      </div>

      {/* Deck B input */}
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-400">Deck B name</label>
          <input
            value={nameB}
            onChange={e => setNameB(e.target.value)}
            className="flex-1 rounded border border-zinc-700 bg-transparent px-2 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
          />
        </div>
        <label className="text-xs text-zinc-500">
          Paste a decklist (one card per line, e.g. &ldquo;4 Lightning Bolt&rdquo;):
        </label>
        <textarea
          value={rawB}
          onChange={e => setRawB(e.target.value)}
          rows={7}
          placeholder={`4 Lightning Bolt\n3 Mountain\n...`}
          className="w-full resize-none rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
        />
        {deckB.length > 0 && (
          <p className="text-xs text-zinc-500">{deckB.reduce((s, e) => s + e.quantity, 0)} cards parsed</p>
        )}
      </div>

      {/* No data state */}
      {!result && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
            <rect x="2" y="3" width="9" height="14" rx="1" />
            <rect x="13" y="3" width="9" height="14" rx="1" />
            <path d="M6 21h12" strokeLinecap="round" />
          </svg>
          <p className="text-xs">
            {deckA.length === 0
              ? "Build a deck in the Deck Builder first"
              : "Paste a second decklist above to compare"}
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-teal-400">{result.overlapPct}%</p>
              <p className="text-xs text-zinc-500">Overlap</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-zinc-200">{result.onlyInA.length}</p>
              <p className="text-xs text-zinc-500">Only in A</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-center">
              <p className="text-lg font-semibold text-zinc-200">{result.onlyInB.length}</p>
              <p className="text-xs text-zinc-500">Only in B</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(["overlap", "curve", "types"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-0.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {tab === "overlap" ? "Card Overlap" : tab === "curve" ? "Mana Curve" : "Card Types"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overlap" && (
            <div className="space-y-3">
              {result.shared.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Shared ({result.shared.length})</h3>
                  <div className="space-y-1">
                    {result.shared.map(c => (
                      <div key={c.name} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
                        <span className="text-xs text-zinc-200">{c.name}</span>
                        <span className="text-xs text-zinc-500">
                          <span className="text-teal-400">{c.quantityA}</span>
                          {" / "}
                          <span className="text-violet-400">{c.quantityB}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="grid grid-cols-2 gap-3">
                {result.onlyInA.length > 0 && (
                  <section>
                    <h3 className="mb-1.5 text-xs font-semibold text-teal-400 uppercase tracking-wider">Only A ({result.onlyInA.length})</h3>
                    <div className="space-y-1">
                      {result.onlyInA.map(e => (
                        <div key={e.name} className="flex justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
                          <span className="truncate text-xs text-zinc-300">{e.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-zinc-500">{e.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {result.onlyInB.length > 0 && (
                  <section>
                    <h3 className="mb-1.5 text-xs font-semibold text-violet-400 uppercase tracking-wider">Only B ({result.onlyInB.length})</h3>
                    <div className="space-y-1">
                      {result.onlyInB.map(e => (
                        <div key={e.name} className="flex justify-between rounded border border-zinc-800 bg-zinc-900 px-2 py-1">
                          <span className="truncate text-xs text-zinc-300">{e.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-zinc-500">{e.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {activeTab === "curve" && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span>CMC</span>
                <span>A</span>
                <span>B</span>
              </div>
              {result.curve.map(c => (
                <BarRow
                  key={c.cmc}
                  label={c.cmc === 6 ? "6+" : String(c.cmc)}
                  valA={c.countA}
                  valB={c.countB}
                  max={curvMax}
                />
              ))}
            </div>
          )}

          {activeTab === "types" && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span>Type</span>
                <span>A</span>
                <span>B</span>
              </div>
              {result.types.map(t => (
                <BarRow
                  key={t.type}
                  label={t.type}
                  valA={t.countA}
                  valB={t.countB}
                  max={typeMax}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
