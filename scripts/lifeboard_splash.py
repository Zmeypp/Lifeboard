#!/usr/bin/env python3

import tkinter as tk


class LifeBoardSplash:
    def __init__(self) -> None:
        self.root = tk.Tk()

        self.root.title("LifeBoard")
        self.root.configure(bg="#050b12")

        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)

        self.root.bind("<Escape>", lambda event: self.root.destroy())

        container = tk.Frame(
            self.root,
            bg="#050b12",
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
            bg="#050b12",
        )
        title.pack(pady=(0, 20))

        subtitle = tk.Label(
            container,
            text="Démarrage de LifeBoard…",
            font=("Sans", 20),
            fg="#94a3b8",
            bg="#050b12",
        )
        subtitle.pack()

        self.dots_label = tk.Label(
            container,
            text="● ○ ○",
            font=("Sans", 20),
            fg="#a855f7",
            bg="#050b12",
        )
        self.dots_label.pack(pady=(30, 0))

        self.animation_step = 0
        self.animate()

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