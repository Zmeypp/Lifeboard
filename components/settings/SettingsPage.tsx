"use client";

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
  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    onUpdateSettings({ ...settings, [key]: value });
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

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
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
              onChange={(e) => update("firstName", e.target.value)}
              className="input"
            />
          </Field>
        </Section>

        <Section title="Météo">
          <Field label="Ville">
            <input
              value={settings.weatherCity}
              onChange={(e) => update("weatherCity", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Latitude">
            <input
              type="number"
              value={settings.weatherLatitude}
              onChange={(e) => update("weatherLatitude", Number(e.target.value))}
              className="input"
            />
          </Field>

          <Field label="Longitude">
            <input
              type="number"
              value={settings.weatherLongitude}
              onChange={(e) => update("weatherLongitude", Number(e.target.value))}
              className="input"
            />
          </Field>
        </Section>

        <Section title="Calendrier">
          <Field label="Jour du salaire">
            <input
              type="number"
              value={settings.salaryDay}
              onChange={(e) => update("salaryDay", Number(e.target.value))}
              className="input"
            />
          </Field>

          <Field label="Reset des budgets">
            <input
              type="number"
              value={settings.budgetResetDay}
              onChange={(e) => update("budgetResetDay", Number(e.target.value))}
              className="input"
            />
          </Field>
        </Section>

        <Section title="Sécurité financière">
            <Field label="Montant minimum à conserver sur le Livret A">
                <input
                type="number"
                value={settings.livretASafetyAmount}
                onChange={(e) =>
                    update("livretASafetyAmount", Number(e.target.value))
                }
                className="input"
                />
            </Field>
        </Section>

        <Section title="Apparence">
          <Field label="Thème">
            <select
              value={settings.theme}
              onChange={(e) => update("theme", e.target.value as AppSettings["theme"])}
              className="input"
            >
              <option className="bg-[#0b1623]" value="dark">
                Sombre
              </option>
            </select>
          </Field>
        </Section>

        <Section title="Sauvegarde">
          <div className="flex gap-3">
            <AnimatedButton
              onClick={exportJson}
              className="rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white"
            >
              Exporter JSON
            </AnimatedButton>

            <motion.label
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 420, damping: 24 }}
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
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      <div className="space-y-4">{children}</div>
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
      <p className="mb-2 text-sm text-slate-400">{label}</p>
      {children}
    </label>
  );
}