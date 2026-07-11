"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1623] p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Paramètres</h2>

        <p className="text-slate-400">
          Configuration générale de LifeBoard.
        </p>
      </div>

      <div className="grid h-full grid-cols-2 gap-6 overflow-y-auto pr-2 pb-32">
        <Section title="Profil">
          <Field label="Prénom">
            <input
              value={settings.firstName}
              onChange={(event) =>
                update("firstName", event.target.value)
              }
              className="input"
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
              className="input"
            />
          </Field>

          <Field label="Latitude">
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
              className="input"
            />
          </Field>

          <Field label="Longitude">
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
              className="input"
            />
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
              className="input"
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
              className="input"
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
              className="input"
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
              className="input"
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
      </div>
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
