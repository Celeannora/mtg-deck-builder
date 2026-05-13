/// <reference lib="webworker" />
import { replaceAllCards } from "../lib/db";
import { extractSetsFromCards, isStandardEligible, toCardRecord } from "../lib/scryfall";
import type {
  CardRecord,
  ImportProgress,
  ImportResult,
  ScryfallCard,
} from "../lib/types";

type WorkerMessage = File | { url: string };

const ctx: DedicatedWorkerGlobalScope = self as never;

function postProgress(progress: ImportProgress) {
  ctx.postMessage({ type: "progress", payload: progress });
}

async function readAsText(source: WorkerMessage): Promise<string> {
  if (source instanceof File) {
    postProgress({ phase: "reading", percent: 5, processed: 0, total: 0, message: `Reading ${source.name}…` });
    return source.text();
  }

  // Network mode — XHR so we can track download progress
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", source.url);
    xhr.responseType = "text";

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 15) + 5; // 5→20%
        postProgress({
          phase: "reading",
          percent: pct,
          processed: e.loaded,
          total: e.total,
          message: `Downloading… ${(e.loaded / 1_048_576).toFixed(1)} / ${(e.total / 1_048_576).toFixed(1)} MB`,
        });
      } else {
        postProgress({
          phase: "reading",
          percent: 10,
          processed: 0,
          total: 0,
          message: "Downloading from Scryfall…",
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else reject(new Error(`Download failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during download"));
    xhr.send();
  });
}

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const source = event.data;

  try {
    const text = await readAsText(source);

    postProgress({ phase: "parsing", percent: 20, processed: 0, total: 0, message: "Parsing JSON…" });

    const parsed = JSON.parse(text) as ScryfallCard[];
    const total = parsed.length;
    const importedAt = new Date().toISOString();

    postProgress({ phase: "transforming", percent: 35, processed: 0, total, message: "Filtering Standard-legal cards…" });

    const records: CardRecord[] = [];
    let skipped = 0;

    for (let i = 0; i < parsed.length; i++) {
      const card = parsed[i];
      if (isStandardEligible(card)) {
        records.push(toCardRecord(card, importedAt));
      } else {
        skipped++;
      }

      if (i % 5000 === 0) {
        const percent = 35 + Math.round((i / total) * 45);
        postProgress({
          phase: "transforming",
          percent,
          processed: i,
          total,
          message: `Processed ${i.toLocaleString()} / ${total.toLocaleString()} cards`,
        });
      }
    }

    postProgress({ phase: "saving", percent: 82, processed: records.length, total, message: "Extracting sets…" });
    const sets = extractSetsFromCards(records, importedAt);

    postProgress({ phase: "saving", percent: 88, processed: records.length, total, message: "Saving to IndexedDB…" });
    await replaceAllCards(records, sets, importedAt);

    const result: ImportResult = {
      imported: records.length,
      skipped,
      totalSeen: total,
      setsExtracted: sets.length,
      timestamp: importedAt,
    };

    postProgress({ phase: "done", percent: 100, processed: records.length, total, message: `Imported ${records.length.toLocaleString()} cards across ${sets.length} sets` });
    ctx.postMessage({ type: "done", payload: result });
  } catch (error) {
    ctx.postMessage({
      type: "error",
      payload: error instanceof Error ? error.message : "Unknown import error",
    });
  }
};
