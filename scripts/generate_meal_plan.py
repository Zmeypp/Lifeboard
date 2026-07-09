import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = ROOT_DIR / "scripts"

STATUS_FILE = SCRIPTS_DIR / "generation_status.json"

SOURCE_JSON = ROOT_DIR / "lifeboard_meal_plan.json"
PUBLIC_JSON = ROOT_DIR / "public" / "data" / "lifeboard_meal_plan.json"

SOURCE_IMAGES_DIR = ROOT_DIR / "images"
PUBLIC_IMAGES_DIR = ROOT_DIR / "public" / "images"


def write_status(is_generating: bool, meal_plan: int, images: int):
    status = {
        "isGenerating": is_generating,
        "mealPlan": meal_plan,
        "mealPlanMax": 1,
        "images": images,
        "imagesMax": 7,
    }

    STATUS_FILE.write_text(
        json.dumps(status, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def clear_file(path: Path):
    if path.exists():
        path.unlink()


def clear_images(path: Path):
    path.mkdir(parents=True, exist_ok=True)

    for file in path.iterdir():
        if file.is_file():
            file.unlink()


def run_script(script_name: str):
    script_path = SCRIPTS_DIR / script_name

    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=ROOT_DIR,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Erreur pendant {script_name}")


def copy_json_to_public():
    PUBLIC_JSON.parent.mkdir(parents=True, exist_ok=True)

    if not SOURCE_JSON.exists():
        raise FileNotFoundError("lifeboard_meal_plan.json introuvable après Gemini")

    shutil.copy2(SOURCE_JSON, PUBLIC_JSON)


def copy_images_to_public():
    PUBLIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    for image in SOURCE_IMAGES_DIR.glob("*"):
        if image.is_file():
            shutil.copy2(image, PUBLIC_IMAGES_DIR / image.name)


def count_public_images():
    if not PUBLIC_IMAGES_DIR.exists():
        return 0

    return len([
        file for file in PUBLIC_IMAGES_DIR.iterdir()
        if file.is_file()
    ])


try:
    print("Début génération LifeBoard...")

    PUBLIC_JSON.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    clear_file(SOURCE_JSON)
    clear_file(PUBLIC_JSON)

    clear_images(SOURCE_IMAGES_DIR)
    clear_images(PUBLIC_IMAGES_DIR)

    write_status(True, 0, 0)

    print("Génération du JSON...")
    run_script("gemini_api.py")

    copy_json_to_public()
    write_status(True, 1, 0)

    print("Génération des images...")
    run_script("generate_images.py")

    write_status(False, 1, 7)

    print("Génération terminée.")

except Exception as e:
    print(f"Erreur génération : {e}")
    write_status(False, 0, 0)
    raise