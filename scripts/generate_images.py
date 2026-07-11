import hashlib
import json
import os
import re
import time
import unicodedata
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT_DIR = Path(__file__).resolve().parents[1]

# Nouveau planning encore non publié
INPUT_JSON = ROOT_DIR / "lifeboard_meal_plan.json"

# Images de travail, non publiées
OUTPUT_DIR = ROOT_DIR / "images"

STATUS_FILE = ROOT_DIR / "scripts" / "generation_status.json"

MAX_WORKERS = 2
MAX_ATTEMPTS = 3

API_KEY = os.environ.get("sk_nlS9tHNY9NY0TNQSS6sLcpKmsE19Tund")

if not API_KEY:
    raise RuntimeError(
        "La variable d'environnement POLLINATIONS_API_KEY est absente."
    )

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


def write_status(
    meal_plan: int,
    images: int,
    is_generating: bool = True,
):
    status = {
        "isGenerating": is_generating,
        "status": "running" if is_generating else "idle",
        "mealPlan": meal_plan,
        "mealPlanMax": 1,
        "images": images,
        "imagesMax": 7,
        "error": None,
    }

    temporary_status = STATUS_FILE.with_suffix(".tmp.json")

    temporary_status.write_text(
        json.dumps(
            status,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    os.replace(
        temporary_status,
        STATUS_FILE,
    )


def slugify(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)

    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )

    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"\s+", "_", text)

    return text[:80]


def create_seed(date: str, title: str) -> int:
    value = f"{date}-{title}".encode("utf-8")
    digest = hashlib.sha256(value).hexdigest()

    return int(digest[:8], 16) % 999999


def clear_output_directory():
    for file in OUTPUT_DIR.iterdir():
        if file.is_file():
            file.unlink()


def generate_image(day: dict) -> Path:
    date = day["date"]
    meal = day["meal"]

    title = meal["title"]
    prompt = meal["image_prompt"]

    encoded_prompt = urllib.parse.quote(
        prompt,
        safe="",
    )

    seed = create_seed(
        date,
        title,
    )

    url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?model=flux"
        f"&width=1024"
        f"&height=768"
        f"&nologo=true"
        f"&private=true"
        f"&enhance=false"
        f"&seed={seed}"
    )

    filename = (
        OUTPUT_DIR
        / f"{date}_{slugify(title)}.jpg"
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            print(
                f"Génération : {title} "
                f"(tentative {attempt}/{MAX_ATTEMPTS})",
                flush=True,
            )

            response = requests.get(
                url,
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                },
                timeout=300,
            )

            response.raise_for_status()

            content_type = response.headers.get(
                "Content-Type",
                "",
            )

            if "image" not in content_type.lower():
                response_preview = response.text[:500]

                raise RuntimeError(
                    "Pollinations a renvoyé une réponse non-image : "
                    f"{response_preview}"
                )

            if not response.content:
                raise RuntimeError(
                    "Pollinations a renvoyé une image vide."
                )

            temporary_filename = filename.with_suffix(
                ".tmp.jpg"
            )

            temporary_filename.write_bytes(
                response.content
            )

            if temporary_filename.stat().st_size == 0:
                raise RuntimeError(
                    f"L'image temporaire {temporary_filename.name} "
                    "est vide."
                )

            os.replace(
                temporary_filename,
                filename,
            )

            print(
                f"Image créée : {filename.name}",
                flush=True,
            )

            return filename

        except Exception as error:
            last_error = error

            print(
                f"Échec pour {title} : {error}",
                flush=True,
            )

            temporary_filename = filename.with_suffix(
                ".tmp.jpg"
            )

            if temporary_filename.exists():
                temporary_filename.unlink()

            if attempt < MAX_ATTEMPTS:
                time.sleep(attempt * 3)

    raise RuntimeError(
        f"Impossible de générer l'image « {title} » "
        f"après {MAX_ATTEMPTS} tentatives : {last_error}"
    )


def main():
    if not INPUT_JSON.exists():
        raise FileNotFoundError(
            f"Planning introuvable : {INPUT_JSON}"
        )

    clear_output_directory()

    with INPUT_JSON.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    days = data.get("days")

    if not isinstance(days, list) or len(days) != 7:
        raise ValueError(
            "Le planning doit contenir exactement 7 jours."
        )

    generated_count = 0
    generated_images: list[Path] = []
    errors: list[str] = []

    write_status(
        meal_plan=1,
        images=0,
        is_generating=True,
    )

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS,
    ) as executor:
        futures = {
            executor.submit(generate_image, day): day
            for day in days
        }

        for future in as_completed(futures):
            day = futures[future]
            title = day["meal"]["title"]

            try:
                generated_image = future.result()
                generated_images.append(
                    generated_image
                )

                generated_count += 1

                write_status(
                    meal_plan=1,
                    images=generated_count,
                    is_generating=True,
                )

                print(
                    f"Progression : "
                    f"{generated_count}/{len(days)}",
                    flush=True,
                )

            except Exception as error:
                errors.append(
                    f"{title} : {error}"
                )

    if errors:
        raise RuntimeError(
            "Échec de certaines images : "
            + " | ".join(errors)
        )

    if len(generated_images) != 7:
        raise RuntimeError(
            f"Seulement {len(generated_images)} "
            "images ont été générées sur 7."
        )

    print(
        "Les 7 images ont été générées avec succès.",
        flush=True,
    )


if __name__ == "__main__":
    main()