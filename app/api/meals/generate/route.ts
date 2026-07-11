import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

let isRunning = false;

export async function POST() {
  if (isRunning) {
    return NextResponse.json(
      {
        ok: false,
        message: "Une génération est déjà en cours.",
      },
      {
        status: 409,
      },
    );
  }

  isRunning = true;

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "generate_meal_plan.py",
  );

  try {
    const processPython = spawn("python3", [scriptPath], {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    processPython.stdout.on("data", (data: Buffer) => {
      console.log(
        `[meal-generator] ${data.toString().trim()}`,
      );
    });

    processPython.stderr.on("data", (data: Buffer) => {
      console.error(
        `[meal-generator-error] ${data.toString().trim()}`,
      );
    });

    processPython.on("error", (error) => {
      console.error(
        "[meal-generator-spawn-error]",
        error,
      );

      isRunning = false;
    });

    processPython.on("close", (code, signal) => {
      isRunning = false;

      if (code === 0) {
        console.log(
          "[meal-generator] Génération terminée avec succès.",
        );
      } else {
        console.error(
          `[meal-generator] Arrêt en erreur. Code=${code}, signal=${signal}`,
        );
      }
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Génération lancée.",
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    isRunning = false;

    console.error(
      "[meal-generator-start-error]",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Impossible de démarrer la génération.",
      },
      {
        status: 500,
      },
    );
  }
}