import { useMemo, useRef, useState } from "react";
import type { ImportProgress, ImportResult } from "../lib/types";

export function BulkImporter() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const worker = useMemo(
    () => new Worker(new URL("../workers/importWorker.ts", import.meta.url), { type: "module" }),
    []
  );

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    worker.onmessage = (msg: MessageEvent) => {
      const { type, payload } = msg.data;
      if (type === "progress") setProgress(payload as ImportProgress);
      if (type === "done") setResult(payload as ImportResult);
      if (type === "error") setError(String(payload));
    };

    worker.postMessage(file);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Phase 1: Load Scryfall Bulk File</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Select your local <code>oracle_cards.json</code> file.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onFileChange}
      />

      <button
        onClick={onPickFile}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
      >
        Choose Bulk File
      </button>

      {progress && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
            <span>{progress.message}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm">
          <div>Imported: {result.imported.toLocaleString()}</div>
          <div>Skipped: {result.skipped.toLocaleString()}</div>
          <div>Total seen: {result.totalSeen.toLocaleString()}</div>
          <div>Timestamp: {result.timestamp}</div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </section>
  );
}
