import type { ValidationResult, Warning } from "../lib/legality";

interface Props {
  result: ValidationResult | null;
}

const RULE_LABELS: Record<string, string> = {
  MIN_DECK_SIZE: "Minimum 60 cards",
  MAX_COPIES: "Max 4 copies",
  SIDEBOARD_SIZE: "Sideboard 0 or 15",
  BANNED_CARD: "No banned cards",
  NOT_STANDARD_LEGAL: "All cards Standard-legal",
  COMPANION_RESTRICTION: "Companion restriction",
};

const ALL_RULES = Object.keys(RULE_LABELS);

export function ValidationPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-400 text-sm">
        No deck loaded.
      </div>
    );
  }

  const violatedRules = new Set(result.violations.map((v) => v.rule));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
          result.legal
            ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
            : "bg-red-900/50 text-red-300 border border-red-700"
        }`}
      >
        {result.legal ? "✅ DECK LEGAL" : "❌ DECK ILLEGAL"}
      </div>

      <div className="text-xs text-zinc-400 font-mono">
        Mainboard: {result.mainboardCount}/60 &nbsp;|&nbsp; Sideboard:{" "}
        {result.sideboardCount}/15
      </div>

      <ul className="space-y-1">
        {ALL_RULES.map((rule) => {
          const ok = !violatedRules.has(rule);
          return (
            <li key={rule} className="flex items-start gap-2 text-sm">
              <span className={ok ? "text-emerald-400" : "text-red-400"}>
                {ok ? "✅" : "❌"}
              </span>
              <span className={ok ? "text-zinc-300" : "text-red-300"}>
                {RULE_LABELS[rule]}
                {!ok && (
                  <span className="block text-xs text-red-400 mt-0.5">
                    {result.violations.find((v) => v.rule === rule)?.message}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {result.warnings.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">
            Warnings
          </div>
          {result.warnings.map((w, i) => (
            <WarningRow key={i} warning={w} />
          ))}
        </div>
      )}
    </div>
  );
}

function WarningRow({ warning }: { warning: Warning }) {
  const icon =
    warning.type === "rotation" ? "🔄" : warning.type === "future" ? "🔮" : "⚠️";
  return (
    <div className="flex items-start gap-2 text-sm text-yellow-300">
      <span>{icon}</span>
      <span>{warning.message}</span>
    </div>
  );
}
