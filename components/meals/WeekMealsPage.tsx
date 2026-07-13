"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import QRCode from "react-qr-code";
import {
  CircleHelp,
  QrCode,
  X,
} from "lucide-react";
import type { MealPlan } from "@/types/mealPlan";

type GenerationStatus = {
  isGenerating: boolean;
  mealPlan: number;
  mealPlanMax: number;
  images: number;
  imagesMax: number;
  status:
    | "idle"
    | "running"
    | "waiting"
    | "success"
    | "error";
  error: string | null;
  waitReason: string | null;
  retryAt: string | null;
};

type Props = {
  mealPlan: MealPlan | null;
  onUpdateMealPlan: (mealPlan: MealPlan) => void;
  generationStatus: GenerationStatus | null;
};

function getFriendlyGenerationError(
  technicalError: string,
) {
  const normalizedError =
    technicalError.toLowerCase();

  if (
    normalizedError.includes("429") ||
    normalizedError.includes("quota") ||
    normalizedError.includes("rate limit") ||
    normalizedError.includes("resource_exhausted") ||
    normalizedError.includes("limite")
  ) {
    return (
      "Le service de génération est actuellement " +
      "trop sollicité. Patientez quelques minutes " +
      "avant de réessayer."
    );
  }

  if (
    normalizedError.includes("401") ||
    normalizedError.includes("403") ||
    normalizedError.includes("api key") ||
    normalizedError.includes("clé api") ||
    normalizedError.includes("permission_denied") ||
    normalizedError.includes("unauthorized")
  ) {
    return (
      "Le service de génération n’a pas pu être " +
      "autorisé. La configuration de l’application " +
      "doit être vérifiée."
    );
  }

  if (
    normalizedError.includes("gemini") ||
    normalizedError.includes("generate_content") ||
    normalizedError.includes("modèle")
  ) {
    return (
      "Le planning des repas n’a pas pu être créé. " +
      "Le service de génération de texte est " +
      "temporairement indisponible."
    );
  }

  if (
    normalizedError.includes("pollinations") ||
    normalizedError.includes("image") ||
    normalizedError.includes(
      "generate_images.py",
    )
  ) {
    return (
      "Le planning a été créé, mais certaines images " +
      "des plats n’ont pas pu être générées."
    );
  }

  if (
    normalizedError.includes("json") ||
    normalizedError.includes("planning incomplet") ||
    normalizedError.includes("jours sur 7") ||
    normalizedError.includes("champ days") ||
    normalizedError.includes("shopping_list")
  ) {
    return (
      "Le planning reçu était incomplet ou incorrect. " +
      "Aucune modification n’a été publiée."
    );
  }

  if (
    normalizedError.includes("timeout") ||
    normalizedError.includes("timed out") ||
    normalizedError.includes("connection") ||
    normalizedError.includes("network") ||
    normalizedError.includes("connexion") ||
    normalizedError.includes("dns")
  ) {
    return (
      "La connexion au service de génération a " +
      "échoué. Vérifiez la connexion Internet puis " +
      "réessayez."
    );
  }

  if (
    normalizedError.includes("no such file") ||
    normalizedError.includes("filenotfounderror") ||
    normalizedError.includes("introuvable")
  ) {
    return (
      "Un fichier nécessaire à la génération est " +
      "introuvable. La configuration de l’application " +
      "doit être vérifiée."
    );
  }

  if (
    normalizedError.includes("permissionerror") ||
    normalizedError.includes("permission denied") ||
    normalizedError.includes("access is denied")
  ) {
    return (
      "L’application n’a pas l’autorisation de créer " +
      "ou de publier les nouveaux fichiers."
    );
  }

  if (
    normalizedError.includes("charmap") ||
    normalizedError.includes("codec") ||
    normalizedError.includes("unicode")
  ) {
    return (
      "Un problème de caractères a empêché la " +
      "génération du planning."
    );
  }

  if (
    normalizedError.includes("module not found") ||
    normalizedError.includes(
      "modulenotfounderror",
    ) ||
    normalizedError.includes("no module named")
  ) {
    return (
      "Un composant nécessaire à la génération n’est " +
      "pas installé sur l’appareil."
    );
  }

  return (
    "Une erreur inattendue a interrompu la génération. " +
    "L’ancien planning a été conservé."
  );
}

export default function WeekMealsPage({
  mealPlan,
  onUpdateMealPlan,
  generationStatus,
}: Props) {
  const [showQr, setShowQr] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [generationError, setGenerationError] =
    useState<string | null>(null);

  const [
    isRequestingGeneration,
    setIsRequestingGeneration,
  ] = useState(false);

  const [
    showGenerationErrorPopup,
    setShowGenerationErrorPopup,
  ] = useState(false);

  const [
    remainingRetrySeconds,
    setRemainingRetrySeconds,
  ] = useState(0);


  const [
  showTechnicalGenerationError,
  setShowTechnicalGenerationError,
] = useState(false);

  const dragState = useRef({
    active: false,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  });

  const technicalGenerationError =
  generationError ??
  generationStatus?.error ??
  "Aucun détail technique disponible.";

const friendlyGenerationError =
  getFriendlyGenerationError(
    technicalGenerationError,
  );

const displayedGenerationError =
  showTechnicalGenerationError
    ? technicalGenerationError
    : friendlyGenerationError;

  useEffect(() => {
  if (
    generationStatus?.status === "error" &&
    generationStatus.error
  ) {
    setShowTechnicalGenerationError(false);
    setShowGenerationErrorPopup(true);
  }
}, [
  generationStatus?.status,
  generationStatus?.error,
]);

  useEffect(() => {
    if (
      generationStatus?.status !== "waiting" ||
      !generationStatus.retryAt
    ) {
      setRemainingRetrySeconds(0);
      return;
    }

    const updateRemainingTime = () => {
      const retryTimestamp = new Date(
        generationStatus.retryAt as string,
      ).getTime();

      if (Number.isNaN(retryTimestamp)) {
        setRemainingRetrySeconds(0);
        return;
      }

      const remaining = Math.max(
        0,
        Math.ceil(
          (retryTimestamp - Date.now()) / 1000,
        ),
      );

      setRemainingRetrySeconds(remaining);
    };

    updateRemainingTime();

    const intervalId = window.setInterval(
      updateRemainingTime,
      1000,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    generationStatus?.status,
    generationStatus?.retryAt,
  ]);

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
      // Certains écrans tactiles ne prennent pas en charge
      // le pointer capture.
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
      container.releasePointerCapture(
        event.pointerId,
      );
    }
  };

  const reloadMealPlan = useCallback(async () => {
  try {
    const response = await fetch(
      `/data/lifeboard_meal_plan.json?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Impossible de charger le planning : HTTP ${response.status}`,
      );
    }

    const newMealPlan =
      (await response.json()) as MealPlan;

    onUpdateMealPlan(newMealPlan);
  } catch (error) {
    console.error(
      "Erreur pendant le rechargement du planning :",
      error,
    );
  }
}, [onUpdateMealPlan]);

useEffect(() => {
  void reloadMealPlan();
}, [reloadMealPlan]);

useEffect(() => {
  if (generationStatus?.status !== "success") {
    return;
  }

  void reloadMealPlan();
}, [
  generationStatus?.status,
  reloadMealPlan,
]);

  const generateNewWeek = async () => {
  if (
    generationStatus?.isGenerating ||
    isRequestingGeneration
  ) {
    return;
  }

  setGenerationError(null);
  setShowGenerationErrorPopup(false);
  setShowTechnicalGenerationError(false);
  setIsRequestingGeneration(true);

  try {
    const response = await fetch(
      "/api/meals/generate",
      {
        method: "POST",
      },
    );

    const data = await response
      .json()
      .catch(() => null);

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

    console.error(
      "Erreur pendant la génération :",
      error,
    );

    setGenerationError(message);
    setShowTechnicalGenerationError(false);
    setShowGenerationErrorPopup(true);
  } finally {
    setIsRequestingGeneration(false);
  }
};

  if (generationStatus?.isGenerating) {
    const isWaiting =
      generationStatus.status === "waiting";

    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1623] p-8">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />

          <h2 className="text-3xl font-bold">
            {isWaiting
              ? "Nouvelle tentative en attente"
              : "Génération en cours..."}
          </h2>

          {isWaiting && (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
              <p className="text-lg text-amber-200">
                {generationStatus.waitReason ??
                  "Le service est temporairement indisponible."}
              </p>

              <p className="mt-4 text-5xl font-bold text-amber-300">
                {remainingRetrySeconds} s
              </p>

              <p className="mt-2 text-sm text-slate-400">
                avant la prochaine tentative
              </p>
            </div>
          )}

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
          <div className="mb-4 text-6xl">
            🍽️
          </div>

          <h2 className="text-3xl font-bold">
            Aucun planning disponible
          </h2>

          <p className="mt-4 text-lg text-slate-400">
            Le dernier planning n’a pas pu être
            chargé ou sa génération a échoué.
          </p>

          {(generationError ||
  generationStatus?.error) && (
  <div
    className="
      mt-6 flex items-start gap-4 rounded-xl
      border border-red-400/30 bg-red-500/10
      p-4 text-left text-red-300
    "
  >
    <div
      className={`
        min-w-0 flex-1
        ${
          showTechnicalGenerationError
            ? "max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm"
            : ""
        }
      `}
    >
      {displayedGenerationError}
    </div>

    <button
      type="button"
      onPointerUp={(event) => {
        event.stopPropagation();

        setShowTechnicalGenerationError(
          (currentValue) => !currentValue,
        );
      }}
      onClick={(event) => {
        if (event.detail === 0) {
          setShowTechnicalGenerationError(
            (currentValue) => !currentValue,
          );
        }
      }}
      className="
        flex h-10 w-10 shrink-0 items-center
        justify-center rounded-full border
        border-red-300/30 bg-red-300/10
        active:bg-red-300/20
      "
      style={{
        touchAction: "none",
      }}
      aria-label="Afficher le détail de l’erreur"
    >
      <CircleHelp size={23} />
    </button>
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
            {isRequestingGeneration
              ? "Lancement..."
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

      {showGenerationErrorPopup &&
        (generationError ||
          generationStatus?.status === "error") && (
          <div
            className="
              fixed inset-0 z-[60] flex items-center
              justify-center bg-black/75 p-6
              backdrop-blur-sm
            "
            style={{
              touchAction: "none",
            }}
          >
            <div className="w-full max-w-xl rounded-2xl border border-red-400/30 bg-[#0b1623] p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="mb-3 text-5xl">
                    ⚠️
                  </div>

                  <h2 className="text-2xl font-bold text-red-300">
                    Génération interrompue
                  </h2>
                </div>

                <button
                  type="button"
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    setShowGenerationErrorPopup(
                      false,
                    );
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      setShowGenerationErrorPopup(
                        false,
                      );
                    }
                  }}
                  className="rounded-lg p-2 active:bg-white/15"
                  style={{
                    touchAction: "none",
                  }}
                  aria-label="Fermer"
                >
                  <X />
                </button>
              </div>

              <p className="mt-5 text-lg text-slate-300">
                La nouvelle semaine n’a pas été
                publiée. L’ancien planning reste
                affiché.
              </p>

              <div
  className="
    mt-5 rounded-xl border border-red-400/20
    bg-red-500/10 text-red-200
  "
>
  <div className="flex items-start gap-4 p-4">
    <div
      className={`
        min-w-0 flex-1
        ${
          showTechnicalGenerationError
            ? "max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm"
            : "text-base leading-relaxed"
        }
      `}
    >
      {displayedGenerationError}
    </div>

    <button
      type="button"
      onPointerUp={(event) => {
        event.stopPropagation();

        setShowTechnicalGenerationError(
          (currentValue) => !currentValue,
        );
      }}
      onClick={(event) => {
        if (event.detail === 0) {
          setShowTechnicalGenerationError(
            (currentValue) => !currentValue,
          );
        }
      }}
      className="
        relative z-10 flex h-10 w-10 shrink-0
        items-center justify-center rounded-full
        border border-red-300/30 bg-red-300/10
        text-red-100
        active:bg-red-300/20
      "
      style={{
        touchAction: "none",
      }}
      aria-label={
        showTechnicalGenerationError
          ? "Afficher le message simplifié"
          : "Afficher le détail technique"
      }
      title={
        showTechnicalGenerationError
          ? "Afficher le message simplifié"
          : "Afficher le détail technique"
      }
    >
      <CircleHelp size={23} />
    </button>
  </div>

  {showTechnicalGenerationError && (
    <div className="border-t border-red-400/15 px-4 py-3 text-xs text-red-200/70">
      Détail technique destiné au diagnostic
    </div>
  )}
</div>

              <div className="mt-7 flex gap-4">
                <button
                  type="button"
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    setShowGenerationErrorPopup(
                      false,
                    );
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      setShowGenerationErrorPopup(
                        false,
                      );
                    }
                  }}
                  className="
                    flex-1 rounded-xl border
                    border-white/10 bg-white/5
                    px-5 py-4 font-bold
                    active:bg-white/10
                  "
                  style={{
                    touchAction: "none",
                  }}
                >
                  Fermer
                </button>

                <button
                  type="button"
                  disabled={
                    isRequestingGeneration ||
                    generationStatus?.isGenerating
                  }
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    setShowGenerationErrorPopup(
                      false,
                    );
                    void generateNewWeek();
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      setShowGenerationErrorPopup(
                        false,
                      );
                      void generateNewWeek();
                    }
                  }}
                  className="
                    flex-1 rounded-xl bg-purple-600
                    px-5 py-4 font-bold
                    active:bg-purple-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  style={{
                    touchAction: "none",
                  }}
                >
                  {isRequestingGeneration
                    ? "Relance..."
                    : "Réessayer"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}