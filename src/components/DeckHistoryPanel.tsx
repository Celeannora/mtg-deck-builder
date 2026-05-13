import { useEffect, useState } from "react";
import { diffDeckVersions, forkDeck, getDeckVersions, restoreDeckVersion } from "../lib/deckHistory";
import type { DeckSnapshot } from "../lib/deckHistory";
import type { DeckVersion } from "../lib/types";

interface Props {
  deckId: string;
  onRestore: (snapshot: DeckSnapshot) => void;
  onFork: (newDeckId: string) => void;
}

type VersionWithId = DeckVersion & { id: number };

export function DeckHistoryPanel({ deckId, onRestore, onFork }: Props) {
  const [versions, setVersions] = useState<VersionWithId[]>([]);
  const [diffA, setDiffA] = useState<number | null>(null);
  const [diffResult, setDiffResult] = useState<{ added: { name: string; delta: number }[]; removed: { name: string; delta: number }[] } | null>(null);

  const reload = async () => {
    const v = await getDeckVersions(deckId);
    setVersions(v as VersionWithId[]);
  };

  useEffect(() => { reload(); }, [deckId]);

  const handleRestore = async (id: number) => {
    const snap = await restoreDeckVersion(id);
    if (snap) onRestore(snap);
  };

  const handleDiff = async (idB: number) => {
    if (diffA === null) { setDiffA(idB); return; }
    const diff = await diffDeckVersions(diffA, idB);
    setDiffResult(diff);
    setDiffA(null);
  };

  const handleFork = async () => {
    const newId = await forkDeck(deckId, "Forked Deck");
    onFork(newId);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Version History</h2>
        <button onClick={handleFork}
          className="rounded-md bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">Fork Deck</button>
      </div>

      {diffA !== null && (
        <p className="text-xs text-teal-400">Select a second version to diff against version #{diffA}</p>
      )}

      {versions.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved versions yet.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{v.name || "Unnamed"}</p>
                <p className="text-xs text-zinc-500">{new Date(v.savedAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDiff(v.id)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    diffA === v.id ? "bg-teal-700 text-white" : "bg-zinc-700 hover:bg-zinc-600"
                  }`}>Diff</button>
                <button onClick={() => handleRestore(v.id)}
                  className="rounded-md bg-teal-800/50 border border-teal-700 px-2 py-1 text-xs hover:bg-teal-700/50">Restore</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {diffResult && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2">
          <p className="text-xs font-semibold text-zinc-400">Diff Result</p>
          {diffResult.added.map((c) => (
            <p key={c.name} className="text-xs text-emerald-400">+ {c.delta}× {c.name}</p>
          ))}
          {diffResult.removed.map((c) => (
            <p key={c.name} className="text-xs text-red-400">− {c.delta}× {c.name}</p>
          ))}
          {diffResult.added.length === 0 && diffResult.removed.length === 0 && (
            <p className="text-xs text-zinc-500">No differences.</p>
          )}
        </div>
      )}
    </div>
  );
}
