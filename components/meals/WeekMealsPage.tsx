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
  <div className="flex flex-1 min-h-0 overflow-hidden">

    <div className="grid flex-1 min-h-0 grid-cols-2 gap-6 overflow-y-auto pr-2">

      {/* Planning */}

      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6">

        <h2 className="mb-6 text-3xl font-bold">
          📅 Planning
        </h2>

        <div className="space-y-3">

          {mealPlan.days.map((day) => (

            <div
              key={day.date}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >

              <div className="font-bold">
                {day.weekday}
              </div>

              <div className="text-slate-300">
                {day.meal.title}
              </div>

              <div className="mt-2 text-sm text-slate-500">
                {day.meal.total_time} min • {day.meal.estimated_cost.toFixed(2)} €
              </div>

            </div>

          ))}

        </div>

      </div>

      {/* Courses */}

      <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6">

        <div className="mb-6 flex items-center justify-between">
  <h2 className="text-3xl font-bold">
    🛒 Courses
  </h2>

  <AnimatedButton
    onClick={() => setShowQr(true)}
    className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
  >
    <QrCode size={24} />
  </AnimatedButton>
</div>

        <div className="space-y-6">

          {Object.entries(mealPlan.shopping_list).map(([category, items]) => (

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

          ))}

        </div>

        <AnimatedButton
  disabled={generationStatus?.isGenerating}
  onClick={async () => {
    await fetch("/api/meals/generate", {
      method: "POST",
    });
  }}
  className="mt-8 w-full rounded-xl bg-purple-600 py-4 font-bold disabled:cursor-not-allowed disabled:opacity-50"
>
  {generationStatus?.isGenerating
    ? "Génération en cours..."
    : "Générer une nouvelle semaine"}
</AnimatedButton>

      </div>

    </div>

    {showQr && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

    <div className="w-[430px] rounded-2xl border border-white/10 bg-[#0b1623] p-8">

      <div className="mb-6 flex items-center justify-between">

        <h2 className="text-2xl font-bold">
          QR Code
        </h2>

        <AnimatedButton
          onClick={() => setShowQr(false)}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <X />
        </AnimatedButton>

      </div>

      <div className="rounded-xl bg-white p-6">

        <QRCode
          value={qrData}
          size={320}
          style={{ width: "100%", height: "auto" }}
        />

      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Ce QR Code contient la liste de courses de toute la semaine.
      </p>

    </div>

  </div>
)}

  </div>
);

}