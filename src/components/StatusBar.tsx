import { useEffect, useState } from "react";
import { db } from "../lib/db";

interface Status {
  cardCount: number | null;
  lastImportedAt: string | null;
}

export function StatusBar() {
  const [status, setStatus] = useState<Status>({
    cardCount: null,
    lastImportedAt: null,
  });

  useEffect(() => {
    async function load() {
      const [countRow, dateRow] = await Promise.all([
        db.meta.get("cardCount"),
        db.meta.get("lastImportedAt"),
      ]);
      setStatus({
        cardCount: countRow ? Number(countRow.value) : null,
        lastImportedAt: dateRow?.value ?? null,
      });
    }
    load();
  }, []);

  const formattedDate = status.lastImportedAt
    ? new Date(status.lastImportedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <footer className="flex items-center gap-4 px-4 py-1.5 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500 select-none">
      <span className="text-teal-600 font-semibold">MTG Deck Builder</span>

      {status.cardCount !== null ? (
        <span>{status.cardCount.toLocaleString()} Standard cards loaded</span>
      ) : (
        <span className="text-zinc-600">No database — import a bulk file to begin</span>
      )}

      {formattedDate && <span>Updated {formattedDate}</span>}

      <span className="ml-auto">
        Card data &amp; images via{" "}
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-400 transition-colors"
        >
          Scryfall
        </a>
        {" "}· © Wizards of the Coast
      </span>
    </footer>
  );
}
