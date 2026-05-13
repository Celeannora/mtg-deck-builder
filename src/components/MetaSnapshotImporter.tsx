import { useRef, useState } from "react";
import { buildAndSaveSnapshot, importMetaFromCSV, importMetaFromJSON } from "../lib/metaSources";
import type { ArchetypeEntry, MetaSnapshot } from "../lib/metaTypes";
import { getLatestSnapshot } from "../lib/metaStore";

interface Props {
  onImported?: (snapshot: MetaSnapshot) => void;
}

type ImportMode = "json" | "csv" | "paste";

export function MetaSnapshotImporter({ onImported }: Props) {
  const [mode, setMode] = useState<ImportMode>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleImport = async (raw: string, source: MetaSnapshot["source"]) => {
    setError(null);
    setStatus(null);
    try {
      let archetypes: ArchetypeEntry[];
      if (source === "json") archetypes = importMetaFromJSON(raw);
      else if (source === "csv") archetypes = importMetaFromCSV(raw);
      else archetypes = raw.trim().startsWith("[") ? importMetaFromJSON(raw) : importMetaFromCSV(raw);

      if (archetypes.length === 0) throw new Error("No archetypes parsed — check format.");

      await buildAndSaveSnapshot(archetypes, source, raw);
      const latest = await getLatestSnapshot();
      if (latest) onImported?.(latest);
      setStatus(`Imported ${archetypes.length} archetypes.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      handleImport(text, mode === "json" ? "json" : "csv");
    };
    reader.readAsText(file);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100">
      <h2 className="mb-3 text-lg font-semibold">Meta Snapshot Import</h2>

      <div className="mb-4 flex gap-2">
        {(["paste", "json", "csv"] as ImportMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              mode === m ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      {mode === "paste" && (
        <>
          <textarea
            className="mb-3 h-32 w-full rounded-lg bg-zinc-900 p-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder={
              '[{"name":"Dimir Midrange","metaShare":6.7,"colors":"UB","tier":1}, ...]\nOR\nname,metaShare,colors,tier\nDimir Midrange,6.7,UB,1'
            }
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
          />
          <button
            onClick={() => handleImport(pasteValue, "json")}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
          >
            Import
          </button>
        </>
      )}

      {(mode === "json" || mode === "csv") && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={mode === "json" ? ".json,application/json" : ".csv,text/csv"}
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
          >
            Choose {mode.toUpperCase()} File
          </button>
        </>
      )}

      {status && <p className="mt-3 text-sm text-emerald-400">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
