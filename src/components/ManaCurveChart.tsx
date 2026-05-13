import { useMemo } from "react";
import type { CurveSlot, ArchetypeCurveProfile } from "../lib/manaBase";
import { IDEAL_CURVES } from "../lib/manaBase";

interface Props {
  curve: CurveSlot[];
  archetypeProfile: ArchetypeCurveProfile;
  avgMV: number;
}

const TYPE_COLORS: Record<string, string> = {
  creatures:     "#3b82f6",
  instants:      "#f97316",
  sorceries:     "#a855f7",
  enchantments:  "#22c55e",
  artifacts:     "#94a3b8",
  planeswalkers: "#eab308",
  other:         "#6b7280"
};

const TYPE_KEYS = ["creatures", "instants", "sorceries", "enchantments", "artifacts", "planeswalkers", "other"] as const;

export function ManaCurveChart({ curve, archetypeProfile, avgMV }: Props) {
  const maxTotal = useMemo(() => Math.max(...curve.map(s => s.total), 1), [curve]);
  const totalNonlands = useMemo(() => curve.reduce((s, c) => s + c.total, 0), [curve]);
  const idealCurve = IDEAL_CURVES[archetypeProfile];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">Mana Curve</span>
        <span className="text-xs text-zinc-400">Avg MV: <span className="text-zinc-200 font-mono">{avgMV}</span></span>
      </div>

      <div className="flex items-end gap-1 h-28">
        {curve.map((slot) => {
          const ideal = idealCurve[slot.mv] ?? 0;
          const idealHeight = Math.round(ideal * totalNonlands);
          const barPct = slot.total / maxTotal;

          return (
            <div key={slot.mv} className="flex flex-col items-center flex-1 gap-0.5">
              <div className="relative w-full flex flex-col justify-end" style={{ height: "96px" }}>
                {/* Ideal curve marker */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-zinc-500 opacity-50"
                  style={{ bottom: `${(idealHeight / maxTotal) * 96}px` }}
                />
                {/* Stacked bars by type */}
                <div className="w-full flex flex-col-reverse" style={{ height: `${barPct * 96}px`, minHeight: slot.total > 0 ? 2 : 0 }}>
                  {TYPE_KEYS.map(type => {
                    const count = (slot as unknown as Record<string, number>)[type];
                    if (!count) return null;
                    const typeHeight = (count / slot.total) * 100;
                    return (
                      <div
                        key={type}
                        style={{ height: `${typeHeight}%`, backgroundColor: TYPE_COLORS[type] }}
                        title={`${type}: ${count}`}
                        className="w-full rounded-sm"
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-zinc-500">{slot.mv === 7 ? "7+" : slot.mv}</span>
              {slot.total > 0 && (
                <span className="text-xs text-zinc-300 font-mono">{slot.total}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {TYPE_KEYS.filter(t => curve.some(s => (s as unknown as Record<string,number>)[t] > 0)).map(type => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: TYPE_COLORS[type] }} />
            <span className="text-xs text-zinc-400 capitalize">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-4 h-0 border-t border-dashed border-zinc-500" />
          <span className="text-xs text-zinc-500 capitalize">ideal ({archetypeProfile})</span>
        </div>
      </div>
    </div>
  );
}
