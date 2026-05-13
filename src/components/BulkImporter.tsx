import { useMemo, useRef, useState } from "react";
import type { ImportProgress, ImportResult } from "../lib/types";

interface Props {
  onImportDone?: () => void;
}

export function BulkImporter({ onImportDone }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result,   setResult]   = useState<ImportResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const worker = useMemo(
    () => new Worker(new URL("../workers/importWorker.ts", import.meta.url), { type: "module" }),
    []
  );

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setResult(null);
    worker.onmessage = (msg: MessageEvent) => {
      const { type, payload } = msg.data;
      if (type === "progress") setProgress(payload as ImportProgress);
      if (type === "done")     { setResult(payload as ImportResult); onImportDone?.(); }
      if (type === "error")    setError(String(payload));
    };
    worker.postMessage(file);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Import Scryfall Bulk File</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Download <code className="text-teal-400">oracle_cards.json</code> from{" "}
          <a href="https://scryfall.com/docs/api/bulk-data" target="_blank" rel="noopener noreferrer"
            className="underline text-teal-400 hover:text-teal-200">
            Scryfall Bulk Data
          </a>{" "}and select it below.
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          The file is ~150 MB. Import runs in a background thread and may take 10–30 seconds.
        </p>
      </div>

      <input ref={inputRef} type="file" accept=".json,application/json"
        className="hidden" onChange={onFileChange} />

      <button onClick={onPickFile}
        className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium hover:bg-teal-500 active:bg-teal-700 transition-colors">
        Choose Bulk File
      </button>

      {progress && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
            <span>{progress.message}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm">
          <div className="font-semibold text-emerald-300 mb-1">✓ Import complete</div>
          <div className="text-zinc-300">Standard-legal cards: <strong>{result.imported.toLocaleString()}</strong></div>
          <div className="text-zinc-500">Skipped: {result.skipped.toLocaleString()} · Total seen: {result.totalSeen.toLocaleString()}</div>
          <div className="mt-2 text-xs text-zinc-600">Cached at: {new Date(result.timestamp).toLocaleString()}</div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          <div className="font-semibold mb-1">Import Error</div>
          {error}
        </div>
      )}
    </section>
  );
}
