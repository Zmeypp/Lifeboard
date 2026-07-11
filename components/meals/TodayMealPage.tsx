"use client";

import type { MealPlan } from "@/types/mealPlan";


type GenerationStatus = {
  isGenerating: boolean;
  mealPlan: number;
  mealPlanMax: number;
  images: number;
  imagesMax: number;
};

type Props = {
  mealPlan: MealPlan;
  generationStatus: GenerationStatus | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export default function TodayMealPage({
  mealPlan,
  generationStatus,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const day =
    mealPlan.days.find((d) => d.date === today) ??
    mealPlan.days[0];

  const imageName = `${day.date}_${slugify(day.meal.title)}.jpg`;
  console.log(imageName);

          if (generationStatus?.isGenerating) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1623]">
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />

        <h2 className="text-3xl font-bold">Génération en cours...</h2>

        <div className="mt-6 space-y-3 text-lg text-slate-300">
          <p>
            Plan de la semaine : {generationStatus.mealPlan}/
            {generationStatus.mealPlanMax}
          </p>

          <p>
            Images de plats générées : {generationStatus.images}/
            {generationStatus.imagesMax}
          </p>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="grid flex-1 min-h-0 grid-cols-2 gap-6">

      {/* Plat */}

      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6 overflow-hidden">

        <h2 className="mb-5 text-3xl font-bold">
          🍽️ Plat du jour
        </h2>

        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <img
          src={`/images/${imageName}`}
          alt={day.meal.title}
          className="h-80 w-full object-contain bg-[#111827]"
          onLoad={() => console.log("✅ Image chargée :", imageName)}
          onError={() => console.error("❌ Image introuvable :", imageName)}
        />
        </div>

        <h3 className="text-2xl font-bold">
          {day.meal.title}
        </h3>

        <p className="mt-3 text-slate-400">
          {day.meal.description}
        </p>

        <div className="mt-6 flex gap-8 text-lg">

          <div>⏱ {day.meal.total_time} min</div>

          <div>💶 {day.meal.estimated_cost.toFixed(2)} €</div>

          <div>🍴 {day.meal.portions}</div>

        </div>

      </div>

      {/* Recette */}

      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6 overflow-y-auto">

        <h2 className="mb-6 text-3xl font-bold">
          📖 Recette
        </h2>

        <h3 className="mb-3 font-semibold">
          Ingrédients
        </h3>

        <ul className="space-y-2">

          {day.ingredients.map((ingredient) => (

            <li key={ingredient.name}>

              • {ingredient.quantity} {ingredient.unit} {ingredient.name}

            </li>

          ))}

        </ul>

        <h3 className="mt-8 mb-3 font-semibold">
          Préparation
        </h3>

        <div className="space-y-4">

          {day.recipe.map((step) => (

            <div key={step.step}>

              <div className="font-semibold">

                Étape {step.step}

              </div>

              <div className="text-slate-400">

                {step.text}

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}