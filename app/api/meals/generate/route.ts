import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

let isRunning = false;

const statusFilePath = path.join(
  process.cwd(),
  "scripts",
  "generation_status.json",
);

function resetAbandonedGenerationStatus() {
  try {
    if (!fs.existsSync(statusFilePath)) {
      return;
    }

    const rawStatus = fs.readFileSync(
      statusFilePath,
      "utf-8",
    );

    const status = JSON.parse(rawStatus);

    if (
      status.isGenerating === true ||
      status.status === "running" ||
      status.status === "waiting"
    ) {
      const resetStatus = {
        isGenerating: false,
        status: "error",
        mealPlan: status.mealPlan ?? 0,
        mealPlanMax: status.mealPlanMax ?? 1,
        images: status.images ?? 0,
        imagesMax: status.imagesMax ?? 7,
        error:
          "La génération précédente a été interrompue par l’arrêt de l’application.",
        waitReason: null,
        retryAt: null,
      };

      fs.writeFileSync(
        statusFilePath,
        JSON.stringify(resetStatus, null, 2),
        "utf-8",
      );
    }
  } catch (error) {
    console.error(
      "[meal-generator-status-reset-error]",
      error,
    );
  }
}

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