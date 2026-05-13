"""
Orchestrates the full import pipeline in a background thread.
Calls parser → database, reporting progress at each stage.
Thread-safe: posts results via queue.Queue so the GUI can poll.
"""
from __future__ import annotations

import queue
import threading
from dataclasses import dataclass

from .database import clear_and_insert_cards, init_db, save_import_meta
from .parser import parse_bulk_file


@dataclass
class ProgressEvent:
    processed: int
    total: int
    phase: str          # "reading" | "parsing" | "transforming" | "saving" | "done" | "error"
    message: str
    percent: float = 0.0

    def __post_init__(self):
        if self.total > 0:
            self.percent = min(100.0, self.processed / self.total * 100)


class ImportWorker:
    """
    Run the bulk import in a daemon thread.
    Caller polls self.events (queue.Queue) for ProgressEvent objects.
    Final event has phase == "done" or "error".
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.events: queue.Queue[ProgressEvent] = queue.Queue()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self) -> None:
        self._thread.start()

    def _post(self, processed: int, total: int, phase: str, message: str) -> None:
        self.events.put(ProgressEvent(processed, total, phase, message))

    def _run(self) -> None:
        try:
            init_db()
            self._post(0, 0, "reading", "Reading file…")

            def parse_progress(processed, total, message):
                phase = "transforming" if total > 0 else "parsing"
                self._post(processed, total, phase, message)

            cards, meta = parse_bulk_file(self.filepath, progress_cb=parse_progress)

            self._post(0, len(cards), "saving", "Saving cards to database…")

            def save_progress(processed, total, message):
                self._post(processed, total, "saving", message)

            clear_and_insert_cards(cards, progress_cb=save_progress)
            save_import_meta(meta)

            self._post(
                meta["imported"],
                meta["total_seen"],
                "done",
                (
                    f"\u2705  Import complete — "
                    f"{meta['imported']:,} cards imported, "
                    f"{meta['skipped']:,} skipped."
                ),
            )
        except Exception as exc:
            self._post(0, 0, "error", f"\u274c  {exc}")
