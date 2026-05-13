/**
 * Phase 2 — Persistent Validation Panel
 *
 * Always-visible panel showing:
 *  - DECK LEGAL / DECK ILLEGAL badge
 *  - Mainboard / Sideboard card counts
 *  - Rotation warning banner
 *  - All violations (errors) with card names
 *  - All warnings
 */

import { useDeckStore } from "../store/deckStore";
import type { LegalityViolation, RotationBanner } from "../lib/legality";

interface Props {
  rotationBanner?: RotationBanner;
}

function ViolationRow({ v }: { v: LegalityViolation }) {
  const colors =
    v.severity === "error"
      ? "border-red-800 bg-red-950/40 text-red-300"
      : "border-yellow-700 bg-yellow-950/40 text-yellow-200";

  return (
    <li
      className={`rounded-md border px-3 py-2 text-xs leading-snug ${colors}`}
      role="listitem"
    >
      <span className="mr-1 font-semibold uppercase tracking-wide opacity-70">
        {v.severity === "error" ? "✖" : "⚠"}
      </span>
      {v.message}
      {v.cardNames && v.cardNames.length > 0 && (
        <ul className="mt-1 list-disc pl-4 opacity-80">
          {v.cardNames.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ValidationPanel({ rotationBanner }: Props) {
  const { validation } = useDeckStore();
  const { legal, mainboardCount, sideboardCount, violations, warnings } = validation;

  const allIssues: LegalityViolation[] = [...violations, ...warnings];

  return (
    <aside
      aria-label="Deck Validation"
      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
    >
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase ${
            legal
              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
              : "bg-red-900/60 text-red-300 border border-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {legal ? "✔ Deck Legal" : "✖ Deck Illegal"}
        </span>

        <div className="flex gap-4 text-xs text-zinc-400">
          <span>
            Mainboard{" "}
            <span
              className={`font-mono font-semibold ${
                mainboardCount === 60
                  ? "text-emerald-400"
                  : mainboardCount < 60
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {mainboardCount}
            </span>
            /60
          </span>
          <span>
            Sideboard{" "}
            <span
              className={`font-mono font-semibold ${
                sideboardCount === 0 || sideboardCount === 15
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {sideboardCount}
            </span>
            /15
          </span>
        </div>
      </div>

      {/* Rotation warning banner */}
      {rotationBanner?.show && (
        <div
          role="alert"
          className="rounded-md border border-yellow-700 bg-yellow-950/40 px-3 py-2 text-xs text-yellow-200"
        >
          ⏳ {rotationBanner.message}
        </div>
      )}

      {/* Issues list */}
      {allIssues.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Deck issues">
          {allIssues.map((v, i) => (
            <ViolationRow key={`${v.code}-${i}`} v={v} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500">No issues found.</p>
      )}
    </aside>
  );
}
