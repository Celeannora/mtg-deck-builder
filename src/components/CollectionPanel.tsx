import { useEffect, useState } from "react";
import { getCollection, getMissingCards, importFromArenaCSV, markOwned } from "../lib/collectionStore";
import type { MissingCard, OwnedCard } from "../lib/collectionStore";
import { db } from "../lib/db";

interface DeckCardRef { oracleId: string; name: string; quantity: number; priceUsd: number | null; }

interface Props {
  deckCards: DeckCardRef[];
}

export function CollectionPanel({ deckCards }: Props) {
  const [missing, setMissing] = useState<MissingCard[]>([]);
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [csvImportStatus, setCsvImportStatus] = useState<string | null>(null);
  const fileRef = { current: null as HTMLInputElement | null };

  const reload = async () => {
    const [m, c] = await Promise.all([getMissingCards(deckCards), getCollection()]);
    setMissing(m);
    setCollection(c);
  };

  useEffect(() => { reload(); }, [deckCards.map((d) => d.oracleId).join(",")]);

  const toggleOwned = async (oracleId: string, currentOwned: number, needed: number) => {
    const newQty = currentOwned >= needed ? 0 : needed;
    await markOwned(oracleId, newQty);
    await reload();
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const count = await importFromArenaCSV(reader.result as string);
      setCsvImportStatus(`Imported ${count} cards from collection.`);
      await reload();
    };
    reader.readAsText(file);
  };

  const totalAcquireCost = missing.reduce((sum, m) => sum + (m.acquireCost ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collection</h2>
        <button onClick={() => fileRef.current?.click()}
          className="rounded-md bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700">
          Import Arena CSV
        </button>
        <input ref={(el) => { fileRef.current = el; }} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
      </div>

      {csvImportStatus && <p className="text-xs text-emerald-400">{csvImportStatus}</p>}

      {missing.length === 0 ? (
        <p className="text-sm text-zinc-400">You own all cards in this deck. ✓</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">{missing.length} cards missing</span>
            <span className="font-semibold tabular-nums">
              Total acquire cost: ${totalAcquireCost.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {missing.map((m) => (
              <div key={m.oracleId} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-zinc-500">
                    Own {m.owned}/{m.quantity} · Need {m.needed} ·
                    {m.priceUsd != null ? ` $${m.priceUsd.toFixed(2)}/ea` : " price N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={m.tcgPlayerUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-teal-400 hover:text-teal-300">TCGPlayer ↗</a>
                  <button
                    onClick={() => toggleOwned(m.oracleId, m.owned, m.quantity)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      m.owned >= m.quantity ? "bg-emerald-800 text-emerald-300" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}>
                    {m.owned >= m.quantity ? "Owned" : "Mark Owned"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
