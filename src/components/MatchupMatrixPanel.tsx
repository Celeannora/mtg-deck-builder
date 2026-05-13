import type { MatchupMatrix } from "../lib/metaTypes";
import { getMatchupStatus } from "../lib/matchupMatrix";

interface Props {
  matrix: MatchupMatrix;
  userArchetype?: string;
}

function ratingColor(rating: number): string {
  if (rating >= 55) return "bg-emerald-900/60 text-emerald-300";
  if (rating <= 44) return "bg-red-900/60 text-red-300";
  return "bg-yellow-900/40 text-yellow-300";
}

export function MatchupMatrixPanel({ matrix, userArchetype }: Props) {
  const { archetypes, matchup } = matrix;

  return (
    <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-lg font-semibold text-zinc-100">Matchup Matrix</h2>
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="pr-3 pb-2 text-left text-zinc-500">vs ↓</th>
            {archetypes.map((b) => (
              <th
                key={b}
                className={`px-2 pb-2 text-center font-medium ${
                  b === userArchetype ? "text-teal-400" : "text-zinc-400"
                }`}
                title={b}
              >
                {b.length > 10 ? b.slice(0, 10) + "…" : b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {archetypes.map((a) => (
            <tr
              key={a}
              className={a === userArchetype ? "ring-1 ring-teal-600" : ""}
            >
              <td
                className={`pr-3 py-1 font-medium whitespace-nowrap ${
                  a === userArchetype ? "text-teal-400" : "text-zinc-300"
                }`}
              >
                {a.length > 14 ? a.slice(0, 14) + "…" : a}
              </td>
              {archetypes.map((b) => {
                const rating = matchup[a]?.[b] ?? 50;
                return (
                  <td key={b} className="px-1 py-1 text-center">
                    <span
                      className={`inline-block min-w-[2.5rem] rounded px-1 py-0.5 tabular-nums ${
                        a === b ? "text-zinc-600" : ratingColor(rating)
                      }`}
                    >
                      {a === b ? "—" : `${rating}%`}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-zinc-600">
        Generated {new Date(matrix.generatedAt).toLocaleString()}. Heuristic estimates — import tournament data for accuracy.
      </p>
    </div>
  );
}
