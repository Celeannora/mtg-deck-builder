import { useEffect, useState, useMemo } from "react";
import { useDeckStore } from "../store/deckStore";
import { runBuildWizard, type WizardInput } from "../lib/buildWizard";
import { optimizeDeck, type SwapSuggestion } from "../lib/optimizeEngine";
import { getWhatsMissing, type MissingReport } from "../lib/whatsMissing";
import { findCombos, type ComboResult } from "../lib/comboFinder";
import { analyzeBudget, type BudgetAnalysis } from "../lib/budgetOptimizer";
import type { Archetype } from "../lib/archetype";
import type { DeckEntry } from "../lib/legality";
import type { CardRecord } from "../lib/types";

type AdvisorTab = "wizard" | "optimize" | "missing" | "combos" | "budget";

const TABS: { id: AdvisorTab; label: string }[] = [
  { id: "wizard",   label: "Build" },
  { id: "optimize", label: "Optimize" },
  { id: "missing",  label: "Gaps" },
  { id: "combos",   label: "Combos" },
  { id: "budget",   label: "Budget" },
];

const ARCHETYPES: Archetype[] = [
  "Aggro","Burn","Midrange","Control","Combo","Tempo","Ramp","Tokens","Graveyard","Sacrifice"
];
const COLORS = ["W","U","B","R","G"];

/** Replace the entire deck with new entries via store actions (preserves revalidation + companion check). */
function useReplaceEntries() {
  const clearDeck = useDeckStore(s => s.clearDeck);
  const addCard   = useDeckStore(s => s.addCard);
  return (entries: DeckEntry[]) => {
    clearDeck();
    for (const { card, quantity, board } of entries) {
      for (let i = 0; i < quantity; i++) addCard(card, board);
    }
  };
}

export function AdvisorPanel() {
  const [tab, setTab] = useState<AdvisorTab>("wizard");
  const entries = useDeckStore(s => s.entries);
  const replaceEntries = useReplaceEntries();

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 border-b border-zinc-800">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? "border-b-2 border-teal-400 text-teal-300" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 text-sm">
        {tab === "wizard"   && <WizardTab   entries={entries} replaceEntries={replaceEntries} />}
        {tab === "optimize" && <OptimizeTab entries={entries} replaceEntries={replaceEntries} />}
        {tab === "missing"  && <MissingTab  entries={entries} />}
        {tab === "combos"   && <CombosTab   entries={entries} />}
        {tab === "budget"   && <BudgetTab   entries={entries} replaceEntries={replaceEntries} />}
      </div>
    </div>
  );
}

// ─── Wizard ────────────────────────────────────────────────────────────────
function WizardTab({
  entries, replaceEntries
}: { entries: DeckEntry[]; replaceEntries: (e: DeckEntry[]) => void }) {
  const [archetype, setArchetype] = useState<Archetype>("Midrange");
  const [colors, setColors] = useState<string[]>(["W","U"]);
  const [budget, setBudget] = useState("");
  const [anchors, setAnchors] = useState("");
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const toggleColor = (c: string) =>
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const run = async () => {
    setLoading(true); setDone(false); setWarnings([]);
    try {
      const input: WizardInput = {
        archetype,
        colors,
        budgetUsd: budget ? parseFloat(budget) : null,
        anchorCardIds: anchors.split(",").map(s => s.trim()).filter(Boolean),
      };
      const result = await runBuildWizard(input);
      replaceEntries(result.entries);
      setWarnings(result.warnings);
      setDone(true);
    } catch (e) {
      setWarnings([String(e)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-zinc-100">Build Me a Deck</h3>

      <div>
        <label className="block mb-1 text-xs text-zinc-400">Archetype</label>
        <select value={archetype} onChange={e => setArchetype(e.target.value as Archetype)}
          className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-100 text-xs">
          {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div>
        <label className="block mb-1 text-xs text-zinc-400">Colors</label>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => toggleColor(c)}
              className={`h-7 w-7 rounded-full text-xs font-bold border transition-colors ${
                colors.includes(c)
                  ? "bg-teal-600 border-teal-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-1 text-xs text-zinc-400">Budget cap (USD, optional)</label>
        <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
          placeholder="e.g. 200"
          className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-100 text-xs" />
      </div>

      <div>
        <label className="block mb-1 text-xs text-zinc-400">Anchor card IDs (comma-separated, optional)</label>
        <input type="text" value={anchors} onChange={e => setAnchors(e.target.value)}
          placeholder="Scryfall UUID, UUID, …"
          className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-zinc-100 text-xs" />
      </div>

      <button onClick={run} disabled={loading || colors.length === 0}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500 disabled:opacity-40 transition-colors">
        {loading ? "Building…" : "Generate Deck"}
      </button>

      {done && (
        <div className="rounded bg-emerald-900/40 border border-emerald-700 px-3 py-2 text-xs text-emerald-300">
          ✓ Deck generated and loaded into canvas.
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="rounded bg-yellow-900/30 border border-yellow-700 px-3 py-2 text-xs text-yellow-300">
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}

// ─── Optimize ──────────────────────────────────────────────────────────────
function OptimizeTab({
  entries, replaceEntries
}: { entries: DeckEntry[]; replaceEntries: (e: DeckEntry[]) => void }) {
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const s = await optimizeDeck(entries);
    setSuggestions(s);
    setLoading(false);
  };

  const accept = (swap: SwapSuggestion) => {
    const updated = entries.map(e =>
      e.card.id === swap.remove.id && e.board === "main"
        ? { ...e, card: swap.add }
        : e
    );
    replaceEntries(updated);
    setSuggestions(prev => prev.filter(s => s.remove.id !== swap.remove.id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-100">Optimize Deck</h3>
        <button onClick={run} disabled={loading}
          className="rounded bg-teal-700 px-3 py-1 text-xs hover:bg-teal-600 disabled:opacity-40">
          {loading ? "Analyzing…" : "Run"}
        </button>
      </div>

      {suggestions.length === 0 && !loading && (
        <p className="text-xs text-zinc-500">Click Run to analyze the bottom 10 cards and suggest upgrades.</p>
      )}

      {suggestions.map(s => (
        <div key={s.remove.id} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-400">Remove: {s.remove.name}</span>
            <span className="font-mono text-xs text-zinc-500">{s.scoreBefore.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400">Add: {s.add.name}</span>
            <span className="font-mono text-xs text-zinc-300">{s.scoreAfter.toFixed(1)}</span>
          </div>
          <p className="text-xs text-zinc-500">{s.reason}</p>
          <button onClick={() => accept(s)}
            className="self-end rounded bg-teal-800 px-3 py-1 text-xs hover:bg-teal-700">
            Accept Swap
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Gaps ──────────────────────────────────────────────────────────────────
function MissingTab({ entries }: { entries: DeckEntry[] }) {
  const [reports, setReports] = useState<MissingReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entries.length < 10) return;
    setLoading(true);
    getWhatsMissing(entries).then(r => { setReports(r); setLoading(false); });
  }, [entries]);

  if (entries.length < 10) return <p className="text-xs text-zinc-500">Add at least 10 cards to detect gaps.</p>;
  if (loading) return <p className="text-xs text-zinc-500">Analyzing gaps…</p>;
  if (reports.length === 0) return <p className="text-xs text-zinc-500">No gaps detected. Looking good!</p>;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-zinc-100">What's Missing?</h3>
      {reports.map((r, i) => (
        <div key={i} className="rounded-lg border border-yellow-800/50 bg-yellow-950/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400">⚠</span>
            <span className="font-medium text-zinc-200 text-xs">{r.gap}</span>
          </div>
          <p className="text-xs text-zinc-400 mb-2">{r.message}</p>
          {r.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.suggestions.map(c => (
                <span key={c.id} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Combos ────────────────────────────────────────────────────────────────
function CombosTab({ entries }: { entries: DeckEntry[] }) {
  const combos = useMemo(() => findCombos(entries), [entries]);

  const CONFIDENCE_COLOR: Record<string, string> = {
    high:   "text-emerald-400",
    medium: "text-yellow-400",
    low:    "text-zinc-500",
  };

  if (combos.length === 0) {
    return <p className="text-xs text-zinc-500">No combos detected in the current deck.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-zinc-100">Detected Combos</h3>
      {combos.map((c, i) => (
        <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-200">{c.cardA.name} + {c.cardB.name}</span>
            <span className={`text-xs font-semibold ${CONFIDENCE_COLOR[c.confidence]}`}>
              {c.confidence}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{c.effect}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Budget ────────────────────────────────────────────────────────────────
function BudgetTab({
  entries, replaceEntries
}: { entries: DeckEntry[]; replaceEntries: (e: DeckEntry[]) => void }) {
  const [capStr, setCapStr] = useState("400");
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const a = await analyzeBudget(entries, parseFloat(capStr) || 400);
    setAnalysis(a);
    setLoading(false);
  };

  const acceptSwap = (swap: BudgetAnalysis["swaps"][number]) => {
    const updated = entries.map(e =>
      e.card.id === swap.current.id && e.board === "main"
        ? { ...e, card: swap.upgrade }
        : e
    );
    replaceEntries(updated);
    setAnalysis(prev =>
      prev ? { ...prev, swaps: prev.swaps.filter(s => s.current.id !== swap.current.id) } : null
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-zinc-100">Budget Optimizer</h3>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block mb-1 text-xs text-zinc-400">Target budget (USD)</label>
          <input type="number" value={capStr} onChange={e => setCapStr(e.target.value)}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100" />
        </div>
        <button onClick={run} disabled={loading}
          className="rounded bg-teal-700 px-3 py-1.5 text-xs hover:bg-teal-600 disabled:opacity-40">
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {analysis && (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <div className="text-zinc-500">Current Cost</div>
              <div className="font-mono font-bold text-zinc-100">${analysis.totalCurrentCost.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <div className="text-zinc-500">After Upgrades</div>
              <div className="font-mono font-bold text-zinc-100">${analysis.totalPremiumCost.toFixed(2)}</div>
            </div>
          </div>

          {analysis.swaps.length === 0 ? (
            <p className="text-xs text-zinc-500">No budget-friendly upgrades found within the cap.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {analysis.swaps.map((sw, i) => (
                <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-400">{sw.current.name}</span>
                    <span className="text-xs text-zinc-500">${sw.currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400">{sw.upgrade.name}</span>
                    <span className="text-xs text-zinc-300">${sw.upgradePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500">Score Δ +{sw.scoreDelta.toFixed(2)}</span>
                    <button onClick={() => acceptSwap(sw)}
                      className="rounded bg-teal-800 px-2 py-0.5 text-xs hover:bg-teal-700">
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
