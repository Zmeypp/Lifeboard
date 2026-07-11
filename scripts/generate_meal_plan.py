import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"

STATUS_FILE = SCRIPTS_DIR / "generation_status.json"

SOURCE_JSON = ROOT_DIR / "lifeboard_meal_plan.json"
PUBLIC_JSON = (
    ROOT_DIR
    / "public"
    / "data"
    / "lifeboard_meal_plan.json"
)

SOURCE_IMAGES_DIR = ROOT_DIR / "images"
PUBLIC_IMAGES_DIR = ROOT_DIR / "public" / "images"

TEMP_PUBLIC_JSON = (
    ROOT_DIR
    / "public"
    / "data"
    / "lifeboard_meal_plan.tmp.json"
)

TEMP_IMAGES_DIR = (
    ROOT_DIR
    / "public"
    / "images_generation_tmp"
)


def write_status(
    is_generating: bool,
    meal_plan: int,
    images: int,
    status: str = "idle",
    error: str | None = None,
):
    generation_status = {
        "isGenerating": is_generating,
        "status": status,
        "mealPlan": meal_plan,
        "mealPlanMax": 1,
        "images": images,
        "imagesMax": 7,
        "error": error,
    }

    temporary_status_file = STATUS_FILE.with_suffix(".tmp.json")

    temporary_status_file.write_text(
        json.dumps(
            generation_status,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    os.replace(
        temporary_status_file,
        STATUS_FILE,
    )


def clear_file(path: Path):
    if path.exists():
        path.unlink()


def clear_directory(path: Path):
    if path.exists():
        shutil.rmtree(path)

    path.mkdir(
        parents=True,
        exist_ok=True,
    )


def run_script(script_name: str):
    script_path = SCRIPTS_DIR / script_name

    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=ROOT_DIR,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Erreur pendant l'exécution de {script_name}"
        )


def validate_meal_plan(json_path: Path) -> dict:
    if not json_path.exists():
        raise FileNotFoundError(
            "Le planning généré est introuvable."
        )

    try:
        meal_plan = json.loads(
            json_path.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as error:
        raise ValueError(
            "Le planning généré contient un JSON invalide."
        ) from error

    days = meal_plan.get("days")

    if not isinstance(days, list):
        raise ValueError(
            "Le champ days du planning est invalide."
        )

    if len(days) != 7:
        raise ValueError(
            f"Planning incomplet : {len(days)} jours sur 7."
        )

    for index, day in enumerate(days, start=1):
        if not isinstance(day, dict):
            raise ValueError(
                f"Le jour {index} est invalide."
            )

        meal = day.get("meal")

        if not isinstance(meal, dict):
            raise ValueError(
                f"Le plat du jour {index} est absent."
            )

        if not meal.get("title"):
            raise ValueError(
                f"Le titre du plat du jour {index} est absent."
            )

    shopping_list = meal_plan.get("shopping_list")

    if not isinstance(shopping_list, dict):
        raise ValueError(
            "La liste de courses est absente ou invalide."
        )

    return meal_plan


def get_generated_images() -> list[Path]:
    if not SOURCE_IMAGES_DIR.exists():
        return []

    allowed_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }

    return sorted(
        image
        for image in SOURCE_IMAGES_DIR.iterdir()
        if image.is_file()
        and image.suffix.lower() in allowed_extensions
    )


def validate_generated_images() -> list[Path]:
    images = get_generated_images()

    if len(images) != 7:
        raise RuntimeError(
            f"Génération incomplète : "
            f"{len(images)} image(s) sur 7."
        )

    for image in images:
        if image.stat().st_size == 0:
            raise RuntimeError(
                f"L'image {image.name} est vide."
            )

    return images


def prepare_temporary_public_files(
    generated_images: list[Path],
):
    clear_directory(TEMP_IMAGES_DIR)

    PUBLIC_JSON.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    shutil.copy2(
        SOURCE_JSON,
        TEMP_PUBLIC_JSON,
    )

    # On valide également la copie temporaire.
    validate_meal_plan(TEMP_PUBLIC_JSON)

    for image in generated_images:
        shutil.copy2(
            image,
            TEMP_IMAGES_DIR / image.name,
        )


def publish_generation(
    generated_images: list[Path],
):
    PUBLIC_IMAGES_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Supprime les anciennes images seulement maintenant,
    # lorsque les 7 nouvelles images sont prêtes et validées.
    for old_image in PUBLIC_IMAGES_DIR.iterdir():
        if old_image.is_file():
            old_image.unlink()
        elif old_image.is_dir():
            shutil.rmtree(old_image)

    # Publication des 7 nouvelles images.
    for image in generated_images:
        temporary_image = TEMP_IMAGES_DIR / image.name
        public_image = PUBLIC_IMAGES_DIR / image.name

        os.replace(
            temporary_image,
            public_image,
        )

    # Le JSON est remplacé en dernier.
    os.replace(
        TEMP_PUBLIC_JSON,
        PUBLIC_JSON,
    )

    if TEMP_IMAGES_DIR.exists():
        shutil.rmtree(TEMP_IMAGES_DIR)


def clean_working_files():
    clear_file(SOURCE_JSON)
    clear_directory(SOURCE_IMAGES_DIR)


def clean_temporary_files():
    clear_file(TEMP_PUBLIC_JSON)

    if TEMP_IMAGES_DIR.exists():
        shutil.rmtree(TEMP_IMAGES_DIR)


try:
    print("Début génération LifeBoard...")

    PUBLIC_JSON.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    PUBLIC_IMAGES_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # On nettoie uniquement l'espace de travail.
    # Les fichiers publics actuels restent disponibles.
    clean_working_files()
    clean_temporary_files()

    write_status(
        is_generating=True,
        meal_plan=0,
        images=0,
        status="running",
    )

    print("Génération du JSON...")
    run_script("gemini_api.py")

    validate_meal_plan(SOURCE_JSON)

    write_status(
        is_generating=True,
        meal_plan=1,
        images=0,
        status="running",
    )

    print("Génération des images...")
    run_script("generate_images.py")

    generated_images = validate_generated_images()

    print("Préparation de la publication...")
    prepare_temporary_public_files(
        generated_images,
    )

    print("Publication du nouveau planning...")
    publish_generation(
        generated_images,
    )

    write_status(
        is_generating=False,
        meal_plan=1,
        images=7,
        status="success",
    )

    print("Génération terminée avec succès.")

except Exception as error:
    message = str(error)

    print(
        f"Erreur génération : {message}",
        file=sys.stderr,
    )

    clean_temporary_files()

    # L'ancien planning public et ses images
    # ne sont pas supprimés.
    write_status(
        is_generating=False,
        meal_plan=0,
        images=0,
        status="error",
        error=message,
    )

    raise