import base64
import hashlib
import json
import os
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests


ROOT_DIR = Path(__file__).resolve().parents[1]

# Nouveau planning encore non publié
INPUT_JSON = ROOT_DIR / "lifeboard_meal_plan.json"

# Images de travail, non publiées
OUTPUT_DIR = ROOT_DIR / "images"

STATUS_FILE = ROOT_DIR / "scripts" / "generation_status.json"

MAX_WORKERS = 1
MAX_ATTEMPTS = 5

CLOUDFLARE_ACCOUNT_ID = os.environ.get(
    "CLOUDFLARE_ACCOUNT_ID"
)

CLOUDFLARE_API_TOKEN = os.environ.get(
    "CLOUDFLARE_API_TOKEN"
)

CLOUDFLARE_MODEL = (
    "@cf/black-forest-labs/flux-2-klein-4b"
)


if not CLOUDFLARE_ACCOUNT_ID:
    raise RuntimeError(
        "La variable CLOUDFLARE_ACCOUNT_ID est absente."
    )

if not CLOUDFLARE_API_TOKEN:
    raise RuntimeError(
        "La variable CLOUDFLARE_API_TOKEN est absente."
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

    temporary_status = STATUS_FILE.with_suffix(
        ".tmp.json"
    )

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

    text = unicodedata.normalize(
        "NFD",
        text,
    )

    text = "".join(
        character
        for character in text
        if unicodedata.category(character) != "Mn"
    )

    text = re.sub(
        r"[^\w\s-]",
        "",
        text,
    )

    text = re.sub(
        r"\s+",
        "_",
        text,
    )

    return text[:80]


def create_seed(
    date: str,
    title: str,
) -> int:
    # On ajoute le temps pour obtenir une image
    # différente à chaque nouvelle génération.
    value = (
        f"{date}-{title}-{time.time_ns()}"
        .encode("utf-8")
    )

    digest = hashlib.sha256(
        value
    ).hexdigest()

    return int(
        digest[:8],
        16,
    ) % 999999


def clear_output_directory():
    for file in OUTPUT_DIR.iterdir():
        if file.is_file():
            file.unlink()


def get_retry_delay(
    response: requests.Response,
    attempt: int,
) -> int:
    retry_after = response.headers.get(
        "Retry-After"
    )

    if retry_after:
        try:
            return max(
                int(retry_after),
                10,
            )
        except ValueError:
            pass

    return 10 * attempt


def build_image_prompt(
    day: dict,
) -> str:
    meal = day["meal"]

    title = meal["title"]

    description = meal.get(
        "description",
        "",
    )

    original_prompt = meal.get(
        "image_prompt",
        "",
    )

    ingredients = [
        ingredient["name"]
        for ingredient in day.get(
            "ingredients",
            [],
        )
        if ingredient.get("name")
    ]

    ingredient_text = ", ".join(
        ingredients
    )

    return f"""
Create a realistic photograph of this exact finished meal.

DISH:
{title}

DESCRIPTION:
{description}

INGREDIENTS USED:
{ingredient_text}

VISUAL DESCRIPTION:
{original_prompt}

The image must immediately look like the named dish.

This is real everyday French food, not fine dining.

STRICT FOOD ACCURACY:

- Keep every important ingredient recognizable.
- Respect the real physical form of the food.
- Do not transform solid food into puree, soup or an artificial sauce.
- Do not invent ingredients.
- Do not add decorative ingredients that are not part of the recipe.
- Do not add parsley, herbs or greens unless they belong in the meal.
- Do not drown the dish in sauce.
- Do not create strange orange, yellow or glossy sauces.
- Do not stack food vertically.
- Do not make artistic Michelin-style plating.

IMPORTANT FOOD SHAPES:

- Pasta must clearly show individual pasta pieces or strands.
- Rice must clearly show individual cooked rice grains.
- Minced beef must visibly look like cooked minced beef.
- Chicken must visibly look like real pieces of chicken.
- Potatoes must visibly look like pieces of potato.
- Salad leaves must remain recognizable.
- An omelette must clearly look like a real folded or pan-cooked omelette.
- Croque monsieur must clearly look like grilled sliced bread filled with ham and cheese.
- Wraps must clearly look like wheat tortillas containing their filling.
- Hachis Parmentier must visibly have a minced beef layer and a mashed potato layer.
- A gratin must visibly look baked, with recognizable ingredients underneath the browned surface.

STYLE:

A generous comforting meal served in a traditional French bistro,
brasserie or Northern France estaminet.

It should feel like genuine homemade comfort food:
simple, generous, warm and appetizing.

Serve the food on a normal ceramic restaurant plate,
bistro plate, bowl, casserole dish or gratin dish,
depending on what is appropriate for the actual recipe.

PHOTOGRAPHY:

Real food photography.
Realistic proportions.
Realistic textures.
Slight natural imperfections.
Warm neutral restaurant lighting.
Wooden bistro table.
Three-quarter camera angle.
Dish filling most of the image.
Natural shallow depth of field.
No extreme blur.
No artificial CGI appearance.
No advertisement-style perfection.

The final result must look like a photograph of a real meal
that someone could actually receive in a French bistro.

No text.
No logo.
No people.
No hands.
""".strip()


def get_cloudflare_url() -> str:
    return (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}"
        f"/ai/run/{CLOUDFLARE_MODEL}"
    )


def decode_cloudflare_image(
    image_base64: str,
) -> bytes:
    # Certains services peuvent renvoyer :
    #
    # data:image/jpeg;base64,xxxx
    #
    # On supporte les deux formats.

    if "," in image_base64 and image_base64.startswith(
        "data:"
    ):
        image_base64 = image_base64.split(
            ",",
            1,
        )[1]

    try:
        return base64.b64decode(
            image_base64
        )
    except Exception as error:
        raise RuntimeError(
            "Impossible de décoder l'image "
            "renvoyée par Cloudflare."
        ) from error


def generate_image(
    day: dict,
) -> Path:
    date = day["date"]
    meal = day["meal"]

    title = meal["title"]

    prompt = build_image_prompt(
        day
    )

    seed = create_seed(
        date,
        title,
    )

    url = get_cloudflare_url()

    filename = (
        OUTPUT_DIR
        / f"{date}_{slugify(title)}.jpg"
    )

    temporary_filename = filename.with_suffix(
        ".tmp.jpg"
    )

    last_error: Exception | None = None

    for attempt in range(
        1,
        MAX_ATTEMPTS + 1,
    ):
        try:
            print(
                f"Génération : {title} "
                f"(tentative {attempt}/{MAX_ATTEMPTS})",
                flush=True,
            )

            response = requests.post(
                url,
                headers={
                    "Authorization":
                        f"Bearer {CLOUDFLARE_API_TOKEN}",
                },

                # IMPORTANT :
                # Cloudflare demande du multipart/form-data
                # pour FLUX.2 Klein.
                files={
                    "prompt": (
                        None,
                        prompt,
                    ),
                    "width": (
                        None,
                        "1024",
                    ),
                    "height": (
                        None,
                        "768",
                    ),
                    "guidance": (
                        None,
                        "4.5",
                    ),
                    "seed": (
                        None,
                        str(seed),
                    ),
                },

                timeout=300,
            )

            # ------------------------------
            # Erreurs non retentables
            # ------------------------------

            if response.status_code == 401:
                raise RuntimeError(
                    "FATAL: Token Cloudflare invalide "
                    "ou non autorisé."
                )

            if response.status_code == 403:
                try:
                    details = response.json()
                except Exception:
                    details = response.text[:500]

                raise RuntimeError(
                    "FATAL: Cloudflare refuse l'accès "
                    f"au modèle : {details}"
                )

            if response.status_code == 400:
                try:
                    details = response.json()
                except Exception:
                    details = response.text[:500]

                raise RuntimeError(
                    "FATAL: Requête Cloudflare invalide : "
                    f"{details}"
                )

            # ------------------------------
            # Rate limit / capacité
            # ------------------------------

            if response.status_code == 429:
                delay = get_retry_delay(
                    response,
                    attempt,
                )

                if attempt < MAX_ATTEMPTS:
                    print(
                        "Cloudflare est temporairement "
                        "indisponible ou la limite est atteinte. "
                        f"Nouvelle tentative dans {delay}s.",
                        flush=True,
                    )

                    time.sleep(
                        delay
                    )

                    continue

                raise RuntimeError(
                    "Cloudflare refuse toujours "
                    "la génération après plusieurs tentatives."
                )

            # ------------------------------
            # Autres erreurs HTTP
            # ------------------------------

            if response.status_code >= 500:
                if attempt < MAX_ATTEMPTS:
                    delay = 5 * attempt

                    print(
                        f"Erreur serveur Cloudflare "
                        f"{response.status_code}. "
                        f"Nouvelle tentative dans {delay}s.",
                        flush=True,
                    )

                    time.sleep(
                        delay
                    )

                    continue

            response.raise_for_status()

            # ------------------------------
            # Réponse JSON
            # ------------------------------

            try:
                data = response.json()
            except ValueError as error:
                raise RuntimeError(
                    "Cloudflare a renvoyé une réponse "
                    "qui n'est pas du JSON."
                ) from error

            if data.get("success") is not True:
                raise RuntimeError(
                    "Cloudflare a refusé la génération : "
                    f"{data}"
                )

            result = data.get(
                "result"
            )

            if not isinstance(
                result,
                dict,
            ):
                raise RuntimeError(
                    "Réponse Cloudflare invalide : "
                    "champ result absent."
                )

            image_base64 = result.get(
                "image"
            )

            if not image_base64:
                raise RuntimeError(
                    "Cloudflare n'a renvoyé "
                    "aucune image."
                )

            image_bytes = decode_cloudflare_image(
                image_base64
            )

            if not image_bytes:
                raise RuntimeError(
                    "L'image Cloudflare est vide."
                )

            temporary_filename.write_bytes(
                image_bytes
            )

            if (
                not temporary_filename.exists()
                or temporary_filename.stat().st_size == 0
            ):
                raise RuntimeError(
                    f"L'image temporaire "
                    f"{temporary_filename.name} "
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

            if temporary_filename.exists():
                temporary_filename.unlink()

            # 400 / 401 / 403 :
            # inutile de faire 5 essais.
            if str(error).startswith(
                "FATAL:"
            ):
                raise

            if attempt < MAX_ATTEMPTS:
                delay = 5 * attempt

                print(
                    f"Nouvelle tentative "
                    f"dans {delay} secondes.",
                    flush=True,
                )

                time.sleep(
                    delay
                )

    raise RuntimeError(
        f"Impossible de générer l'image « {title} » "
        f"après {MAX_ATTEMPTS} tentatives : "
        f"{last_error}"
    )


def main():
    if not INPUT_JSON.exists():
        raise FileNotFoundError(
            f"Planning introuvable : "
            f"{INPUT_JSON}"
        )

    clear_output_directory()

    with INPUT_JSON.open(
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(
            file
        )

    days = data.get(
        "days"
    )

    if (
        not isinstance(days, list)
        or len(days) != 7
    ):
        raise ValueError(
            "Le planning doit contenir "
            "exactement 7 jours."
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
            executor.submit(
                generate_image,
                day,
            ): day
            for day in days
        }

        for future in as_completed(
            futures
        ):
            day = futures[
                future
            ]

            title = day["meal"]["title"]

            try:
                generated_image = (
                    future.result()
                )

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

                # Petite pause pour ne pas
                # bombarder Workers AI.
                time.sleep(2)

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
        "Les 7 images ont été générées "
        "avec succès via Cloudflare Workers AI.",
        flush=True,
    )


if __name__ == "__main__":
    main()