import { useEffect } from "react";
import { useDeckStore } from "../store/deckStore";
import { useManaBaseStore } from "../lib/manaBaseStore";
import { ManaCurveChart } from "./ManaCurveChart";

const COLOR_SYMBOLS: Record<string, string> = {
  W: "☀️", U: "💧", B: "💀", R: "🔥", G: "🌿"
};

const COLOR_LABELS: Record<string, string> = {
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green"
};

export function ManaBasePanel() {
  const { entries } = useDeckStore();
  const { analysis, loading, compute } = useManaBaseStore();

  useEffect(() => {
    if (entries.length > 0) {
      compute(entries);
    }
  }, [entries, compute]);

  if (loading || !analysis) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
        {loading ? "Analyzing mana base..." : "Add cards to see mana base analysis."}
      </div>
    );
  }

  const { landRec, colorSources, dualSuggestions, curve, avgMV, castabilityWarnings, archetypeProfile } = analysis;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100">

      {/* Land count recommendation */}
      <div>
        <h3 className="font-semibold text-zinc-200 mb-2">Land Count</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-teal-400">{landRec.recommended}</span>
          <span className="text-zinc-400">recommended ({landRec.rangeMin}–{landRec.rangeMax} range)</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">Avg MV: {landRec.avgManaValue}</div>
        {landRec.adjustments.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5">
            {landRec.adjustments.map((adj, i) => (
              <li key={i} className="text-xs text-zinc-400">{adj}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Color distribution */}
      {colorSources.length > 0 && (
        <div>
          <h3 className="font-semibold text-zinc-200 mb-2">Color Sources</h3>
          <div className="flex flex-col gap-1">
            {colorSources.map(cs => (
              <div key={cs.color} className="flex items-center gap-2">
                <span className="w-5 text-base">{COLOR_SYMBOLS[cs.color]}</span>
                <span className="w-16 text-zinc-300">{COLOR_LABELS[cs.color]}</span>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.min(cs.ratio * 100 * 2, 100)}%` }}
                  />
                </div>
                <span className={`font-mono text-xs w-16 text-right ${
                  cs.criticallyUndersourced ? "text-red-400" : "text-zinc-300"
                }`}>
                  {cs.recommendedSources} sources
                </span>
                {cs.criticallyUndersourced && (
                  <span className="text-xs text-red-400">⚠ critical</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mana curve chart */}
      <div className="border-t border-zinc-800 pt-4">
        <ManaCurveChart curve={curve} archetypeProfile={archetypeProfile} avgMV={avgMV} />
      </div>

      {/* Dual land recommendations */}
      {dualSuggestions.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h3 className="font-semibold text-zinc-200 mb-2">Suggested Dual Lands</h3>
          <div className="flex flex-col gap-1">
            {dualSuggestions.slice(0, 8).map(ds => (
              <div key={ds.card.id} className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  ds.tier === 1 ? "bg-emerald-900/50 text-emerald-400" :
                  ds.tier === 2 ? "bg-yellow-900/50 text-yellow-400" :
                  "bg-red-900/50 text-red-400"
                }`}>T{ds.tier}</span>
                <span className="text-zinc-200 flex-1 truncate">{ds.card.name}</span>
                <span className="text-zinc-500 text-xs font-mono">×{ds.quantity}</span>
                {ds.card.priceUsd != null && (
                  <span className="text-zinc-500 text-xs">${ds.card.priceUsd.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Castability warnings */}
      {castabilityWarnings.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h3 className="font-semibold text-yellow-400 mb-2">⚡ Castability Warnings</h3>
          <div className="flex flex-col gap-1">
            {castabilityWarnings.map(w => (
              <div key={w.cardName} className="flex items-start gap-2 text-xs">
                <span className="text-yellow-500 mt-0.5">⚠</span>
                <div>
                  <span className="text-zinc-200">{w.cardName}</span>
                  <span className="text-zinc-500"> (CMC {w.cmc}) — only </span>
                  <span className="text-yellow-400 font-mono">{Math.round(w.probByNaturalTurn * 100)}%</span>
                  <span className="text-zinc-500"> chance of casting by T{w.naturalTurn}. Consider more ramp or lowering curve.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
