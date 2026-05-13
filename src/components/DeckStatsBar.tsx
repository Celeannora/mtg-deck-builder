import { useDeckStore } from "../store/deckStore";
import { ManaCurveChart } from "./ManaCurveChart";
import { ArchetypePanel } from "./ArchetypePanel";

export function DeckStatsBar() {
  const { archetypeResult, manaCurve, landRec, colorDist, validation } = useDeckStore();

  if (!archetypeResult || !manaCurve) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-600">
        Add cards to see stats
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full">
      <ArchetypePanel result={archetypeResult} />
      <ManaCurveChart curve={manaCurve} />

      {landRec && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100 mb-1">Land Count</p>
          <p className="text-xs text-zinc-300">{landRec.breakdown}</p>
          <p className="text-xs text-zinc-500 mt-1">{landRec.rationale}</p>
        </div>
      )}

      {colorDist && colorDist.pips.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100 mb-2">Color Distribution</p>
          <div className="space-y-1.5">
            {colorDist.pips.map((pip) => (
              <div key={pip.color} className="flex items-center gap-2">
                <span className="w-6 text-xs text-zinc-400">{pip.color}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-zinc-800 h-2">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${Math.round(pip.fraction * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-zinc-400">{pip.count}</span>
              </div>
            ))}
          </div>
          {colorDist.landSplit && (
            <p className="mt-2 text-xs text-zinc-500">
              Land split:{" "}
              {Object.entries(colorDist.landSplit)
                .map(([k, v]) => `${v} ${k}`)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {validation && (
        <div
          className={`rounded-xl border p-4 ${
            validation.valid
              ? "border-emerald-800 bg-emerald-950/30"
              : "border-red-800 bg-red-950/30"
          }`}
        >
          <p className="text-sm font-semibold text-zinc-100 mb-1">
            {validation.valid ? "✓ Valid Deck" : "✗ Illegal Deck"}
          </p>
          <p className="text-xs text-zinc-400">
            {validation.mainCount}/60 main · {validation.sideCount}/15 side
          </p>
        </div>
      )}
    </div>
  );
}
