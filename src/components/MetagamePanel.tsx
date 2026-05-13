import { useEffect, useState } from "react";
import { fetchMetagameSnapshot } from "../lib/metagame";
import { buildTierList } from "../lib/tierList";
import { diffMetaSnapshots, detectTrendingArchetypes } from "../lib/trendAnalyzer";
import type { MetagameEntry } from "../lib/metagame";
import type { TierEntry } from "../lib/tierList";
import type { TrendingArchetype } from "../lib/trendAnalyzer";

const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: "text-amber-400 bg-amber-950/40 border-amber-800",
  2: "text-sky-400 bg-sky-950/40 border-sky-800",
  3: "text-zinc-400 bg-zinc-800/40 border-zinc-700",
};

export function MetagamePanel() {
  const [entries, setEntries] = useState<MetagameEntry[]>([]);
  const [tierList, setTierList] = useState<TierEntry[]>([]);
  const [trends, setTrends] = useState<TrendingArchetype[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetagameSnapshot().then((data) => {
      setEntries(data);
      setTierList(buildTierList(data));
      // Fake prior snapshot for demo trends
      const prior = data.map((e) => ({ ...e, metaShare: e.metaShare * (0.8 + Math.random() * 0.4) }));
      setTrends(diffMetaSnapshots(prior, data));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-zinc-400 text-sm">Loading metagame…</div>;

  const maxShare = Math.max(...entries.map((e) => e.metaShare));

  return (
    <div className="space-y-6 text-zinc-100">
      <h2 className="text-lg font-semibold">Metagame Overview</h2>

      {/* Tier table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              {["Tier", "Archetype", "Meta %", "Win %", "Trend"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tierList.map((t) => {
              const trend = trends.find((tr) => tr.archetype === t.archetype);
              return (
                <tr key={t.archetype} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${TIER_COLORS[t.tier]}`}>{t.label}</span>
                  </td>
                  <td className="px-3 py-2 font-medium">{t.archetype}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-zinc-800 w-24">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${(t.metaShare / maxShare) * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-xs">{(t.metaShare * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-xs">{(t.winRate * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-base">
                    {trend?.direction === "up" ? <span className="text-emerald-400">↑</span>
                     : trend?.direction === "down" ? <span className="text-red-400">↓</span>
                     : <span className="text-zinc-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trending section */}
      <div className="grid grid-cols-2 gap-4">
        {(["up", "down"] as const).map((dir) => (
          <div key={dir} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
              dir === "up" ? "text-emerald-400" : "text-red-400"
            }`}>{dir === "up" ? "↑ Rising" : "↓ Falling"}</p>
            <div className="space-y-1.5">
              {detectTrendingArchetypes(trends, dir).map((t) => (
                <div key={t.archetype} className="flex items-center justify-between">
                  <span className="text-sm">{t.archetype}</span>
                  <span className={`text-xs tabular-nums font-medium ${
                    dir === "up" ? "text-emerald-400" : "text-red-400"
                  }`}>{dir === "up" ? "+" : ""}{(t.shareChange * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
