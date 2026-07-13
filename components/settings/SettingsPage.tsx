"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Power, X } from "lucide-react";
import type { AppSettings } from "@/data/settings";
import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { Goal } from "@/data/goals";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { motion } from "framer-motion";

type SettingsPageProps = {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  budgets: Budget[];
  operations: Operation[];
  goals: Goal[];
  netWorthSnapshots: NetWorthSnapshot[];
  onImportData: (data: {
    settings?: AppSettings;
    budgets?: Budget[];
    operations?: Operation[];
    goals?: Goal[];
    netWorthSnapshots?: NetWorthSnapshot[];
  }) => void;
};

export default function SettingsPage({
  settings,
  onUpdateSettings,
  budgets,
  operations,
  goals,
  netWorthSnapshots,
  onImportData,
}: SettingsPageProps) {
  const [latitudeInput, setLatitudeInput] = useState(
    String(settings.weatherLatitude).replace(".", ","),
  );

  const [longitudeInput, setLongitudeInput] = useState(
    String(settings.weatherLongitude).replace(".", ","),
  );

  const [
  showRebootConfirmation,
  setShowRebootConfirmation,
] = useState(false);

const [
  isRebooting,
  setIsRebooting,
] = useState(false);

const [
  rebootError,
  setRebootError,
] = useState<string | null>(null);

const scrollRef = useRef<HTMLDivElement>(null);

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

  /*
   * On ne démarre pas le scroll tactile lorsqu'on
   * appuie sur un élément interactif.
   */
  if (
    target.closest(
      "button, a, input, textarea, select, label, [role='button']",
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
    /*
     * Certains navigateurs ou écrans tactiles
     * ne prennent pas en charge le pointer capture.
     */
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

  /*
   * Empêche le navigateur de sélectionner le texte
   * ou d'interpréter le geste autrement.
   */
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

  useEffect(() => {
    setLatitudeInput(
      String(settings.weatherLatitude).replace(".", ","),
    );

    setLongitudeInput(
      String(settings.weatherLongitude).replace(".", ","),
    );
  }, [settings.weatherLatitude, settings.weatherLongitude]);

  function update<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  }

  function sanitizeCoordinate(value: string) {
    let sanitizedValue = value
      .replace(/\./g, ",")
      .replace(/[^\d,-]/g, "");

    const isNegative = sanitizedValue.startsWith("-");

    sanitizedValue = sanitizedValue.replace(/-/g, "");

    const [integerPart = "", ...decimalParts] =
      sanitizedValue.split(",");

    const decimalPart = decimalParts.join("");

    sanitizedValue =
      decimalParts.length > 0
        ? `${integerPart},${decimalPart}`
        : integerPart;

    if (isNegative) {
      sanitizedValue = `-${sanitizedValue}`;
    }

    return sanitizedValue;
  }

  function parseCoordinate(value: string) {
    return Number(value.replace(",", "."));
  }

  function handleLatitudeChange(value: string) {
    setLatitudeInput(sanitizeCoordinate(value));
  }

  function handleLongitudeChange(value: string) {
    setLongitudeInput(sanitizeCoordinate(value));
  }

  function saveLatitude() {
    const parsedLatitude = parseCoordinate(latitudeInput);

    if (
      !Number.isFinite(parsedLatitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      setLatitudeInput(
        String(settings.weatherLatitude).replace(".", ","),
      );

      return;
    }

    update("weatherLatitude", parsedLatitude);

    setLatitudeInput(
      String(parsedLatitude).replace(".", ","),
    );
  }

  function saveLongitude() {
    const parsedLongitude = parseCoordinate(longitudeInput);

    if (
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      setLongitudeInput(
        String(settings.weatherLongitude).replace(".", ","),
      );

      return;
    }

    update("weatherLongitude", parsedLongitude);

    setLongitudeInput(
      String(parsedLongitude).replace(".", ","),
    );
  }

  function exportJson() {
    const data = {
      settings,
      budgets,
      operations,
      goals,
      netWorthSnapshots,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lifeboard-sauvegarde.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  function importJson(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        onImportData(data);
      } catch {
        alert("Fichier JSON invalide.");
      }
    };

    reader.readAsText(file);
  }

  async function updateAndReboot() {
  if (isRebooting) {
    return;
  }

  setIsRebooting(true);
  setRebootError(null);

  try {
    const response = await fetch(
      "/api/system/reboot",
      {
        method: "POST",
      },
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message ??
          `Erreur HTTP ${response.status}`,
      );
    }

    /*
     * On laisse la fenêtre ouverte sur l'écran
     * de redémarrage. La connexion sera ensuite
     * naturellement interrompue.
     */
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de lancer le redémarrage.";

    console.error(
      "Erreur pendant le redémarrage :",
      error,
    );

    setRebootError(message);
    setIsRebooting(false);
  }
}

  return (
  <div
    className="
      flex min-h-0 flex-1 flex-col overflow-hidden
      rounded-2xl border border-white/10
      bg-[#0b1623] p-6
    "
  >
    <div className="mb-6 shrink-0">
      <h2 className="text-3xl font-bold">
        Paramètres
      </h2>

      <p className="text-slate-400">
        Configuration générale de LifeBoard.
      </p>
    </div>

    <div
      ref={scrollRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="
        grid min-h-0 flex-1 grid-cols-2
        content-start gap-6 overflow-y-auto
        overscroll-contain pr-2 pb-32
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
        <Section title="Profil">
          <Field label="Prénom">
            <input
              value={settings.firstName}
              onChange={(event) =>
                update("firstName", event.target.value)
              }
              className="input select-text"
            />
          </Field>
        </Section>

        <Section title="Météo">
          <Field label="Ville">
            <input
              value={settings.weatherCity}
              onChange={(event) =>
                update("weatherCity", event.target.value)
              }
              className="input select-text"
            />
          </Field>

          <Field label="Latitude">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-2">
                <input
                type="text"
                inputMode="decimal"
                pattern="-?[0-9]*[.,]?[0-9]*"
                autoComplete="off"
                value={latitudeInput}
                onChange={(event) =>
                    handleLatitudeChange(event.target.value)
                }
                onBlur={saveLatitude}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                    saveLatitude();
                    event.currentTarget.blur();
                    }
                }}
                placeholder="50,6292"
                className="min-w-0 flex-1 bg-transparent select-text px-2 py-3 text-white outline-none"
                />

                <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                    if (!latitudeInput.includes(",")) {
                    setLatitudeInput((currentValue) => {
                        if (currentValue === "" || currentValue === "-") {
                        return currentValue === "-" ? "-0," : "0,";
                        }

                        return `${currentValue},`;
                    });
                    }
                }}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-lg font-bold text-white active:bg-white/20"
                >
                ,
                </button>
            </div>
          </Field>

          <Field label="Longitude">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-2">
                <input
                type="text"
                inputMode="decimal"
                pattern="-?[0-9]*[.,]?[0-9]*"
                autoComplete="off"
                value={longitudeInput}
                onChange={(event) =>
                    handleLongitudeChange(event.target.value)
                }
                onBlur={saveLongitude}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                    saveLongitude();
                    event.currentTarget.blur();
                    }
                }}
                placeholder="3,0573"
                className="min-w-0 flex-1 bg-transparent select-text px-2 py-3 text-white outline-none"
                />

                <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                    if (!longitudeInput.includes(",")) {
                    setLongitudeInput((currentValue) => {
                        if (currentValue === "" || currentValue === "-") {
                        return currentValue === "-" ? "-0," : "0,";
                        }

                        return `${currentValue},`;
                    });
                    }
                }}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-lg font-bold text-white active:bg-white/20"
                >
                ,
                </button>
            </div>
          </Field>
        </Section>

        <Section title="Calendrier">
          <Field label="Jour du salaire">
            <input
              type="number"
              value={settings.salaryDay}
              onChange={(event) =>
                update(
                  "salaryDay",
                  Number(event.target.value),
                )
              }
              className="input select-text"
            />
          </Field>

          <Field label="Reset des budgets">
            <input
              type="number"
              value={settings.budgetResetDay}
              onChange={(event) =>
                update(
                  "budgetResetDay",
                  Number(event.target.value),
                )
              }
              className="input select-text"
            />
          </Field>
        </Section>

        <Section title="Sécurité financière">
          <Field label="Montant minimum à conserver sur le Livret A">
            <input
              type="number"
              value={settings.livretASafetyAmount}
              onChange={(event) =>
                update(
                  "livretASafetyAmount",
                  Number(event.target.value),
                )
              }
              className="input select-text"
            />
          </Field>
        </Section>

        <Section title="Apparence">
          <Field label="Thème">
            <select
              value={settings.theme}
              onChange={(event) =>
                update(
                  "theme",
                  event.target.value as AppSettings["theme"],
                )
              }
              className="input select-text"
            >
              <option
                className="bg-[#0b1623]"
                value="dark"
              >
                Sombre
              </option>
            </select>
          </Field>
        </Section>

        <Section title="Sauvegarde">
          <div className="flex gap-3">
            <AnimatedButton
              type="button"
              onClick={exportJson}
              className="rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white"
            >
              Exporter JSON
            </AnimatedButton>

            <motion.label
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 24,
              }}
              className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-white"
            >
              Importer JSON

              <input
                type="file"
                accept="application/json"
                onChange={importJson}
                className="hidden"
              />
            </motion.label>
          </div>
        </Section>

        <Section title="Système">
  <p className="text-sm leading-relaxed text-slate-400">
    Récupère la dernière version de LifeBoard,
    compile l’application puis redémarre le
    Raspberry Pi.
  </p>

  {rebootError && (
    <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-300">
      {rebootError}
    </div>
  )}

  <button
    type="button"
    disabled={isRebooting}
    onPointerUp={(event) => {
      event.stopPropagation();

      if (!isRebooting) {
        setShowRebootConfirmation(true);
      }
    }}
    onClick={(event) => {
      if (
        event.detail === 0 &&
        !isRebooting
      ) {
        setShowRebootConfirmation(true);
      }
    }}
    className="
      flex w-full items-center justify-center gap-3
      rounded-xl bg-red-600 px-5 py-4
      font-bold text-white active:bg-red-700
      disabled:cursor-not-allowed
      disabled:opacity-50
    "
    style={{
      touchAction: "none",
    }}
  >
    <Power size={22} />

    {isRebooting
      ? "Mise à jour en cours..."
      : "Mettre à jour et redémarrer"}
  </button>
</Section>
      </div>
      {showRebootConfirmation && (
  <div
    className="
      fixed inset-0 z-[70] flex items-center
      justify-center bg-black/75 p-6
      backdrop-blur-sm
    "
    style={{
      touchAction: "none",
    }}
  >
    <div className="w-full max-w-lg rounded-2xl border border-red-400/30 bg-[#0b1623] p-8 shadow-2xl">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
            <Power size={30} />
          </div>

          <h2 className="text-2xl font-bold">
            Mettre à jour LifeBoard ?
          </h2>
        </div>

        {!isRebooting && (
          <button
            type="button"
            onPointerUp={(event) => {
              event.stopPropagation();
              setShowRebootConfirmation(false);
            }}
            onClick={(event) => {
              if (event.detail === 0) {
                setShowRebootConfirmation(false);
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
        )}
      </div>

      {isRebooting ? (
        <div className="mt-6 text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-red-400 border-t-transparent" />

          <p className="text-xl font-bold">
            Mise à jour en cours…
          </p>

          <p className="mt-3 text-slate-400">
            LifeBoard récupère les modifications,
            compile l’application puis redémarre le
            Raspberry Pi.
          </p>

          <p className="mt-4 text-sm text-slate-500">
            L’écran peut devenir temporairement
            inaccessible.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-slate-300">
            Les commandes suivantes seront exécutées :
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm text-slate-300">
            <div>git pull --ff-only</div>
            <div>npm run build</div>
            <div>sudo reboot</div>
          </div>

          <p className="mt-4 text-sm text-amber-300">
            L’application sera indisponible pendant
            la mise à jour et le redémarrage.
          </p>

          <div className="mt-7 flex gap-4">
            <button
              type="button"
              onPointerUp={(event) => {
                event.stopPropagation();
                setShowRebootConfirmation(false);
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  setShowRebootConfirmation(false);
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
              Annuler
            </button>

            <button
              type="button"
              onPointerUp={(event) => {
                event.stopPropagation();
                void updateAndReboot();
              }}
              onClick={(event) => {
                if (event.detail === 0) {
                  void updateAndReboot();
                }
              }}
              className="
                flex-1 rounded-xl bg-red-600
                px-5 py-4 font-bold
                active:bg-red-700
              "
              style={{
                touchAction: "none",
              }}
            >
              Confirmer
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-4 text-xl font-bold">
        {title}
      </h3>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-2 text-sm text-slate-400">
        {label}
      </p>

      {children}
    </label>
  );
}
