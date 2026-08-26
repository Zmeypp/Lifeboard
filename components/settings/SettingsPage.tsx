"use client";

import {
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";
import {
    Power,
    TriangleAlert,
    X,
    RotateCcw,
    WalletCards,
    ArrowLeft,
} from "lucide-react";
import type { AppSettings } from "@/data/settings";
import type { Budget } from "@/data/budgets";
import type { Operation } from "@/data/operations";
import type { Goal } from "@/data/goals";
import type { NetWorthSnapshot } from "@/data/netWorthSnapshots";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { motion } from "framer-motion";
import { isInCurrentBudgetCycle } from "@/lib/budgetCycle";

type SettingsPageProps = {
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;

    budgets: Budget[];
    onUpdateBudgets: (budgets: Budget[]) => void;

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

type UpdateStatus = {
    updateAvailable: boolean;
    branch?: string;
    behindCount?: number;
    aheadCount?: number;
    message?: string;
};

type RebootProgress = {
    status: "idle" | "running" | "rebooting" | "error";
    progress: number;
    message: string;
    error: string | null;
};

type EditableAccountId = "compte-courant" | "livret-a";
const REBOOT_STORAGE_KEY = "lifeboard-reboot-in-progress";

export default function SettingsPage({
    settings,
    onUpdateSettings,
    budgets,
    onUpdateBudgets,
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

    const [showRebootConfirmation, setShowRebootConfirmation] = useState(false);

    const [isRebooting, setIsRebooting] = useState(false);

    const [rebootError, setRebootError] = useState<string | null>(null);

    const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

    const [isCheckingUpdate, setIsCheckingUpdate] = useState(true);

    const [updateCheckError, setUpdateCheckError] = useState<string | null>(
        null,
    );

    const [rebootProgress, setRebootProgress] = useState<RebootProgress>({
        status: "idle",
        progress: 0,
        message: "Préparation…",
        error: null,
    });
    const [
        showBudgetResetConfirmation,
        setShowBudgetResetConfirmation,
    ] = useState(false);

    const [showAccountEditor, setShowAccountEditor] = useState(false);

    const [accountEditorStep, setAccountEditorStep] = useState<1 | 2>(1);

    const [selectedAccountId, setSelectedAccountId] =
        useState<EditableAccountId | null>(null);

    const [accountAmountInput, setAccountAmountInput] = useState("");

    const scrollRef = useRef<HTMLDivElement>(null);

    const dragState = useRef({
        active: false,
        startY: 0,
        startScrollTop: 0,
        moved: false,
    });

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
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

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const container = scrollRef.current;

        if (!container || !dragState.current.active) {
            return;
        }

        const distance = event.clientY - dragState.current.startY;

        if (Math.abs(distance) > 4) {
            dragState.current.moved = true;
        }

        container.scrollTop = dragState.current.startScrollTop - distance;

        /*
         * Empêche le navigateur de sélectionner le texte
         * ou d'interpréter le geste autrement.
         */
        event.preventDefault();
    };

    const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
        const container = scrollRef.current;

        dragState.current.active = false;

        if (container && container.hasPointerCapture(event.pointerId)) {
            container.releasePointerCapture(event.pointerId);
        }
    };

    useEffect(() => {
        void checkForUpdates();

        const interval = window.setInterval(
            () => {
                void checkForUpdates();
            },
            10 * 60 * 1000,
        );

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        setLatitudeInput(String(settings.weatherLatitude).replace(".", ","));

        setLongitudeInput(String(settings.weatherLongitude).replace(".", ","));
    }, [settings.weatherLatitude, settings.weatherLongitude]);

    useEffect(() => {
        const restoreRebootState = async () => {
            const rebootWasInProgress =
                window.localStorage.getItem(REBOOT_STORAGE_KEY) === "true";

            if (!rebootWasInProgress) {
                return;
            }

            try {
                const response = await fetch(
                    `/api/system/reboot-status?t=${Date.now()}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                );

                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }

                const data = (await response.json()) as RebootProgress;

                /*
                 * Le nouveau serveur est démarré :
                 * le redémarrage précédent est terminé.
                 */
                if (data.status === "idle") {
                    window.localStorage.removeItem(REBOOT_STORAGE_KEY);

                    return;
                }

                setShowRebootConfirmation(true);
                setIsRebooting(true);
                setRebootProgress(data);
            } catch {
                /*
                 * Le serveur est encore indisponible :
                 * on garde l'état de redémarrage.
                 */
                setShowRebootConfirmation(true);
                setIsRebooting(true);

                setRebootProgress({
                    status: "rebooting",
                    progress: 100,
                    message:
                        "Le système va redémarrer dans un instant. Veuillez patienter.",
                    error: null,
                });
            }
        };

        void restoreRebootState();
    }, []);

    useEffect(() => {
        if (!isRebooting) {
            return;
        }

        let isCancelled = false;

        const loadProgress = async () => {
            try {
                const response = await fetch(
                    `/api/system/reboot-status?t=${Date.now()}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                );

                if (!response.ok) {
                    return;
                }

                const data = (await response.json()) as RebootProgress;

                if (isCancelled) {
                    return;
                }

                /*
                 * Un ancien statut "idle" peut être retourné
                 * durant les premières millisecondes.
                 *
                 * Il ne doit surtout jamais fermer la popup.
                 */
                if (data.status === "idle") {
                    return;
                }

                setRebootProgress(data);

                if (data.status === "error") {
                    window.localStorage.removeItem(REBOOT_STORAGE_KEY);

                    setRebootError(data.error ?? "La mise à jour a échoué.");

                    setIsRebooting(false);

                    /*
                     * On garde volontairement la popup ouverte
                     * afin que l'erreur reste visible.
                     */
                }
            } catch {
                /*
                 * Dès que le Raspberry s'arrête, l'API devient
                 * inaccessible. On verrouille alors l'affichage
                 * à 100 % jusqu'à l'extinction/rechargement.
                 */
                if (!isCancelled) {
                    setRebootProgress({
                        status: "rebooting",
                        progress: 100,
                        message:
                            "Le système va redémarrer dans un instant. Veuillez patienter.",
                        error: null,
                    });
                }
            }
        };

        void loadProgress();

        const intervalId = window.setInterval(() => {
            void loadProgress();
        }, 1000);

        return () => {
            isCancelled = true;
            window.clearInterval(intervalId);
        };
    }, [isRebooting]);

    function resetBudgetAmounts() {
        const nextBudgets = budgets.map((budget) => {
            if (budget.id === "compte-courant") {
                return {
                    ...budget,
                    resetAmount: 1000,
                };
            }

            if (budget.id === "livret-a") {
                return {
                    ...budget,
                    resetAmount: 5000,
                };
            }

            return budget;
        });

        onUpdateBudgets(nextBudgets);
        setShowBudgetResetConfirmation(false);
    }

    function roundCurrency(value: number) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function sanitizeMoneyValue(value: string) {
        return value
            .replace(".", ",")
            .replace(/[^\d,]/g, "")
            .replace(/(,.*),/g, "$1");
    }

    function parseMoneyValue(value: string) {
        return Number(value.replace(",", "."));
    }

    /*
    * Retourne l'impact des opérations du cycle actuel
    * sur le compte demandé.
    *
    * C'est exactement le même principe que dans BudgetList.
    */
    function getCurrentAccountImpact(accountId: EditableAccountId) {
        return operations
            .filter((operation) =>
                isInCurrentBudgetCycle(
                    operation.createdAt,
                    settings.budgetResetDay,
                ),
            )
            .reduce(
                (total, operation) =>
                    total + (operation.accountImpact[accountId] ?? 0),
                0,
            );
    }

    /*
    * Retourne le montant actuellement visible dans BudgetList.
    */
    function getCurrentDisplayedAccountAmount(accountId: EditableAccountId) {
        const budget = budgets.find((budget) => budget.id === accountId);

        if (!budget) {
            return 0;
        }

        const accountImpact = getCurrentAccountImpact(accountId);

        return roundCurrency(
            Math.max(budget.amount + accountImpact, 0),
        );
    }

    function openAccountEditor() {
        setSelectedAccountId(null);
        setAccountAmountInput("");
        setAccountEditorStep(1);
        setShowAccountEditor(true);
    }

    function closeAccountEditor() {
        setShowAccountEditor(false);
        setAccountEditorStep(1);
        setSelectedAccountId(null);
        setAccountAmountInput("");
    }

    function goToAccountAmountStep() {
        if (!selectedAccountId) {
            return;
        }

        const currentAmount =
            getCurrentDisplayedAccountAmount(selectedAccountId);

        setAccountAmountInput(
            String(currentAmount).replace(".", ","),
        );

        setAccountEditorStep(2);
    }

    function saveAccountDisplayedAmount() {
        if (!selectedAccountId) {
            return;
        }

        const parsedAmount = parseMoneyValue(accountAmountInput);

        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
            return;
        }

        /*
        * BudgetList calcule :
        *
        * budget.amount + accountImpact
        *
        * Donc pour obtenir exactement le montant demandé :
        *
        * budget.amount = montant demandé - accountImpact
        */
        const currentImpact =
            getCurrentAccountImpact(selectedAccountId);

        const newBaseAmount = roundCurrency(
            parsedAmount - currentImpact,
        );

        onUpdateBudgets(
            budgets.map((budget) =>
                budget.id === selectedAccountId
                    ? {
                        ...budget,
                        amount: newBaseAmount,
                    }
                    : budget,
            ),
        );

        closeAccountEditor();
    }

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
        let sanitizedValue = value.replace(/\./g, ",").replace(/[^\d,-]/g, "");

        const isNegative = sanitizedValue.startsWith("-");

        sanitizedValue = sanitizedValue.replace(/-/g, "");

        const [integerPart = "", ...decimalParts] = sanitizedValue.split(",");

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

        setLatitudeInput(String(parsedLatitude).replace(".", ","));
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

        setLongitudeInput(String(parsedLongitude).replace(".", ","));
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

    async function checkForUpdates() {
        setIsCheckingUpdate(true);
        setUpdateCheckError(null);

        try {
            const response = await fetch("/api/system/update-status", {
                method: "GET",
                cache: "no-store",
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message ?? `Erreur HTTP ${response.status}`,
                );
            }

            setUpdateStatus(data);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Impossible de vérifier les mises à jour.";

            console.error(
                "Erreur pendant la vérification des mises à jour :",
                error,
            );

            setUpdateCheckError(message);
            setUpdateStatus(null);
        } finally {
            setIsCheckingUpdate(false);
        }
    }

    async function updateAndReboot() {
        if (isRebooting) {
            return;
        }

        window.localStorage.setItem(REBOOT_STORAGE_KEY, "true");

        setShowRebootConfirmation(true);
        setIsRebooting(true);
        setRebootError(null);

        setRebootProgress({
            status: "running",
            progress: 1,
            message: "Lancement de la mise à jour…",
            error: null,
        });

        try {
            const response = await fetch("/api/system/reboot", {
                method: "POST",
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.message ?? `Erreur HTTP ${response.status}`,
                );
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Impossible de lancer le redémarrage.";

            console.error("Erreur pendant le redémarrage :", error);

            window.localStorage.removeItem(REBOOT_STORAGE_KEY);

            setRebootError(message);
            setIsRebooting(false);

            setRebootProgress({
                status: "error",
                progress: 0,
                message: "La mise à jour a échoué.",
                error: message,
            });
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
                <h2 className="text-3xl font-bold">Paramètres</h2>

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
                    cursor: dragState.current.active ? "grabbing" : "grab",
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
                                            if (
                                                currentValue === "" ||
                                                currentValue === "-"
                                            ) {
                                                return currentValue === "-"
                                                    ? "-0,"
                                                    : "0,";
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
                                            if (
                                                currentValue === "" ||
                                                currentValue === "-"
                                            ) {
                                                return currentValue === "-"
                                                    ? "-0,"
                                                    : "0,";
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
                                update("salaryDay", Number(event.target.value))
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

                <Section title="Budgets">
                    <p className="text-sm leading-relaxed text-slate-400">
                        Gère les montants de référence ou corrige manuellement
                        le solde actuellement affiché d'un compte.
                    </p>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onPointerUp={(event) => {
                                event.stopPropagation();
                                openAccountEditor();
                            }}
                            onClick={(event) => {
                                if (event.detail === 0) {
                                    openAccountEditor();
                                }
                            }}
                            className="
                                flex w-full items-center justify-center gap-3
                                rounded-xl border border-blue-400/30
                                bg-blue-500/10 px-5 py-4
                                font-bold text-blue-300
                                active:bg-blue-500/20
                            "
                            style={{
                                touchAction: "none",
                            }}
                        >
                            <WalletCards size={22} />

                            Modifier un compte
                        </button>

                        <button
                            type="button"
                            onPointerUp={(event) => {
                                event.stopPropagation();
                                setShowBudgetResetConfirmation(true);
                            }}
                            onClick={(event) => {
                                if (event.detail === 0) {
                                    setShowBudgetResetConfirmation(true);
                                }
                            }}
                            className="
                                flex w-full items-center justify-center gap-3
                                rounded-xl border border-amber-400/30
                                bg-amber-500/10 px-5 py-4
                                font-bold text-amber-300
                                active:bg-amber-500/20
                            "
                            style={{
                                touchAction: "none",
                            }}
                        >
                            <RotateCcw size={22} />

                            Réinitialiser les budgets
                        </button>
                    </div>
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
                            <option className="bg-[#0b1623]" value="dark">
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
                        Récupère la dernière version de LifeBoard, compile
                        l’application puis redémarre le Raspberry Pi.
                    </p>

                    {isCheckingUpdate && (
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
                            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />

                            <span className="text-sm font-medium">
                                Vérification des mises à jour…
                            </span>
                        </div>
                    )}

                    {!isCheckingUpdate && updateStatus?.updateAvailable && (
                        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-300">
                            <TriangleAlert
                                size={24}
                                className="mt-0.5 shrink-0"
                            />

                            <div>
                                <p className="font-bold">
                                    Des mises à jour de l’application sont
                                    disponibles
                                </p>

                                {typeof updateStatus.behindCount === "number" &&
                                    updateStatus.behindCount > 0 && (
                                        <p className="mt-1 text-sm text-amber-200/75">
                                            {updateStatus.behindCount === 1
                                                ? "1 modification distante est disponible."
                                                : `${updateStatus.behindCount} modifications distantes sont disponibles.`}
                                        </p>
                                    )}
                            </div>
                        </div>
                    )}

                    {!isCheckingUpdate &&
                        updateStatus &&
                        !updateStatus.updateAvailable && (
                            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
                                LifeBoard est à jour.
                            </div>
                        )}

                    {updateCheckError && (
                        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                            <p className="text-sm text-amber-300">
                                Impossible de vérifier automatiquement les mises
                                à jour.
                            </p>

                            <button
                                type="button"
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                    void checkForUpdates();
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        void checkForUpdates();
                                    }
                                }}
                                className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-200 active:bg-amber-500/20"
                                style={{
                                    touchAction: "none",
                                }}
                            >
                                Réessayer
                            </button>
                        </div>
                    )}

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
                            if (event.detail === 0 && !isRebooting) {
                                setShowRebootConfirmation(true);
                            }
                        }}
                        className={`
      flex w-full items-center justify-center gap-3
      rounded-xl px-5 py-4
      font-bold text-white
      disabled:cursor-not-allowed
      disabled:opacity-50
      ${
          updateStatus?.updateAvailable
              ? "bg-amber-600 active:bg-amber-700"
              : "bg-red-600 active:bg-red-700"
      }
    `}
                        style={{
                            touchAction: "none",
                        }}
                    >
                        {updateStatus?.updateAvailable ? (
                            <TriangleAlert size={22} />
                        ) : (
                            <Power size={22} />
                        )}

                        {isRebooting
                            ? "Mise à jour en cours..."
                            : updateStatus?.updateAvailable
                              ? "Installer la mise à jour et redémarrer"
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
                            <div className="mt-6">
                                <div className="text-center">
                                    <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-red-400 border-t-transparent" />

                                    <p className="text-xl font-bold">
                                        {rebootProgress.status === "rebooting"
                                            ? "Mise à jour terminée"
                                            : "Mise à jour en cours…"}
                                    </p>

                                    <p className="mt-3 min-h-12 text-slate-400">
                                        {rebootProgress.message}
                                    </p>
                                </div>

                                <div className="mt-7">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-400">
                                            Progression
                                        </span>

                                        <span className="text-lg font-bold text-red-300">
                                            {Math.max(
                                                0,
                                                Math.min(
                                                    100,
                                                    rebootProgress.progress,
                                                ),
                                            )}
                                            %
                                        </span>
                                    </div>

                                    <div className="h-4 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="
            h-full rounded-full bg-red-500
            transition-[width] duration-500 ease-out
          "
                                            style={{
                                                width: `${Math.max(
                                                    0,
                                                    Math.min(
                                                        100,
                                                        rebootProgress.progress,
                                                    ),
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {rebootProgress.status === "rebooting" ? (
                                    <p className="mt-5 text-center text-sm font-medium text-amber-300">
                                        Le système va redémarrer dans un
                                        instant. Veuillez patienter.
                                    </p>
                                ) : (
                                    <p className="mt-5 text-center text-sm text-slate-500">
                                        N’éteignez pas le Raspberry Pi et ne
                                        fermez pas cette fenêtre.
                                    </p>
                                )}

                                {rebootError && (
                                    <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-300">
                                        {rebootError}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <p className="mt-6 text-slate-300">
                                    Les commandes suivantes seront exécutées :
                                </p>

                                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm text-slate-300">
                                    <div>git fetch origin</div>
                                    <div>git reset --hard origin/[branche]</div>
                                    <div>npm ci</div>
                                    <div>npm run build</div>
                                    <div>sudo reboot</div>
                                </div>

                                <p className="mt-4 text-sm text-amber-300">
                                    L’application sera indisponible pendant la
                                    mise à jour et le redémarrage.
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
                                                setShowRebootConfirmation(
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
            {showAccountEditor && (
                <div
                    className="
                        fixed inset-0 z-[85]
                        flex items-center justify-center
                        bg-black/75 p-6
                        backdrop-blur-sm
                    "
                    style={{
                        touchAction: "none",
                    }}
                >
                    <div
                        className="
                            w-full max-w-lg
                            rounded-2xl
                            border border-blue-400/30
                            bg-[#0b1623]
                            p-8 shadow-2xl
                        "
                    >
                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <div
                                    className="
                                        mb-4 flex h-14 w-14
                                        items-center justify-center
                                        rounded-full
                                        bg-blue-500/15
                                        text-blue-300
                                    "
                                >
                                    <WalletCards size={30} />
                                </div>

                                <h2 className="text-2xl font-bold">
                                    Modifier un compte
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    Étape {accountEditorStep} sur 2
                                </p>
                            </div>

                            <button
                                type="button"
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                    closeAccountEditor();
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        closeAccountEditor();
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

                        {/* ÉTAPE 1 : choix du compte */}
                        {accountEditorStep === 1 && (
                            <>
                                <p className="mt-6 text-slate-300">
                                    Quel compte souhaites-tu modifier ?
                                </p>

                                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                    Cette modification corrigera directement le
                                    montant actuellement visible sur la page
                                    principale.
                                </p>

                                <div className="mt-5 space-y-3">
                                    <button
                                        type="button"
                                        onPointerUp={(event) => {
                                            event.stopPropagation();
                                            setSelectedAccountId(
                                                "compte-courant",
                                            );
                                        }}
                                        onClick={(event) => {
                                            if (event.detail === 0) {
                                                setSelectedAccountId(
                                                    "compte-courant",
                                                );
                                            }
                                        }}
                                        className={`
                                            flex w-full items-center
                                            justify-between rounded-xl
                                            border p-4 text-left
                                            transition
                                            ${
                                                selectedAccountId ===
                                                "compte-courant"
                                                    ? "border-blue-400/60 bg-blue-500/15"
                                                    : "border-white/10 bg-white/[0.04] active:bg-white/[0.08]"
                                            }
                                        `}
                                        style={{
                                            touchAction: "none",
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">
                                                💳
                                            </div>

                                            <div>
                                                <p className="font-bold text-white">
                                                    Compte courant
                                                </p>

                                                <p className="mt-1 text-sm text-slate-400">
                                                    Actuellement{" "}
                                                    {getCurrentDisplayedAccountAmount(
                                                        "compte-courant",
                                                    ).toLocaleString("fr-FR", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{" "}
                                                    €
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={`
                                                flex h-6 w-6 items-center
                                                justify-center rounded-full
                                                border
                                                ${
                                                    selectedAccountId ===
                                                    "compte-courant"
                                                        ? "border-blue-400 bg-blue-500"
                                                        : "border-white/20"
                                                }
                                            `}
                                        >
                                            {selectedAccountId ===
                                                "compte-courant" && (
                                                <div className="h-2 w-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onPointerUp={(event) => {
                                            event.stopPropagation();
                                            setSelectedAccountId("livret-a");
                                        }}
                                        onClick={(event) => {
                                            if (event.detail === 0) {
                                                setSelectedAccountId("livret-a");
                                            }
                                        }}
                                        className={`
                                            flex w-full items-center
                                            justify-between rounded-xl
                                            border p-4 text-left
                                            transition
                                            ${
                                                selectedAccountId === "livret-a"
                                                    ? "border-blue-400/60 bg-blue-500/15"
                                                    : "border-white/10 bg-white/[0.04] active:bg-white/[0.08]"
                                            }
                                        `}
                                        style={{
                                            touchAction: "none",
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">
                                                🐷
                                            </div>

                                            <div>
                                                <p className="font-bold text-white">
                                                    Livret A
                                                </p>

                                                <p className="mt-1 text-sm text-slate-400">
                                                    Actuellement{" "}
                                                    {getCurrentDisplayedAccountAmount(
                                                        "livret-a",
                                                    ).toLocaleString("fr-FR", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{" "}
                                                    €
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={`
                                                flex h-6 w-6 items-center
                                                justify-center rounded-full
                                                border
                                                ${
                                                    selectedAccountId === "livret-a"
                                                        ? "border-blue-400 bg-blue-500"
                                                        : "border-white/20"
                                                }
                                            `}
                                        >
                                            {selectedAccountId ===
                                                "livret-a" && (
                                                <div className="h-2 w-2 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </button>
                                </div>

                                <div
                                    className="
                                        mt-5 rounded-xl
                                        border border-amber-400/20
                                        bg-amber-500/10 p-4
                                    "
                                >
                                    <p className="text-sm leading-relaxed text-amber-200">
                                        Cette fonction sert notamment à corriger
                                        rapidement ton solde après une période où
                                        certaines opérations n'ont pas été
                                        enregistrées dans LifeBoard.
                                    </p>
                                </div>

                                <div className="mt-7 flex gap-4">
                                    <button
                                        type="button"
                                        onPointerUp={(event) => {
                                            event.stopPropagation();
                                            closeAccountEditor();
                                        }}
                                        onClick={(event) => {
                                            if (event.detail === 0) {
                                                closeAccountEditor();
                                            }
                                        }}
                                        className="
                                            flex-1 rounded-xl
                                            border border-white/10
                                            bg-white/5
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
                                        disabled={!selectedAccountId}
                                        onPointerUp={(event) => {
                                            event.stopPropagation();

                                            if (selectedAccountId) {
                                                goToAccountAmountStep();
                                            }
                                        }}
                                        onClick={(event) => {
                                            if (
                                                event.detail === 0 &&
                                                selectedAccountId
                                            ) {
                                                goToAccountAmountStep();
                                            }
                                        }}
                                        className="
                                            flex-1 rounded-xl
                                            bg-blue-600
                                            px-5 py-4 font-bold text-white
                                            active:bg-blue-700
                                            disabled:cursor-not-allowed
                                            disabled:opacity-40
                                        "
                                        style={{
                                            touchAction: "none",
                                        }}
                                    >
                                        Continuer
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ÉTAPE 2 : modification du montant */}
                        {accountEditorStep === 2 &&
                            selectedAccountId && (
                                <>
                                    <button
                                        type="button"
                                        onPointerUp={(event) => {
                                            event.stopPropagation();
                                            setAccountEditorStep(1);
                                        }}
                                        onClick={(event) => {
                                            if (event.detail === 0) {
                                                setAccountEditorStep(1);
                                            }
                                        }}
                                        className="
                                            mt-5 flex items-center gap-2
                                            text-sm font-semibold
                                            text-slate-400
                                            active:text-white
                                        "
                                        style={{
                                            touchAction: "none",
                                        }}
                                    >
                                        <ArrowLeft size={18} />

                                        Étape précédente
                                    </button>

                                    <div
                                        className="
                                            mt-5 rounded-xl
                                            border border-white/10
                                            bg-white/[0.04] p-4
                                        "
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">
                                                {selectedAccountId ===
                                                "compte-courant"
                                                    ? "💳"
                                                    : "🐷"}
                                            </div>

                                            <div>
                                                <p className="font-bold text-white">
                                                    {selectedAccountId ===
                                                    "compte-courant"
                                                        ? "Compte courant"
                                                        : "Livret A"}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-400">
                                                    Montant actuellement affiché
                                                </p>

                                                <p className="mt-1 text-xl font-bold text-blue-300">
                                                    {getCurrentDisplayedAccountAmount(
                                                        selectedAccountId,
                                                    ).toLocaleString("fr-FR", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{" "}
                                                    €
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <label>
                                            <p className="mb-2 text-sm text-slate-400">
                                                Nouveau montant
                                            </p>

                                            <div
                                                className="
                                                    flex items-center
                                                    rounded-xl
                                                    border border-white/10
                                                    bg-white/[0.04]
                                                    px-2
                                                "
                                            >
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    pattern="[0-9]*[.,]?[0-9]*"
                                                    autoComplete="off"
                                                    value={accountAmountInput}
                                                    onChange={(event) =>
                                                        setAccountAmountInput(
                                                            sanitizeMoneyValue(event.target.value),
                                                        )
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            saveAccountDisplayedAmount();
                                                        }
                                                    }}
                                                    className="
                                                        min-w-0 flex-1
                                                        bg-transparent
                                                        px-2 py-4
                                                        text-xl font-bold
                                                        text-white
                                                        outline-none
                                                        select-text
                                                    "
                                                />

                                                <button
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        if (!accountAmountInput.includes(",")) {
                                                            setAccountAmountInput((currentValue) =>
                                                                currentValue.length === 0
                                                                    ? "0,"
                                                                    : `${currentValue},`,
                                                            );
                                                        }
                                                    }}
                                                    className="
                                                        mr-2 rounded-lg
                                                        border border-white/10
                                                        bg-white/10
                                                        px-3 py-2
                                                        text-lg font-bold
                                                        text-white
                                                        active:bg-white/20
                                                    "
                                                >
                                                    ,
                                                </button>

                                                <span className="pr-2 text-xl font-bold text-slate-400">
                                                    €
                                                </span>
                                            </div>
                                        </label>
                                    </div>

                                    <div
                                        className="
                                            mt-5 rounded-xl
                                            border border-blue-400/20
                                            bg-blue-500/10 p-4
                                        "
                                    >
                                        <p className="text-sm leading-relaxed text-blue-200">
                                            Les anciennes opérations sont
                                            conservées. LifeBoard ajustera la
                                            valeur de base du compte afin que le
                                            montant affiché corresponde
                                            exactement au nouveau montant saisi.
                                        </p>
                                    </div>

                                    <div className="mt-7 flex gap-4">
                                        <button
                                            type="button"
                                            onPointerUp={(event) => {
                                                event.stopPropagation();
                                                setAccountEditorStep(1);
                                            }}
                                            onClick={(event) => {
                                                if (event.detail === 0) {
                                                    setAccountEditorStep(1);
                                                }
                                            }}
                                            className="
                                                flex flex-1 items-center
                                                justify-center gap-2
                                                rounded-xl
                                                border border-white/10
                                                bg-white/5
                                                px-5 py-4 font-bold
                                                active:bg-white/10
                                            "
                                            style={{
                                                touchAction: "none",
                                            }}
                                        >
                                            <ArrowLeft size={18} />

                                            Précédent
                                        </button>

                                        <button
                                            type="button"
                                            onPointerUp={(event) => {
                                                event.stopPropagation();
                                                saveAccountDisplayedAmount();
                                            }}
                                            onClick={(event) => {
                                                if (event.detail === 0) {
                                                    saveAccountDisplayedAmount();
                                                }
                                            }}
                                            className="
                                                flex-1 rounded-xl
                                                bg-blue-600
                                                px-5 py-4
                                                font-bold text-white
                                                active:bg-blue-700
                                            "
                                            style={{
                                                touchAction: "none",
                                            }}
                                        >
                                            Enregistrer
                                        </button>
                                    </div>
                                </>
                            )}
                    </div>
                </div>
            )}
            {showBudgetResetConfirmation && (
                <div
                    className="
                        fixed inset-0 z-[80]
                        flex items-center justify-center
                        bg-black/75 p-6
                        backdrop-blur-sm
                    "
                    style={{
                        touchAction: "none",
                    }}
                >
                    <div
                        className="
                            w-full max-w-lg
                            rounded-2xl
                            border border-amber-400/30
                            bg-[#0b1623]
                            p-8 shadow-2xl
                        "
                    >
                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <div
                                    className="
                                        mb-4 flex h-14 w-14
                                        items-center justify-center
                                        rounded-full
                                        bg-amber-500/15
                                        text-amber-300
                                    "
                                >
                                    <RotateCcw size={30} />
                                </div>

                                <h2 className="text-2xl font-bold">
                                    Réinitialiser les budgets ?
                                </h2>
                            </div>

                            <button
                                type="button"
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                    setShowBudgetResetConfirmation(false);
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        setShowBudgetResetConfirmation(false);
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

                        <p className="mt-6 text-slate-300">
                            Cette action remet les montants de référence
                            suivants :
                        </p>

                        <div className="mt-4 space-y-3">
                            <div
                                className="
                                    flex items-center justify-between
                                    rounded-xl border border-white/10
                                    bg-white/[0.04] p-4
                                "
                            >
                                <span className="font-medium text-slate-300">
                                    Compte courant
                                </span>

                                <span className="text-xl font-bold text-amber-300">
                                    1 000 €
                                </span>
                            </div>

                            <div
                                className="
                                    flex items-center justify-between
                                    rounded-xl border border-white/10
                                    bg-white/[0.04] p-4
                                "
                            >
                                <span className="font-medium text-slate-300">
                                    Livret A
                                </span>

                                <span className="text-xl font-bold text-amber-300">
                                    5 000 €
                                </span>
                            </div>
                        </div>

                        <div
                            className="
                                mt-5 rounded-xl
                                border border-blue-400/20
                                bg-blue-500/10 p-4
                            "
                        >
                            <p className="text-sm leading-relaxed text-blue-200">
                                Les montants actuellement affichés dans
                                « Mes budgets » sur la page principale ne
                                seront pas modifiés.
                            </p>

                            <p className="mt-2 text-sm leading-relaxed text-blue-200/70">
                                Les opérations existantes ne seront pas
                                supprimées ou modifiées.
                            </p>
                        </div>

                        <div className="mt-7 flex gap-4">
                            <button
                                type="button"
                                onPointerUp={(event) => {
                                    event.stopPropagation();
                                    setShowBudgetResetConfirmation(false);
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        setShowBudgetResetConfirmation(false);
                                    }
                                }}
                                className="
                                    flex-1 rounded-xl
                                    border border-white/10
                                    bg-white/5
                                    px-5 py-4
                                    font-bold
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
                                    resetBudgetAmounts();
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        resetBudgetAmounts();
                                    }
                                }}
                                className="
                                    flex-1 rounded-xl
                                    bg-amber-600
                                    px-5 py-4
                                    font-bold text-white
                                    active:bg-amber-700
                                "
                                style={{
                                    touchAction: "none",
                                }}
                            >
                                Réinitialiser
                            </button>
                        </div>
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
