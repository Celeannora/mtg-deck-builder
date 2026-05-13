#!/usr/bin/env python3
"""
MTG Deck Builder — Phase 1 entry point.
Run with:  python main.py
Requires:  pip install customtkinter
"""
from __future__ import annotations

import customtkinter as ctk

from ui.phase1_import import ACCENT, Phase1ImportPanel

APP_TITLE   = "MTG Deck Builder"
WIN_WIDTH   = 760
WIN_HEIGHT  = 680
MIN_WIDTH   = 620
MIN_HEIGHT  = 500


class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("dark-blue")

        self.title(APP_TITLE)
        self.geometry(f"{WIN_WIDTH}x{WIN_HEIGHT}")
        self.minsize(MIN_WIDTH, MIN_HEIGHT)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        header = ctk.CTkFrame(self, height=52, fg_color="#12121a", corner_radius=0)
        header.grid(row=0, column=0, sticky="ew")
        header.grid_columnconfigure(1, weight=1)
        header.grid_propagate(False)

        ctk.CTkLabel(
            header,
            text="⬡  MTG Deck Builder",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=ACCENT,
        ).grid(row=0, column=0, padx=20, pady=14, sticky="w")

        ctk.CTkLabel(
            header,
            text="Phase 1 — Data Foundation",
            font=ctk.CTkFont(size=12),
            text_color="#555566",
        ).grid(row=0, column=1, padx=0, pady=14, sticky="w")

        self._theme_btn = ctk.CTkButton(
            header,
            text="☀",
            width=36,
            fg_color="transparent",
            hover_color="#222233",
            command=self._toggle_theme,
        )
        self._theme_btn.grid(row=0, column=2, padx=12, pady=10, sticky="e")

        self._panel = Phase1ImportPanel(self)
        self._panel.grid(row=1, column=0, sticky="nsew")

        status_bar = ctk.CTkFrame(self, height=28, fg_color="#0e0e18", corner_radius=0)
        status_bar.grid(row=2, column=0, sticky="ew")
        status_bar.grid_propagate(False)

        ctk.CTkLabel(
            status_bar,
            text="Card data sourced from Scryfall bulk JSON  •  Images © Wizards of the Coast  •  scryfall.com",
            font=ctk.CTkFont(size=10),
            text_color="#444455",
        ).pack(side="left", padx=12)

    def _toggle_theme(self) -> None:
        current = ctk.get_appearance_mode()
        new = "light" if current == "Dark" else "dark"
        ctk.set_appearance_mode(new)
        self._theme_btn.configure(text="🌙" if new == "light" else "☀")


if __name__ == "__main__":
    app = App()
    app.mainloop()
