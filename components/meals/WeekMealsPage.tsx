"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import QRCode from "react-qr-code";
import { QrCode, X } from "lucide-react";
import type { MealPlan } from "@/types/mealPlan";

type GenerationStatus = {
  isGenerating: boolean;
  mealPlan: number;
  mealPlanMax: number;
  images: number;
  imagesMax: number;
};

type Props = {
  mealPlan: MealPlan | null;
  onUpdateMealPlan: (mealPlan: MealPlan) => void;
  generationStatus: GenerationStatus | null;
};

export default function WeekMealsPage({
  mealPlan,
  generationStatus,
}: Props) {
  const [showQr, setShowQr] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isRequestingGeneration, setIsRequestingGeneration] = useState(false);

  const dragState = useRef({
    active: false,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  });

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;

    if (
      target.closest(
        "button, a, input, textarea, select, [role='button']",
      )
    ) {
      return;
    }

    const container = scrollRef.current;

    if (!container) {
      return;
    }

    dragState.current = {
      active: true,
      startY: event.clientY,
      startScrollTop: container.scrollTop,
      moved: false,
    };

    try {
      container.setPointerCapture(event.pointerId);
    } catch {
      // Certains écrans tactiles ne prennent pas en charge le pointer capture.
    }
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const container = scrollRef.current;

    if (!container || !dragState.current.active) {
      return;
    }

    const distance =
      event.clientY - dragState.current.startY;

    if (Math.abs(distance) > 4) {
      dragState.current.moved = true;
    }

    container.scrollTop =
      dragState.current.startScrollTop - distance;

    event.preventDefault();
  };

  const handlePointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const container = scrollRef.current;

    dragState.current.active = false;

    if (
      container &&
      container.hasPointerCapture(event.pointerId)
    ) {
      container.releasePointerCapture(event.pointerId);
    }
  };

  const generateNewWeek = async () => {
    if (
        generationStatus?.isGenerating ||
        isRequestingGeneration
    ) {
        return;
    }

    setGenerationError(null);
    setIsRequestingGeneration(true);

    try {
        const response = await fetch("/api/meals/generate", {
        method: "POST",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
        throw new Error(
            data?.error ??
            data?.message ??
            `Erreur HTTP ${response.status}`,
        );
        }
    } catch (error) {
        const message =
        error instanceof Error
            ? error.message
            : "Une erreur inconnue est survenue.";

        console.error("Erreur pendant la génération :", error);
        setGenerationError(message);
    } finally {
        setIsRequestingGeneration(false);
    }
  };

  if (generationStatus?.isGenerating) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1623]">
        <div className="text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />

          <h2 className="text-3xl font-bold">
            Génération en cours...
          </h2>

          <div className="mt-6 space-y-3 text-lg text-slate-300">
            <p>
              Plan de la semaine :{" "}
              {generationStatus.mealPlan}/
              {generationStatus.mealPlanMax}
            </p>

            <p>
              Images de plats générées :{" "}
              {generationStatus.images}/
              {generationStatus.imagesMax}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1623] p-8">
        <div className="max-w-xl text-center">
            <div className="mb-4 text-6xl">🍽️</div>

            <h2 className="text-3xl font-bold">
            Aucun planning disponible
            </h2>

            <p className="mt-4 text-lg text-slate-400">
            Le dernier planning n’a pas pu être chargé ou
            sa génération a échoué.
            </p>

            {generationError && (
            <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-300">
                {generationError}
            </div>
            )}

            <button
            type="button"
            disabled={
                generationStatus?.isGenerating ||
                isRequestingGeneration
            }
            onPointerUp={(event) => {
                event.stopPropagation();
                void generateNewWeek();
            }}
            onClick={(event) => {
                if (event.detail === 0) {
                void generateNewWeek();
                }
            }}
            className="
                mt-8 w-full rounded-xl bg-purple-600
                px-6 py-4 text-lg font-bold
                active:bg-purple-700
                disabled:cursor-not-allowed
                disabled:opacity-50
            "
            style={{
                touchAction: "none",
            }}
            >
            {isRequestingGeneration
                ? "Lancement..."
                : "Générer une nouvelle semaine"}
            </button>
        </div>
        </div>
    );
  }

  const qrData = JSON.stringify({
    generated_at: mealPlan.generated_at,
    shopping_list: mealPlan.shopping_list,
  });

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="
          grid min-h-0 flex-1 grid-cols-2 gap-6
          overflow-y-auto overscroll-contain pr-2
          select-none
        "
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "none",
          cursor: dragState.current.active
            ? "grabbing"
            : "grab",
        }}
      >
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
                  {day.meal.total_time} min •{" "}
                  {day.meal.estimated_cost.toFixed(2)} €
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1623] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold">
              🛒 Courses
            </h2>

            <button
              type="button"
              onPointerUp={(event) => {
                event.stopPropagation();
                setShowQr(true);
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  setShowQr(true);
                }
              }}
              className="
                relative z-10 rounded-xl border
                border-white/10 bg-white/5 p-3
                hover:bg-white/10 active:bg-white/15
              "
              style={{
                touchAction: "none",
              }}
            >
              <QrCode size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(
              mealPlan.shopping_list,
            ).map(([category, items]) => (
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

          <button
            type="button"
            disabled={generationStatus?.isGenerating}
            onPointerUp={(event) => {
              event.stopPropagation();
              void generateNewWeek();
            }}
            onClick={(event) => {
              if (event.detail === 0) {
                void generateNewWeek();
              }
            }}
            className="
              relative z-10 mt-8 w-full rounded-xl
              bg-purple-600 py-4 font-bold
              active:bg-purple-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            style={{
              touchAction: "none",
            }}
          >
            {generationStatus?.isGenerating
              ? "Génération en cours..."
              : "Générer une nouvelle semaine"}
          </button>
        </div>
      </div>

      {showQr && (
        <div
          className="
            fixed inset-0 z-50 flex items-center
            justify-center bg-black/70 backdrop-blur-sm
          "
          style={{
            touchAction: "none",
          }}
        >
          <div className="w-[430px] rounded-2xl border border-white/10 bg-[#0b1623] p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                QR Code
              </h2>

              <button
                type="button"
                onPointerUp={(event) => {
                  event.stopPropagation();
                  setShowQr(false);
                }}
                onClick={(event) => {
                  if (event.detail === 0) {
                    setShowQr(false);
                  }
                }}
                className="rounded-lg p-2 hover:bg-white/10 active:bg-white/15"
                style={{
                  touchAction: "none",
                }}
              >
                <X />
              </button>
            </div>

            <div className="rounded-xl bg-white p-6">
              <QRCode
                value={qrData}
                size={320}
                style={{
                  width: "100%",
                  height: "auto",
                }}
              />
            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              Ce QR Code contient la liste de courses
              de toute la semaine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}