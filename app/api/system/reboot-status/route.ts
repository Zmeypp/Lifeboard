import { NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RebootStatus = {
    status: "idle" | "running" | "rebooting" | "error";
    progress: number;
    message: string;
    error: string | null;
    updatedAt?: string;
};

const statusFile = path.join(os.homedir(), "lifeboard-update-status.json");

export async function GET() {
    try {
        const content = await fs.readFile(statusFile, "utf-8");

        const status = JSON.parse(content) as RebootStatus;

        return NextResponse.json(status, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch {
        return NextResponse.json(
            {
                status: "idle",
                progress: 0,
                message: "Aucune mise à jour en cours.",
                error: null,
            } satisfies RebootStatus,
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    }
}
