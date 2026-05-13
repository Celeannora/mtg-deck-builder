import type { ArchetypeResult } from "../lib/archetype";
import { BENCHMARKS, getBenchmarkStatus } from "../lib/archetype";

interface Props {
  result: ArchetypeResult;
}

const STATUS_COLORS = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  red: "text-red-400",
};

export function ArchetypePanel({ result }: Props) {
  const bench = BENCHMARKS[result.archetype];
  const { composition } = result;

  const rows = [
    { label: "Threats", value: composition.threats, range: bench.threats },
    { label: "Removal", value: composition.removal, range: bench.removal },
    { label: "Card Draw", value: composition.cardDraw, range: bench.cardDraw },
    { label: "Counterspells", value: composition.counterspells, range: bench.counterspells },
    { label: "Lands", value: composition.lands, range: bench.lands },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {result.archetype}
          </p>
          <p className="text-xs text-zinc-400">{result.speedRating}</p>
        </div>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map(({ label, value, range }) => {
          const status = getBenchmarkStatus(value, range as [number, number]);
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{label}</span>
              <span className={`text-xs font-medium ${STATUS_COLORS[status]}`}>
                {value}
                <span className="ml-1 text-zinc-600">
                  ({range[0]}-{range[1]})
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
