import json
import re
import requests
import urllib.parse
from pathlib import Path
import unicodedata

API_KEY = "sk_nlS9tHNY9NY0TNQSS6sLcpKmsE19Tund"

ROOT_DIR = Path(__file__).resolve().parents[1]
INPUT_JSON = ROOT_DIR / "public" / "data" / "lifeboard_meal_plan.json"
OUTPUT_DIR = ROOT_DIR / "public" / "images"
STATUS_FILE = ROOT_DIR / "scripts" / "generation_status.json"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def write_status(meal_plan: int, images: int, is_generating: bool = True):
    STATUS_FILE.write_text(
        json.dumps(
            {
                "isGenerating": is_generating,
                "mealPlan": meal_plan,
                "mealPlanMax": 1,
                "images": images,
                "imagesMax": 7,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def slugify(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"\s+", "_", text)
    return text[:80]


for file in OUTPUT_DIR.iterdir():
    if file.is_file():
        file.unlink()

with INPUT_JSON.open("r", encoding="utf-8") as f:
    data = json.load(f)

generated_count = 0

for day in data["days"]:
    title = day["meal"]["title"]
    prompt = day["meal"]["image_prompt"]

    encoded_prompt = urllib.parse.quote(prompt)

    url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?model=flux"
        f"&width=1024"
        f"&height=768"
        f"&nologo=true"
        f"&private=true"
        f"&enhance=false"
        f"&seed={abs(hash(day['date'] + title)) % 999999}"
    )

    filename = OUTPUT_DIR / f"{day['date']}_{slugify(title)}.jpg"

    print(f"Génération : {title}")

    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=300,
    )

    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")

    if "image" not in content_type:
        print("Réponse non-image reçue :")
        print(response.text[:500])
        continue

    with filename.open("wb") as f:
        f.write(response.content)

    generated_count += 1
    write_status(1, generated_count)

    print(f"Image créée : {filename}")