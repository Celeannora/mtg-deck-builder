import { useMemo, useRef, useState } from "react";
import type { ImportProgress, ImportResult } from "../lib/types";
import { discoverOracleCardsDumpUri } from "../lib/scryfallApi";

type ImportMode = "file" | "network";

interface Props {
  onImportDone?: () => void;
}

export function BulkImporter({ onImportDone }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode]       = useState<ImportMode>("file");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult]   = useState<ImportResult | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const worker = useMemo(
    () => new Worker(new URL("../workers/importWorker.ts", import.meta.url), { type: "module" }),
    []
  );

  function attachWorkerListeners() {
    worker.onmessage = (msg: MessageEvent) => {
      const { type, payload } = msg.data;
      if (type === "progress") setProgress(payload as ImportProgress);
      if (type === "done") {
        setResult(payload as ImportResult);
        onImportDone?.();
      }
      if (type === "error") setError(String(payload));
    };
  }

  const onPickFile = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setResult(null); setProgress(null);
    attachWorkerListeners();
    worker.postMessage(file);
  };

  const onNetworkImport = async () => {
    setError(null); setResult(null); setProgress(null);
    setDiscovering(true);
    try {
      const dump = await discoverOracleCardsDumpUri();
      setDiscovering(false);
      attachWorkerListeners();
      worker.postMessage({ url: dump.downloadUri });
    } catch (err) {
      setDiscovering(false);
      setError(err instanceof Error ? err.message : "Failed to discover Scryfall dump URL");
    }
  };

  const isRunning = progress !== null && progress.phase !== "done" && !error;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Import Card Database</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Load card data from a local Scryfall bulk file or download directly.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-5 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {(["file", "network"] as ImportMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={isRunning}
            className={`rounded px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {m === "file" ? "Local File" : "Download from Scryfall"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div>
          <p className="mb-3 text-xs text-zinc-500">
            Download <code className="text-teal-400">oracle_cards.json</code> from{" "}
            <a href="https://scryfall.com/docs/api/bulk-data" target="_blank" rel="noopener noreferrer"
              className="text-teal-400 underline hover:text-teal-200">Scryfall Bulk Data</a>
            {" "}then select the file below.
          </p>
          <input ref={inputRef} type="file" accept=".json,application/json"
            className="hidden" onChange={onFileChange} />
          <button onClick={onPickFile} disabled={isRunning}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 transition-colors">
            Choose File
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs text-zinc-500">
            Fetches the latest <code className="text-teal-400">oracle_cards</code> dump directly from
            Scryfall (~150 MB). Requires an internet connection.
          </p>
          <button onClick={onNetworkImport} disabled={isRunning || discovering}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium hover:bg-teal-500 active:bg-teal-700 disabled:opacity-50 transition-colors">
            {discovering ? "Discovering…" : "Download & Import"}
          </button>
        </div>
      )}

      {progress && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-300">{progress.message}</span>
            <span className="tabular-nums text-zinc-500">{progress.percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm">
          <div className="font-semibold text-emerald-300 mb-2">✓ Import complete</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
            <dt className="text-zinc-500">Standard-legal cards</dt>
            <dd className="font-medium tabular-nums">{result.imported.toLocaleString()}</dd>
            <dt className="text-zinc-500">Sets extracted</dt>
            <dd className="font-medium tabular-nums">{result.setsExtracted.toLocaleString()}</dd>
            <dt className="text-zinc-500">Skipped</dt>
            <dd className="tabular-nums text-zinc-500">{result.skipped.toLocaleString()}</dd>
            <dt className="text-zinc-500">Total seen</dt>
            <dd className="tabular-nums text-zinc-500">{result.totalSeen.toLocaleString()}</dd>
          </dl>
          <div className="mt-3 text-xs text-zinc-600">Cached at: {new Date(result.timestamp).toLocaleString()}</div>
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
