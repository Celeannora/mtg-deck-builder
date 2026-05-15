import { useState } from "react";
import { BulkImporter } from "./BulkImporter";

type Step = "welcome" | "download" | "import";

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-lg">

        {/* Logo / title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12" aria-hidden="true">
            <rect width="48" height="48" rx="10" fill="#134e4a" />
            <path d="M24 8 L38 18 L38 30 L24 40 L10 30 L10 18 Z" stroke="#2dd4bf" strokeWidth="2" fill="none" />
            <path d="M24 14 L33 20 L33 28 L24 34 L15 28 L15 20 Z" fill="#0f766e" stroke="#2dd4bf" strokeWidth="1.5" />
            <text x="24" y="29" textAnchor="middle" fill="#ccfbf1" fontSize="11" fontWeight="bold" fontFamily="monospace">MTG</text>
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">MTG Deck Builder</h1>
            <p className="mt-1 text-sm text-zinc-500">Offline deck builder powered by Scryfall data</p>
          </div>
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-1 text-base font-semibold text-zinc-100">Welcome! Let's get you set up.</h2>
            <p className="mb-5 text-sm text-zinc-400">
              This app works fully offline but needs a one-time card database import from Scryfall
              (about 30 MB). The process takes ~30 seconds.
            </p>

            <ol className="mb-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">1</span>
                <span className="text-zinc-300">Download the <strong className="text-zinc-100">oracle_cards</strong> bulk file from Scryfall (free, ~30 MB)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">2</span>
                <span className="text-zinc-300">Import it here — cards are stored locally in your browser</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">3</span>
                <span className="text-zinc-300">Start building decks — no internet required after this</span>
              </li>
            </ol>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("download")}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* Step: Download */}
        {step === "download" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <button onClick={() => setStep("welcome")} className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true"><path d="M19 12H5m0 0 7 7m-7-7 7-7" /></svg>
              Back
            </button>

            <h2 className="mb-1 text-base font-semibold text-zinc-100">Step 1 — Download Card Data</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Download the <strong className="text-zinc-200">oracle_cards</strong> JSON file from Scryfall.
              This is a free bulk export of every unique card.
            </p>

            <a
              href="https://data.scryfall.io/oracle-cards/oracle-cards-20250101100156.json"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm hover:border-teal-600 hover:bg-zinc-700 transition-colors group"
            >
              <div>
                <div className="font-medium text-zinc-100 group-hover:text-teal-300">oracle_cards.json</div>
                <div className="text-xs text-zinc-500">Scryfall bulk data · ~30 MB</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0 text-zinc-500 group-hover:text-teal-400" aria-hidden="true">
                <path d="M12 16V4" /><path d="m8 12 4 4 4-4" /><path d="M2 20h20" />
              </svg>
            </a>

            <p className="mb-5 text-xs text-zinc-500">
              Or go to{" "}
              <a href="https://scryfall.com/docs/api/bulk-data" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline">
                scryfall.com/docs/api/bulk-data
              </a>
              {" "}and download <em>Oracle Cards</em> manually.
            </p>

            <button
              onClick={() => setStep("import")}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors"
            >
              I've Downloaded It — Continue to Import
            </button>
          </div>
        )}

        {/* Step: Import */}
        {step === "import" && (
          <div>
            <button onClick={() => setStep("download")} className="mb-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true"><path d="M19 12H5m0 0 7 7m-7-7 7-7" /></svg>
              Back
            </button>
            <BulkImporter onImportDone={onDone} />
          </div>
        )}

      </div>
    </main>
  );
}
