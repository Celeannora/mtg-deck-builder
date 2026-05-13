"""
Phase 1 GUI — Bulk Import Panel (customtkinter).

Layout:
  ┌─ Database Status ────────────────────────────────────┐
  │  Cards in database | Last import | File size  [Load New File]  │
  ├─ Import ─────────────────────────────────────────┤
  │  [path entry  ─────────────────────] [📂]              │
  │  [═══════════════════ 68% ═════════════════]      │
  │  Processed 42,000 / 62,000 cards…                           │
  ├─ Import Log ────────────────────────────────────┤
  │  > Reading file… / > ✅ Import complete                       │
  └─────────────────────────────────────────────────┘
"""
from __future__ import annotations

import os
from tkinter import filedialog

import customtkinter as ctk

from ..core.database import get_card_count, get_import_meta, init_db
from ..core.importer import ImportWorker, ProgressEvent

# Colour tokens
ACCENT     = "#2fa89d"
ACCENT_HOV = "#26897f"
SUCCESS    = "#4caf7d"
ERROR      = "#c9415a"
BG_CARD    = "#1e1e2e"
BG_INPUT   = "#16161e"
TEXT_MUTED = "#8888a0"


class Phase1ImportPanel(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.configure(fg_color="transparent")
        self._worker: ImportWorker | None = None
        init_db()
        self._build_ui()
        self._refresh_status()

    def _build_ui(self) -> None:
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # ── Database Status ──────────────────────────────────────
        status_card = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=10)
        status_card.grid(row=0, column=0, padx=20, pady=(20, 8), sticky="ew")
        status_card.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(status_card, text="DATABASE STATUS",
                     font=ctk.CTkFont(size=11, weight="bold"),
                     text_color=TEXT_MUTED).grid(
            row=0, column=0, columnspan=3, padx=16, pady=(14, 4), sticky="w")

        for i, lbl in enumerate(("Cards in database:", "Last import:", "File size:")):
            ctk.CTkLabel(status_card, text=lbl, font=ctk.CTkFont(size=13),
                         text_color=TEXT_MUTED).grid(
                row=i + 1, column=0, padx=16, pady=3, sticky="w")

        self._lbl_card_count = ctk.CTkLabel(status_card, text="—",
                                             font=ctk.CTkFont(size=13, weight="bold"))
        self._lbl_card_count.grid(row=1, column=1, padx=8, pady=3, sticky="w")

        self._lbl_last_import = ctk.CTkLabel(status_card, text="—",
                                              font=ctk.CTkFont(size=13))
        self._lbl_last_import.grid(row=2, column=1, padx=8, pady=3, sticky="w")

        self._lbl_file_size = ctk.CTkLabel(status_card, text="—",
                                            font=ctk.CTkFont(size=13))
        self._lbl_file_size.grid(row=3, column=1, padx=8, pady=(3, 14), sticky="w")

        self._btn_load = ctk.CTkButton(
            status_card, text="Load New File", width=130,
            fg_color=ACCENT, hover_color=ACCENT_HOV,
            command=self._on_load_clicked)
        self._btn_load.grid(row=1, column=2, rowspan=3, padx=16, pady=8, sticky="e")

        # ── Import progress ─────────────────────────────────────
        import_card = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=10)
        import_card.grid(row=1, column=0, padx=20, pady=8, sticky="ew")
        import_card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(import_card, text="IMPORT",
                     font=ctk.CTkFont(size=11, weight="bold"),
                     text_color=TEXT_MUTED).grid(
            row=0, column=0, columnspan=2, padx=16, pady=(14, 4), sticky="w")

        path_row = ctk.CTkFrame(import_card, fg_color="transparent")
        path_row.grid(row=1, column=0, columnspan=2, padx=12, pady=4, sticky="ew")
        path_row.grid_columnconfigure(0, weight=1)

        self._entry_path = ctk.CTkEntry(path_row,
                                         placeholder_text="oracle_cards.json path…",
                                         fg_color=BG_INPUT)
        self._entry_path.grid(row=0, column=0, sticky="ew", padx=(0, 8))

        ctk.CTkButton(path_row, text="📂", width=38,
                      fg_color=BG_INPUT, hover_color=ACCENT_HOV,
                      command=self._browse_file).grid(row=0, column=1)

        self._progress_bar = ctk.CTkProgressBar(import_card,
                                                  progress_color=ACCENT,
                                                  height=14, corner_radius=7)
        self._progress_bar.set(0)
        self._progress_bar.grid(row=2, column=0, columnspan=2,
                                 padx=16, pady=(8, 4), sticky="ew")

        self._lbl_progress = ctk.CTkLabel(import_card, text="",
                                           font=ctk.CTkFont(size=12),
                                           text_color=TEXT_MUTED)
        self._lbl_progress.grid(row=3, column=0, columnspan=2,
                                 padx=16, pady=(0, 14), sticky="w")

        # ── Log ───────────────────────────────────────────────
        log_card = ctk.CTkFrame(self, fg_color=BG_CARD, corner_radius=10)
        log_card.grid(row=2, column=0, padx=20, pady=(8, 20), sticky="nsew")
        log_card.grid_rowconfigure(1, weight=1)
        log_card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(log_card, text="IMPORT LOG",
                     font=ctk.CTkFont(size=11, weight="bold"),
                     text_color=TEXT_MUTED).grid(
            row=0, column=0, padx=16, pady=(14, 4), sticky="w")

        self._log_box = ctk.CTkTextbox(log_card, state="disabled",
                                        fg_color=BG_INPUT,
                                        font=ctk.CTkFont(family="Courier", size=12),
                                        wrap="word", corner_radius=8)
        self._log_box.grid(row=1, column=0, padx=12, pady=(0, 12), sticky="nsew")

    def _refresh_status(self) -> None:
        count = get_card_count()
        meta  = get_import_meta()
        self._lbl_card_count.configure(
            text=f"{count:,}" if count else "—",
            text_color=SUCCESS if count else TEXT_MUTED)
        ts = meta.get("timestamp", "")
        self._lbl_last_import.configure(
            text=ts[:19].replace("T", " ") if ts else "—")
        size = meta.get("file_size_mb", "")
        self._lbl_file_size.configure(
            text=f"{size} MB" if size else "—")

    def _log(self, msg: str) -> None:
        self._log_box.configure(state="normal")
        self._log_box.insert("end", msg + "\n")
        self._log_box.see("end")
        self._log_box.configure(state="disabled")

    def _browse_file(self) -> None:
        path = filedialog.askopenfilename(
            title="Select Scryfall oracle_cards.json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")])
        if path:
            self._entry_path.delete(0, "end")
            self._entry_path.insert(0, path)

    def _on_load_clicked(self) -> None:
        path = self._entry_path.get().strip()
        if not path:
            self._browse_file()
            path = self._entry_path.get().strip()
        if not path:
            return
        if not os.path.isfile(path):
            self._log(f"❌  File not found: {path}")
            return
        self._btn_load.configure(state="disabled", text="Importing…")
        self._progress_bar.set(0)
        self._lbl_progress.configure(text="Starting…")
        self._log(f"> Importing: {os.path.basename(path)}")
        self._worker = ImportWorker(path)
        self._worker.start()
        self._poll_worker()

    def _poll_worker(self) -> None:
        if self._worker is None:
            return
        try:
            while True:
                event: ProgressEvent = self._worker.events.get_nowait()
                self._apply_event(event)
                if event.phase in ("done", "error"):
                    self._worker = None
                    self._btn_load.configure(state="normal", text="Load New File")
                    self._refresh_status()
                    return
        except Exception:
            pass
        self.after(50, self._poll_worker)

    def _apply_event(self, event: ProgressEvent) -> None:
        pct = event.percent / 100.0
        if event.phase == "transforming":
            pct = 0.05 + (event.percent / 100.0) * 0.50
        elif event.phase == "saving":
            pct = 0.55 + (event.percent / 100.0) * 0.40
        elif event.phase == "done":
            pct = 1.0
        elif event.phase == "error":
            pct = 0.0
        self._progress_bar.set(pct)
        pct_display = int(pct * 100)
        self._lbl_progress.configure(
            text=f"{pct_display}%  —  {event.message}",
            text_color=ERROR if event.phase == "error" else
                        SUCCESS if event.phase == "done" else TEXT_MUTED)
        self._log(f"> {event.message}")
