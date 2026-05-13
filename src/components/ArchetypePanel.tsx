import { useMemo } from "react";
import { useDeckStore } from "../store/deckStore";
import { detectArchetype } from "../lib/archetype";
import { analyzeDeckComposition } from "../lib/deckComposition";

const TRAFFIC_COLORS = {
  green:  "text-emerald-400",
  yellow: "text-yellow-400",
  red:    "text-red-400"
};

const TRAFFIC_BG = {
  green:  "bg-emerald-900/30",
  yellow: "bg-yellow-900/30",
  red:    "bg-red-900/30"
};

export function ArchetypePanel() {
  const { entries } = useDeckStore();

  const detection = useMemo(() => detectArchetype(entries), [entries]);
  const composition = useMemo(
    () => analyzeDeckComposition(entries, detection.archetype),
    [entries, detection.archetype]
  );

  const confidencePct = Math.round(detection.confidence * 100);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
        Add cards to detect archetype.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100">

      {/* Archetype header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-teal-400">{detection.archetype}</span>
          <span className="ml-2 text-xs text-zinc-500">{confidencePct}% confidence</span>
        </div>
        <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${confidencePct}%` }} />
        </div>
      </div>

      {/* Detection signals */}
      {detection.signals.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {detection.signals.map((s, i) => (
            <div key={i} className="text-xs text-zinc-400">→ {s}</div>
          ))}
        </div>
      )}

      {/* Role composition vs benchmarks */}
      <div className="border-t border-zinc-800 pt-3">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Role Composition</div>
        <div className="flex flex-col gap-1">
          {composition.checks.map(check => (
            <div key={check.label} className={`flex items-center gap-2 rounded px-2 py-1 ${TRAFFIC_BG[check.status]}`}>
              <span className={`text-xs font-mono w-4 text-center ${TRAFFIC_COLORS[check.status]}`}>
                {check.status === "green" ? "●" : check.status === "yellow" ? "◐" : "○"}
              </span>
              <span className="flex-1 text-zinc-300">{check.label}</span>
              <span className="font-mono text-xs text-zinc-400">{check.actual}</span>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="font-mono text-xs text-zinc-500">{check.target}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weak spots */}
      {composition.weakSpots.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Weak Spots</div>
          <div className="flex flex-col gap-1.5">
            {composition.weakSpots.map((ws, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-yellow-500 mt-0.5">⚠</span>
                <span className="text-zinc-300">{ws}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
