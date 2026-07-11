import time
from google import genai
from google.genai import errors
import json
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

client = genai.Client(api_key="AQ.Ab8RN6KH6UEZktI8x6R40Zh6Z1mEYSfse1joI_PnhryXk9yWJQ")

MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

RETRYABLE_CODES = {429, 500, 503, 504}

now = datetime.now(ZoneInfo("Europe/Paris"))

week_start_date = now.date() - timedelta(days=now.weekday())
week_end_date = week_start_date + timedelta(days=6)

week_start = week_start_date.isoformat()
week_end = week_end_date.isoformat()

generated_at = now.replace(microsecond=0).isoformat()

prompt = """
Tu es le backend de l'application LifeBoard.

Réponds UNIQUEMENT avec un JSON valide.
Aucun texte, aucune explication, aucun markdown, aucun ```json.

Génère un planning de 7 dîners pour une personne.

Paramètres d'entrée :

* week_start = __WEEK_START__
* week_end = __WEEK_END__
* generated_at = __GENERATED_AT__
* pantry_items = ["Sel", "Poivre", "Huile de cuisine", "Huile d'olive", "Moutarde"]

Contraintes principales :

* Chaque dîner fait 2 portions : 1 portion pour le soir et 1 portion pour le déjeuner du lendemain.
* Budget total maximum : 35 €.
* Temps total maximum par recette : 20 minutes.
* Difficulté : facile.
* Ingrédients faciles à trouver en France.
* Aucun champignon.
* Aucun plat végétarien.
* Aucun poisson.
* Chaque dîner doit contenir au moins un ingrédient de la catégorie shopping_list.meat.
* Pas de petit-déjeuner, collation ou dessert.
* Utiliser plusieurs fois les mêmes ingrédients pour réduire le coût.
* Ne jamais dépasser le budget.
* Chaque repas doit être pratique à manger le lendemain midi au travail, réchauffé ou froid.

Le JSON doit respecter exactement cette structure :

{
"generated_at": "YYYY-MM-DDTHH:mm:ss",
"week_start": "YYYY-MM-DD",
"week_end": "YYYY-MM-DD",
"budget": {
"max": 35,
"estimated": 0
},
"days": [
{
"date": "YYYY-MM-DD",
"weekday": "Lundi",
"meal": {
"title": "",
"description": "",
"image_prompt": "Photo culinaire réaliste de...",
"prep_time": 0,
"cook_time": 0,
"total_time": 0,
"estimated_cost": 0,
"portions": 2,
"difficulty": "easy"
},
"ingredients": [
{
"name": "",
"quantity": 0,
"unit": "",
"from_pantry": false
}
],
"recipe": [
{
"step": 1,
"text": ""
}
]
}
],
"shopping_list": {
"vegetables": [],
"meat": [],
"dairy": [],
"grocery": [],
"frozen": [],
"seasoning": []
}
}

Chaque catégorie de shopping_list contient uniquement des objets avec cette structure :

{
"name": "",
"quantity": 0,
"unit": "",
"estimated_cost": 0
}

Règles de génération :

* Génère exactement 7 objets dans "days".
* Utilise week_start pour calculer toutes les dates.
* Le champ "generated_at" doit être exactement égal au paramètre generated_at fourni.
* Le champ "week_start" doit être exactement égal au paramètre week_start fourni.
* Le champ "week_end" doit être calculé à partir de week_start.
* Chaque recette doit avoir entre 3 et 6 étapes.
* Chaque "meal.total_time" doit être inférieur ou égal à 20.
* "budget.estimated" doit être inférieur ou égal à 35.
* Les prix doivent être réalistes en France.
* Les valeurs numériques doivent être des nombres, pas du texte.
* Les unités doivent être simples : "g", "ml", "pièce", "boîte", "cuillère à soupe", "cuillère à café".
* Toute la réponse doit être en français.
* N'utilise jamais de mots anglais dans les ingrédients.
* La valeur technique "difficulty" doit toujours être "easy".
* Ne génère pas deux fois le même plat.
* Ne génère pas deux plats avec le même titre.
* Ne propose pas de recette avec une cuisson longue déguisée.
* Les pommes de terre doivent être en conserve, précuites, en sachet vapeur ou remplacées.

Règles ingrédients :

* Tous les ingrédients nécessaires doivent apparaître dans days.ingredients.
* Les ingrédients présents dans pantry_items doivent avoir "from_pantry": true.
* Les ingrédients avec "from_pantry": true ne doivent jamais apparaître dans shopping_list.
* Les ingrédients avec "from_pantry": false doivent apparaître dans shopping_list avec exactement le même "name".
* Ne mets jamais un ingrédient nécessaire à 0 € pour supposer qu'il est déjà possédé.
* Les noms d'ingrédients doivent être génériques et stables.
* Exemples de bons noms : "Poulet", "Bœuf haché", "Saucisses de volaille", "Jambon", "Œufs".
* Évite les noms trop précis comme "Escalope de poulet", "Blanc de poulet", "Aiguillettes de poulet".
* Les champs "name" dans days.ingredients doivent correspondre exactement aux champs "name" de shopping_list, sauf si "from_pantry": true.

Règles shopping_list :

* Les quantités de shopping_list doivent être les quantités totales à acheter pour la semaine.
* Les quantités dans days.ingredients doivent être les quantités réellement utilisées dans la recette.
* Les quantités de shopping_list doivent être réalistes pour un supermarché français.
* Exemples :

  * Pâtes : minimum 500 g.
  * Riz : minimum 500 g.
  * Sauce soja : minimum 150 ml.
  * Vinaigre : minimum 250 ml.
  * Épices : 1 pot.
  * Ail : 1 tête.
  * Crème fraîche : minimum 200 g.

Catégorisation obligatoire :

* vegetables : uniquement légumes frais.
* meat : viandes et charcuterie.
* dairy : œufs, lait, crème, fromage, beurre, yaourts.
* grocery : pâtes, riz, semoule, conserves, sauces, pain, vinaigre.
* frozen : uniquement produits surgelés.
* seasoning : épices, herbes et condiments non présents dans pantry_items.

Avant de répondre, vérifie mentalement :

* JSON valide.
* Aucun champ manquant.
* Exactement 7 dîners.
* Budget total inférieur ou égal à 35 €.
* Temps total de chaque recette inférieur ou égal à 20 minutes.
* Aucun champignon.
* Aucun poisson.
* Aucun plat végétarien.
* Chaque dîner contient au moins un ingrédient de shopping_list.meat.
* Tous les ingrédients hors pantry sont présents dans shopping_list avec le même nom.

"""

prompt = (
    prompt
    .replace("__WEEK_START__", week_start)
    .replace("__WEEK_END__", week_end)
    .replace("__GENERATED_AT__", generated_at)
)

print("Semaine générée :", week_start, "→", week_end)
print("Date de génération :", generated_at)

def generate_with_fallback(
    prompt: str,
    max_retries_per_model: int = 4,
):
    last_error = None

    for model in MODELS:
        for attempt in range(max_retries_per_model + 1):
            try:
                print(
                    f"Essai avec {model} "
                    f"({attempt + 1}/{max_retries_per_model + 1})...",
                    flush=True,
                )

                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                    },
                )

                return response.text

            except errors.APIError as error:
                last_error = error
                code = getattr(error, "code", None)
                message = getattr(error, "message", str(error))

                print(
                    f"Erreur avec {model} : {code} - {message}",
                    flush=True,
                )

                if code not in RETRYABLE_CODES:
                    raise

                if attempt < max_retries_per_model:
                    wait = 65 if code == 429 else 2 ** (attempt + 1)

                    print(
                        f"Nouvelle tentative dans {wait} secondes...",
                        flush=True,
                    )

                    time.sleep(wait)
                else:
                    print(
                        "Passage au modèle suivant...",
                        flush=True,
                    )

    raise RuntimeError(
        "Tous les modèles ont échoué. "
        f"Dernière erreur : {last_error}"
    )

try:
    result = generate_with_fallback(
        prompt,
        max_retries_per_model=4,
    )

    # Nettoyage des balises Markdown si Gemini en ajoute
    result = result.strip()

    if result.startswith("```"):
        lines = result.splitlines()

        # Supprime ```json
        if lines[0].startswith("```"):
            lines = lines[1:]

        # Supprime ```
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]

        result = "\n".join(lines)

    # Convertit le texte en objet Python
    data = json.loads(result)

    # Sauvegarde dans un fichier JSON
    output_file = Path("lifeboard_meal_plan.json")

    with output_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"JSON créé avec succès : {output_file.resolve()}")

except json.JSONDecodeError as e:
    print("La réponse du modèle n'est pas un JSON valide.")
    print(f"Erreur JSON : {e}")
    print(result)
    raise

except Exception as e:
    print(f"Erreur finale : {e}")
    raise