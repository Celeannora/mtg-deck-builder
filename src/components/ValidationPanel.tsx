import { useDeckStore } from "../store/deckStore";

const RULE_LABELS: Record<string, string> = {
  MIN_60: "Mainboard ≥ 60 cards",
  OVER_60: "Deck size optimal",
  SIDEBOARD_SIZE: "Sideboard 0 or 15",
  COPY_LIMIT: "≤ 4 copies per card",
  NOT_STANDARD_LEGAL: "All cards Standard-legal",
  BANNED: "No banned cards"
};

export function ValidationPanel() {
  const { validation, companionCheck, entries } = useDeckStore();
  const { mainCount, sideCount } = validation;
  const isLegal = validation.legal && (!companionCheck || companionCheck.satisfied);

  const allRules = ["MIN_60", "SIDEBOARD_SIZE", "COPY_LIMIT", "NOT_STANDARD_LEGAL", "BANNED"];
  const violationRuleSet = new Set(validation.violations.map(v => v.rule));

  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of entries.filter(e => e.board === "main")) {
    const colors: string[] = JSON.parse(entry.card.colorsJson || "[]");
    for (const c of colors) {
      if (c in colorCounts) colorCounts[c] += entry.quantity;
    }
  }
  const totalPips = Object.values(colorCounts).reduce((s, n) => s + n, 0);

  const COLOR_HEX: Record<string, string> = {
    W: "#f8f4e8",
    U: "#3b82f6",
    B: "#1f1f1f",
    R: "#ef4444",
    G: "#22c55e"
  };

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-100">
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-base ${
        isLegal ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"
      }`}>
        <span>{isLegal ? "✅" : "❌"}</span>
        <span>{isLegal ? "DECK LEGAL" : "DECK ILLEGAL"}</span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2 font-mono">
        <span>
          Mainboard:{" "}
          <span className={mainCount === 60 ? "text-emerald-400" : mainCount < 60 ? "text-red-400" : "text-yellow-400"}>
            {mainCount}/60
          </span>
        </span>
        <span className="text-zinc-500">|</span>
        <span>
          Sideboard:{" "}
          <span className={sideCount === 0 || sideCount === 15 ? "text-emerald-400" : "text-red-400"}>
            {sideCount}/15
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {allRules.map(rule => {
          const passing = !violationRuleSet.has(rule);
          const violation = validation.violations.find(v => v.rule === rule);
          return (
            <div key={rule} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className={passing ? "text-emerald-400" : "text-red-400"}>
                  {passing ? "✓" : "✗"}
                </span>
                <span className={passing ? "text-zinc-300" : "text-red-300"}>
                  {RULE_LABELS[rule] ?? rule}
                </span>
              </div>
              {violation?.cardNames && violation.cardNames.length > 0 && (
                <div className="ml-5 text-xs text-red-400/80">
                  {violation.cardNames.slice(0, 5).join(", ")}
                  {violation.cardNames.length > 5 && ` +${violation.cardNames.length - 5} more`}
                </div>
              )}
            </div>
          );
        })}

        {companionCheck && (
          <div className="flex flex-col gap-0.5 mt-1 border-t border-zinc-800 pt-2">
            <div className="flex items-center gap-2">
              <span className={companionCheck.satisfied ? "text-emerald-400" : "text-red-400"}>
                {companionCheck.satisfied ? "✓" : "✗"}
              </span>
              <span className={companionCheck.satisfied ? "text-zinc-300" : "text-red-300"}>
                {companionCheck.companionName} restriction
              </span>
            </div>
            {!companionCheck.satisfied && companionCheck.failureReason && (
              <div className="ml-5 text-xs text-red-400/80">
                {companionCheck.failureReason}
              </div>
            )}
          </div>
        )}
      </div>

      {totalPips > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Color Distribution</span>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {Object.entries(colorCounts)
              .filter(([, count]) => count > 0)
              .map(([color, count]) => (
                <div
                  key={color}
                  style={{
                    width: `${(count / totalPips) * 100}%`,
                    backgroundColor: COLOR_HEX[color]
                  }}
                  title={`${color}: ${count} pips`}
                />
              ))}
          </div>
          <div className="flex gap-2 text-xs text-zinc-400">
            {Object.entries(colorCounts)
              .filter(([, count]) => count > 0)
              .map(([color, count]) => (
                <span key={color}>{color}: {count}</span>
              ))}
          </div>
        </div>
      )}
    </aside>
  );
}
