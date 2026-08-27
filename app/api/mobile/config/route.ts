import fs from "node:fs/promises";
import path from "node:path";

import type { Budget } from "@/data/budgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MobileConfig = {
    budgets: Budget[];
    updatedAt: number;
};

const CONFIG_DIRECTORY = path.join(
    process.cwd(),
    "data",
    "runtime",
);

const CONFIG_FILE = path.join(
    CONFIG_DIRECTORY,
    "mobile-config.json",
);

async function readConfig(): Promise<MobileConfig> {
    try {
        const content = await fs.readFile(
            CONFIG_FILE,
            "utf-8",
        );

        const parsed = JSON.parse(
            content,
        ) as MobileConfig;

        return {
            budgets: Array.isArray(parsed.budgets)
                ? parsed.budgets
                : [],
            updatedAt:
                typeof parsed.updatedAt === "number"
                    ? parsed.updatedAt
                    : 0,
        };
    } catch {
        return {
            budgets: [],
            updatedAt: 0,
        };
    }
}

async function writeConfig(
    config: MobileConfig,
) {
    await fs.mkdir(
        CONFIG_DIRECTORY,
        {
            recursive: true,
        },
    );

    await fs.writeFile(
        CONFIG_FILE,
        JSON.stringify(config, null, 2),
        "utf-8",
    );
}

export async function GET() {
    const config =
        await readConfig();

    const accounts = config.budgets
        .filter(
            (budget) =>
                budget.type === "account",
        )
        .map((budget) => ({
            id: budget.id,
            name: budget.name,
        }));

    const budgets = config.budgets
        .filter(
            (budget) =>
                budget.type === "spending",
        )
        .map((budget) => ({
            id: budget.id,
            name: budget.name,
            linkedAccountId:
                budget.linkedAccountId ??
                null,
        }));

    return Response.json({
        success: true,
        accounts,
        budgets,
        updatedAt:
            config.updatedAt,
    });
}

export async function POST(
    request: Request,
) {
    try {
        const body =
            await request.json();

        if (
            !body ||
            !Array.isArray(body.budgets)
        ) {
            return Response.json(
                {
                    success: false,
                    message:
                        "Le champ budgets est invalide.",
                },
                {
                    status: 400,
                },
            );
        }

        const config: MobileConfig = {
            budgets:
                body.budgets as Budget[],
            updatedAt:
                Date.now(),
        };

        await writeConfig(
            config,
        );

        return Response.json({
            success: true,
            budgetCount:
                config.budgets.length,
            updatedAt:
                config.updatedAt,
        });
    } catch (error) {
        console.error(
            "Erreur API config mobile :",
            error,
        );

        return Response.json(
            {
                success: false,
                message:
                    "Impossible d'enregistrer la configuration mobile.",
            },
            {
                status: 500,
            },
        );
    }
}