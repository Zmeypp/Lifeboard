import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

let isRunning = false;

export async function POST() {
  if (isRunning) {
    return NextResponse.json({
      ok: false,
      message: "Génération déjà en cours",
    });
  }

  isRunning = true;

  const scriptPath = path.join(process.cwd(), "scripts", "generate_meal_plan.py");

  const processPython = spawn("python3", [scriptPath], {
    cwd: process.cwd(),
    shell: false,
  });

  processPython.stdout.on("data", (data) => {
    console.log(`[meal-generator] ${data}`);
  });

  processPython.stderr.on("data", (data) => {
    console.error(`[meal-generator-error] ${data}`);
  });

  processPython.on("close", () => {
    isRunning = false;
  });

  return NextResponse.json({
    ok: true,
    message: "Génération lancée",
  });
}