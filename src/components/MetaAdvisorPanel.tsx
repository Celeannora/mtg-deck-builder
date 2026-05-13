import type { ArchetypeEntry, MetaPositionResult, MetaMatchupAdvisory } from "../lib/metaTypes";
import { computeMetaPositionScore, getMetaMatchupAdvisory } from "../lib/metaPosition";

interface Props {
  yourArchetype: string;
  snapshot: ArchetypeEntry[];
}

const gradeColors: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-teal-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
};

export function MetaAdvisorPanel({ yourArchetype, snapshot }: Props) {
  if (!snapshot.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400 text-sm">
        No meta snapshot loaded. Import one to see your meta position.
      </div>
    );
  }

  const position: MetaPositionResult = computeMetaPositionScore(yourArchetype, snapshot);
  const advisory: MetaMatchupAdvisory[] = getMetaMatchupAdvisory(yourArchetype, snapshot);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 space-y-5">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Meta Position Score</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold tabular-nums">{position.score}</span>
            <span className={`text-2xl font-bold mb-0.5 ${gradeColors[position.grade]}`}>
              {position.grade}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>{yourArchetype}</p>
          <p>{position.fieldCoverage}% field covered</p>
        </div>
      </div>

      {/* Favored / Unfavored */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-950/40 border border-emerald-800 p-3">
          <p className="text-xs text-emerald-400 font-semibold mb-1">Favored</p>
          {position.favorableMatchups.length === 0 ? (
            <p className="text-xs text-zinc-500">None</p>
          ) : (
            <ul className="text-xs space-y-0.5">
              {position.favorableMatchups.map((a) => (
                <li key={a} className="text-emerald-300">{a}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg bg-red-950/40 border border-red-800 p-3">
          <p className="text-xs text-red-400 font-semibold mb-1">Unfavored</p>
          {position.unfavorableMatchups.length === 0 ? (
            <p className="text-xs text-zinc-500">None</p>
          ) : (
            <ul className="text-xs space-y-0.5">
              {position.unfavorableMatchups.map((a) => (
                <li key={a} className="text-red-300">{a}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Per-archetype advisory */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Matchup Advisory</p>
        <div className="space-y-2">
          {advisory.slice(0, 8).map((adv) => (
            <div key={adv.archetype} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{adv.archetype}</span>
                {adv.sideboardSuggestions.length > 0 && (
                  <span className="text-xs text-zinc-500">{adv.sideboardSuggestions[0]}</span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`text-sm font-bold tabular-nums ${
                    adv.status === "favored" ? "text-emerald-400" :
                    adv.status === "unfavored" ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  {adv.estimatedWinRate}%
                </span>
                <span className="block text-xs text-zinc-600">{adv.metaShare.toFixed(1)}% field</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
