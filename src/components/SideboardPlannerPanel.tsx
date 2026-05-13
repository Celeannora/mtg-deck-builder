import { useEffect, useState } from "react";
import type { ArchetypeEntry, SideboardPlan, SideboardPlanEntry } from "../lib/metaTypes";
import { deleteSideboardPlan, getSideboardPlans, saveSideboardPlan } from "../lib/metaStore";

interface Props {
  deckId: string;
  snapshot: ArchetypeEntry[];
}

export function SideboardPlannerPanel({ deckId, snapshot }: Props) {
  const [plans, setPlans] = useState<SideboardPlan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<SideboardPlan | null>(null);
  const [newEntry, setNewEntry] = useState({ cardName: "", quantity: 1, direction: "in" as "in" | "out" });

  const reload = async () => {
    const p = await getSideboardPlans(deckId);
    setPlans(p);
  };

  useEffect(() => { reload(); }, [deckId]);

  const openPlan = (vsArchetype: string) => {
    const existing = plans.find((p) => p.vsArchetype === vsArchetype);
    setSelected(vsArchetype);
    setEditPlan(existing ?? {
      deckId,
      vsArchetype,
      entries: [],
      notes: "",
      updatedAt: new Date().toISOString(),
    });
  };

  const addEntry = () => {
    if (!editPlan || !newEntry.cardName.trim()) return;
    const updated: SideboardPlan = {
      ...editPlan,
      entries: [...editPlan.entries, { ...newEntry }],
      updatedAt: new Date().toISOString(),
    };
    setEditPlan(updated);
    setNewEntry({ cardName: "", quantity: 1, direction: "in" });
  };

  const removeEntry = (idx: number) => {
    if (!editPlan) return;
    const entries = editPlan.entries.filter((_, i) => i !== idx);
    setEditPlan({ ...editPlan, entries });
  };

  const savePlan = async () => {
    if (!editPlan) return;
    await saveSideboardPlan({ ...editPlan, updatedAt: new Date().toISOString() });
    await reload();
  };

  const deletePlan = async (id?: number) => {
    if (id === undefined) return;
    await deleteSideboardPlan(id);
    setSelected(null);
    setEditPlan(null);
    await reload();
  };

  // Coverage heatmap: for each sideboard card, count archetypes with an "in" entry for that card
  const coverageMap: Record<string, number> = {};
  for (const plan of plans) {
    for (const e of plan.entries) {
      if (e.direction === "in") {
        coverageMap[e.cardName] = (coverageMap[e.cardName] ?? 0) + 1;
      }
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 space-y-5">
      <h2 className="text-lg font-semibold">Sideboard Planner</h2>

      {/* Archetype list */}
      <div className="grid grid-cols-2 gap-2">
        {snapshot.slice(0, 8).map((a) => {
          const hasPlan = plans.some((p) => p.vsArchetype === a.name);
          return (
            <button
              key={a.name}
              onClick={() => openPlan(a.name)}
              className={`rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                selected === a.name
                  ? "bg-teal-700 text-white"
                  : hasPlan
                  ? "bg-zinc-800 text-zinc-200"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <span className="block font-medium truncate">{a.name}</span>
              <span className="text-xs opacity-70">{a.metaShare.toFixed(1)}% field{hasPlan ? " · plan saved" : ""}</span>
            </button>
          );
        })}
      </div>

      {/* Plan editor */}
      {editPlan && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm font-semibold">vs {editPlan.vsArchetype}</p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="text-left pb-1">Card</th>
                <th className="text-center pb-1">Qty</th>
                <th className="text-center pb-1">In/Out</th>
                <th className="text-center pb-1">Coverage</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {editPlan.entries.map((e, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="py-1 text-zinc-200">{e.cardName}</td>
                  <td className="py-1 text-center tabular-nums">{e.quantity}</td>
                  <td className={`py-1 text-center font-medium ${
                    e.direction === "in" ? "text-emerald-400" : "text-red-400"
                  }`}>{e.direction === "in" ? "+" : "−"}</td>
                  <td className="py-1 text-center text-zinc-500">
                    {e.direction === "in" ? (
                      <span className={(
                        coverageMap[e.cardName] ?? 1) >= 3
                        ? "text-emerald-400"
                        : (coverageMap[e.cardName] ?? 1) <= 1
                        ? "text-red-400"
                        : "text-yellow-400"
                      }>
                        {coverageMap[e.cardName] ?? 1} matchup{(coverageMap[e.cardName] ?? 1) !== 1 ? "s" : ""}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-1 text-right">
                    <button onClick={() => removeEntry(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add entry */}
          <div className="flex gap-2 items-end">
            <input
              className="flex-1 rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Card name"
              value={newEntry.cardName}
              onChange={(e) => setNewEntry((p) => ({ ...p, cardName: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              max={4}
              className="w-12 rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={newEntry.quantity}
              onChange={(e) => setNewEntry((p) => ({ ...p, quantity: Number(e.target.value) }))}
            />
            <select
              className="rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={newEntry.direction}
              onChange={(e) => setNewEntry((p) => ({ ...p, direction: e.target.value as "in" | "out" }))}
            >
              <option value="in">+in</option>
              <option value="out">−out</option>
            </select>
            <button onClick={addEntry} className="rounded-md bg-teal-700 px-3 py-1 text-sm hover:bg-teal-600">Add</button>
          </div>

          <textarea
            className="w-full rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500 h-16"
            placeholder="Matchup notes (optional)..."
            value={editPlan.notes ?? ""}
            onChange={(e) => setEditPlan((p) => p ? { ...p, notes: e.target.value } : p)}
          />

          <div className="flex gap-2">
            <button onClick={savePlan} className="rounded-md bg-teal-700 px-4 py-1.5 text-sm font-medium hover:bg-teal-600">Save Plan</button>
            {editPlan.id !== undefined && (
              <button onClick={() => deletePlan(editPlan.id)} className="rounded-md bg-red-900/50 px-4 py-1.5 text-sm hover:bg-red-900">Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
