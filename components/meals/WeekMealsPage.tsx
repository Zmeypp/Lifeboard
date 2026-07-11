"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { QrCode, X } from "lucide-react";
import type { MealPlan } from "@/types/mealPlan";
import AnimatedButton from "@/components/ui/AnimatedButton";


type GenerationStatus = {
  isGenerating: boolean;
  mealPlan: number;
  mealPlanMax: number;
  images: number;
  imagesMax: number;
};

type Props = {
  mealPlan: MealPlan;
  onUpdateMealPlan: (mealPlan: MealPlan) => void;
  generationStatus: GenerationStatus | null;
};


export default function WeekMealsPage({
  mealPlan,
  generationStatus,
}: Props) {

    const [showQr, setShowQr] = useState(false);

  const qrData = JSON.stringify({
    generated_at: mealPlan.generated_at,
    shopping_list: mealPlan.shopping_list,
  });


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
  <div className="flex min-h-0 flex-1 overflow-hidden">
    <div
      className="
        grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-y-auto pr-2
        overscroll-contain touch-pan-y
      "
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6">
        <h2 className="mb-6 text-3xl font-bold">📅 Planning</h2>

        <div className="space-y-3">
          {mealPlan.days.map((day) => (
            <div
              key={day.date}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="font-bold">{day.weekday}</div>

              <div className="text-slate-300">
                {day.meal.title}
              </div>

              <div className="mt-2 text-sm text-slate-500">
                {day.meal.total_time} min •{" "}
                {day.meal.estimated_cost.toFixed(2)} €
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold">🛒 Courses</h2>

          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="
              rounded-xl border border-white/10 bg-white/5 p-3
              hover:bg-white/10 touch-manipulation
            "
            style={{ touchAction: "manipulation" }}
          >
            <QrCode size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(mealPlan.shopping_list).map(
            ([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-lg font-bold capitalize">
                  {category}
                </h3>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span>{item.name}</span>

                      <span className="text-slate-400">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={generationStatus?.isGenerating}
          onClick={async () => {
            console.log("Génération demandée");

            try {
              const response = await fetch("/api/meals/generate", {
                method: "POST",
              });

              if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
              }
            } catch (error) {
              console.error(error);
            }
          }}
          className="
            mt-8 w-full rounded-xl bg-purple-600 py-4 font-bold
            disabled:cursor-not-allowed disabled:opacity-50
            touch-manipulation
          "
          style={{ touchAction: "manipulation" }}
        >
          {generationStatus?.isGenerating
            ? "Génération en cours..."
            : "Générer une nouvelle semaine"}
        </button>
      </div>
    </div>

    {/* Modal QR code */}
  </div>
);

}