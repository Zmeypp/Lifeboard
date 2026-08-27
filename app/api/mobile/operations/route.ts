import fs from "node:fs/promises";
import path from "node:path";

import type { Operation } from "@/data/operations";
import type { Budget } from "@/data/budgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MobileOperation = {
    id: string;
    type: "expense";
    merchant: string;
    amount: number;
    account: string;
    budget: string | null;
    date: number;
    source: "google_wallet" | "test";
    status: "pending_sync";
};

type InboxItem = {
    mobileId: string;
    operation: Operation;
    receivedAt: string;
};

type MobileOperationsStore = {
    pending: InboxItem[];
    processedIds: string[];
};

const RUNTIME_DIRECTORY = path.join(
    process.cwd(),
    "data",
    "runtime",
);

const OPERATIONS_FILE = path.join(
    RUNTIME_DIRECTORY,
    "mobile-operations.json",
);

const CONFIG_FILE = path.join(
    RUNTIME_DIRECTORY,
    "mobile-config.json",
);

async function readStore(): Promise<MobileOperationsStore> {
    try {
        const content = await fs.readFile(
            OPERATIONS_FILE,
            "utf-8",
        );

        const parsed = JSON.parse(content);

        return {
            pending: Array.isArray(parsed.pending)
                ? parsed.pending
                : [],
            processedIds: Array.isArray(parsed.processedIds)
                ? parsed.processedIds
                : [],
        };
    } catch {
        return {
            pending: [],
            processedIds: [],
        };
    }
}

async function writeStore(
    store: MobileOperationsStore,
) {
    await fs.mkdir(
        RUNTIME_DIRECTORY,
        {
            recursive: true,
        },
    );

    await fs.writeFile(
        OPERATIONS_FILE,
        JSON.stringify(store, null, 2),
        "utf-8",
    );
}

async function readBudgets(): Promise<Budget[]> {
    try {
        const content = await fs.readFile(
            CONFIG_FILE,
            "utf-8",
        );

        const config = JSON.parse(content);

        return Array.isArray(config.budgets)
            ? config.budgets
            : [];
    } catch {
        return [];
    }
}

function createOperation(
    mobile: MobileOperation,
    budgets: Budget[],
    index: number,
): Operation {
    const spendingBudget =
        mobile.budget !== null
            ? budgets.find(
                  (budget) =>
                      budget.id === mobile.budget,
              )
            : undefined;

    const accountImpact: Operation["accountImpact"] = {
        [mobile.account]: -mobile.amount,
    };

    const budgetImpact: Operation["budgetImpact"] =
        mobile.budget
            ? {
                  [mobile.budget]: -mobile.amount,
              }
            : {};

    const date = new Date(mobile.date);

    return {
        id: Date.now() + index,

        date: date.toLocaleDateString(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit",
            },
        ),

        createdAt: date.toISOString(),

        type: "expense",

        category:
            spendingBudget?.name ??
            "Sans budget",

        title: mobile.merchant,

        amount: -Math.abs(mobile.amount),

        color: "text-red-400",

        icon:
            spendingBudget?.icon ??
            "💳",

        accountImpact,

        budgetImpact,
    };
}

export async function GET() {
    const store = await readStore();

    return Response.json({
        success: true,
        pending: store.pending,
    });
}

export async function POST(
    request: Request,
) {
    try {
        const body = await request.json();

        if (
            !body ||
            !Array.isArray(body.operations)
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Le champ operations est invalide.",
                },
                {
                    status: 400,
                },
            );
        }

        const mobileOperations =
            body.operations as MobileOperation[];

        const store = await readStore();
        const budgets = await readBudgets();

        const acceptedIds: string[] = [];
        const duplicateIds: string[] = [];

        mobileOperations.forEach(
            (mobileOperation, index) => {
                if (
                    !mobileOperation.id ||
                    !mobileOperation.account ||
                    !Number.isFinite(
                        mobileOperation.amount,
                    ) ||
                    mobileOperation.amount <= 0
                ) {
                    return;
                }

                const alreadyPending =
                    store.pending.some(
                        (item) =>
                            item.mobileId ===
                            mobileOperation.id,
                    );

                const alreadyProcessed =
                    store.processedIds.includes(
                        mobileOperation.id,
                    );

                if (
                    alreadyPending ||
                    alreadyProcessed
                ) {
                    duplicateIds.push(
                        mobileOperation.id,
                    );

                    return;
                }

                store.pending.push({
                    mobileId:
                        mobileOperation.id,

                    operation:
                        createOperation(
                            mobileOperation,
                            budgets,
                            index,
                        ),

                    receivedAt:
                        new Date().toISOString(),
                });

                acceptedIds.push(
                    mobileOperation.id,
                );
            },
        );

        await writeStore(store);

        return Response.json({
            success: true,
            acceptedIds,
            duplicateIds,
        });
    } catch (error) {
        console.error(
            "Erreur réception opérations mobiles :",
            error,
        );

        return Response.json(
            {
                success: false,
                message:
                    "Impossible d'enregistrer les opérations.",
            },
            {
                status: 500,
            },
        );
    }
}

export async function DELETE(
    request: Request,
) {
    try {
        const body = await request.json();

        if (!Array.isArray(body.mobileIds)) {
            return Response.json(
                {
                    success: false,
                },
                {
                    status: 400,
                },
            );
        }

        const mobileIds =
            body.mobileIds as string[];

        const store = await readStore();

        store.pending =
            store.pending.filter(
                (item) =>
                    !mobileIds.includes(
                        item.mobileId,
                    ),
            );

        for (const id of mobileIds) {
            if (
                !store.processedIds.includes(id)
            ) {
                store.processedIds.push(id);
            }
        }

        await writeStore(store);

        return Response.json({
            success: true,
        });
    } catch {
        return Response.json(
            {
                success: false,
            },
            {
                status: 500,
            },
        );
    }
}