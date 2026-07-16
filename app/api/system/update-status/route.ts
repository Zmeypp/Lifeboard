import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const execFileAsync = promisify(execFile);

const LIFEBOARD_DIR = path.resolve(
    process.env.LIFEBOARD_DIR ?? path.join(process.cwd()),
);

async function runGit(args: string[]) {
    const { stdout } = await execFileAsync("git", args, {
        cwd: LIFEBOARD_DIR,
        timeout: 30_000,
        maxBuffer: 1024 * 1024,
    });

    return stdout.trim();
}

export async function GET() {
    try {
        /*
         * Met à jour uniquement les références distantes.
         * Aucun fichier local n'est modifié.
         */
        await runGit(["fetch", "--quiet", "--prune", "origin"]);

        const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);

        const localCommit = await runGit(["rev-parse", "HEAD"]);

        let remoteCommit: string;

        try {
            remoteCommit = await runGit(["rev-parse", `origin/${branch}`]);
        } catch {
            return NextResponse.json(
                {
                    updateAvailable: false,
                    branch,
                    message: `La branche distante origin/${branch} est introuvable.`,
                },
                {
                    status: 404,
                    headers: {
                        "Cache-Control": "no-store",
                    },
                },
            );
        }

        const behindCountOutput = await runGit([
            "rev-list",
            "--count",
            `${localCommit}..${remoteCommit}`,
        ]);

        const aheadCountOutput = await runGit([
            "rev-list",
            "--count",
            `${remoteCommit}..${localCommit}`,
        ]);

        const behindCount = Number(behindCountOutput);
        const aheadCount = Number(aheadCountOutput);

        return NextResponse.json(
            {
                updateAvailable: behindCount > 0,
                branch,
                behindCount,
                aheadCount,
                localCommit,
                remoteCommit,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            },
        );
    } catch (error) {
        console.error(
            "Erreur pendant la vérification des mises à jour :",
            error,
        );

        return NextResponse.json(
            {
                updateAvailable: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Impossible de vérifier les mises à jour.",
            },
            {
                status: 500,
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    }
}
