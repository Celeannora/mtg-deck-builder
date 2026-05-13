import { useEffect, useState } from "react";
import { getDatabaseStatus } from "../lib/db";
import type { DatabaseStatus } from "../lib/types";

interface Props {
  onRequestImport?: () => void;
}

export function DatabaseStatusBar({ onRequestImport }: Props) {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);

  async function refresh() {
    try {
      const s = await getDatabaseStatus();
      setStatus(s);
    } catch {
      // DB not yet initialised — silently ignore
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!status || status.isEmpty) return null;

  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b border-zinc-800/60 bg-zinc-950 px-4 text-xs text-zinc-500">
      <span className="tabular-nums">
        <span className="text-zinc-300 font-medium">{status.cardCount.toLocaleString()}</span> cards
      </span>
      <span className="text-zinc-700">·</span>
      <span className="tabular-nums">
        <span className="text-zinc-300 font-medium">{status.setCount.toLocaleString()}</span> sets
      </span>
      {status.lastImportedAt && (
        <>
          <span className="text-zinc-700">·</span>
          <span>Updated {new Date(status.lastImportedAt).toLocaleDateString()}</span>
        </>
      )}
      {status.isStale && (
        <>
          <span className="text-zinc-700">·</span>
          <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-amber-400">May be outdated</span>
          <button
            onClick={onRequestImport}
            className="ml-1 rounded px-2 py-0.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            ↻ Refresh
          </button>
        </>
      )}
      <span className="ml-auto">
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-300 transition-colors"
        >
          Data by Scryfall
        </a>
      </span>
    </div>
  );
}
