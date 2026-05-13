import { useMemo } from "react";
import type { ManaCurve } from "../lib/manaBase";

interface Props {
  curve: ManaCurve;
}

const CMC_LABELS = ["0", "1", "2", "3", "4", "5", "6", "7+"];

export function ManaCurveChart({ curve }: Props) {
  const max = useMemo(() => Math.max(1, ...curve.buckets), [curve]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">Mana Curve</span>
        <span className="text-xs text-zinc-400">Avg CMC: {curve.avgCmc}</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {curve.buckets.map((count, i) => {
          const height = max === 0 ? 0 : Math.round((count / max) * 76);
          const isPeak = i === curve.peakCmc;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              {count > 0 && (
                <span className="text-[10px] leading-none text-zinc-400">
                  {count}
                </span>
              )}
              <div
                className={`w-full rounded-sm transition-all ${
                  isPeak ? "bg-teal-400" : "bg-teal-700"
                }`}
                style={{ height: Math.max(2, height) }}
              />
              <span className="text-[10px] leading-none text-zinc-500">
                {CMC_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
