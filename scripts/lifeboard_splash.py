#!/usr/bin/env python3

import tkinter as tk


BACKGROUND_COLOR = "#050b12"


class LifeBoardSplash:
    def __init__(self) -> None:
        self.root = tk.Tk()

        self.root.title("LifeBoard")
        self.root.configure(bg=BACKGROUND_COLOR)

        # Supprime les bordures et la barre de titre.
        self.root.overrideredirect(True)

        # Positionnement immédiat sur tout l'écran.
        self.apply_fullscreen_geometry()

        # Demandes complémentaires au gestionnaire de fenêtres.
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)

        self.root.bind(
            "<Escape>",
            lambda _event: self.root.destroy(),
        )

        self.root.bind(
            "<Map>",
            self.on_window_mapped,
        )

        container = tk.Frame(
            self.root,
            bg=BACKGROUND_COLOR,
        )
        container.place(
            relx=0.5,
            rely=0.5,
            anchor="center",
        )

        title = tk.Label(
            container,
            text="LifeBoard",
            font=("Sans", 48, "bold"),
            fg="#ffffff",
            bg=BACKGROUND_COLOR,
        )
        title.pack(pady=(0, 20))

        subtitle = tk.Label(
            container,
            text="Démarrage de LifeBoard…",
            font=("Sans", 20),
            fg="#94a3b8",
            bg=BACKGROUND_COLOR,
        )
        subtitle.pack()

        self.dots_label = tk.Label(
            container,
            text="● ○ ○",
            font=("Sans", 20),
            fg="#a855f7",
            bg=BACKGROUND_COLOR,
        )
        self.dots_label.pack(pady=(30, 0))

        self.animation_step = 0
        self.animate()

        # Wayland peut ignorer la première demande de plein écran.
        # On la répète une fois la fenêtre réellement créée.
        self.root.after(100, self.enforce_fullscreen)
        self.root.after(300, self.enforce_fullscreen)
        self.root.after(800, self.enforce_fullscreen)
        self.root.after(1500, self.enforce_fullscreen)

    def apply_fullscreen_geometry(self) -> None:
        self.root.update_idletasks()

        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()

        self.root.geometry(
            f"{screen_width}x{screen_height}+0+0"
        )

        self.root.minsize(
            screen_width,
            screen_height,
        )

    def enforce_fullscreen(self) -> None:
        if not self.root.winfo_exists():
            return

        self.apply_fullscreen_geometry()

        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)

        self.root.lift()
        self.root.focus_force()

    def on_window_mapped(self, _event: tk.Event) -> None:
        self.root.after_idle(self.enforce_fullscreen)

    def animate(self) -> None:
        frames = [
            "● ○ ○",
            "○ ● ○",
            "○ ○ ●",
        ]

        self.dots_label.configure(
            text=frames[self.animation_step],
        )

        self.animation_step = (
            self.animation_step + 1
        ) % len(frames)

        self.root.after(400, self.animate)

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    splash = LifeBoardSplash()
    splash.run()