import { useEffect, useState } from "react";
import type { RotationImpactReport } from "../lib/metaTypes";
import { analyzeRotationImpact } from "../lib/rotationImpact";

interface Props {
  deckId: string;
  mainboardCardNames: string[];
}

const severityColors = {
  low: "border-emerald-800 bg-emerald-950/30",
  medium: "border-yellow-700 bg-yellow-950/30",
  high: "border-red-800 bg-red-950/30",
};

export function RotationImpactPanel({ deckId, mainboardCardNames }: Props) {
  const [report, setReport] = useState<RotationImpactReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mainboardCardNames.length) return;
    setLoading(true);
    analyzeRotationImpact(mainboardCardNames, deckId)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [deckId, mainboardCardNames.join(",")]);

  if (loading) return <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400 text-sm">Analyzing rotation impact…</div>;
  if (!report) return null;

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${severityColors[report.severity]}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Rotation Impact</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
          report.severity === "high" ? "bg-red-900 text-red-300" :
          report.severity === "medium" ? "bg-yellow-900 text-yellow-300" :
          "bg-emerald-900 text-emerald-300"
        }`}>
          {report.severity}
        </span>
      </div>

      {report.rotatingCards.length === 0 ? (
        <p className="text-sm text-zinc-400">No cards in your deck are scheduled to rotate. ✓</p>
      ) : (
        <div className="space-y-3">
          {report.rotatingCards.map((rc) => (
            <div key={rc.cardName} className="rounded-lg bg-zinc-900/60 border border-zinc-700 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{rc.cardName}</p>
                  <p className="text-xs text-zinc-500">{rc.setName} ({rc.setCode.toUpperCase()}) · {rc.rotatesAt}</p>
                </div>
                <span className="rounded bg-red-900/60 text-red-300 text-xs px-2 py-0.5">Rotating</span>
              </div>
              {rc.replacements.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-zinc-500 mb-1">Possible replacements:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rc.replacements.map((r) => (
                      <span key={r.id} className="rounded-full bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5">
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
