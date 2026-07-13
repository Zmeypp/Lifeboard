import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

let isUpdating = false;

export async function POST(request: NextRequest) {
  if (process.platform !== "linux") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "La mise à jour et le redémarrage sont uniquement disponibles sur le Raspberry Pi.",
      },
      {
        status: 400,
      },
    );
  }

  if (isUpdating) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Une mise à jour est déjà en cours.",
      },
      {
        status: 409,
      },
    );
  }

  /*
   * Évite qu'un autre site puisse déclencher facilement
   * la route depuis le navigateur.
   */
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;

      if (originHost !== host) {
        return NextResponse.json(
          {
            ok: false,
            message: "Requête non autorisée.",
          },
          {
            status: 403,
          },
        );
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message: "Origine de la requête invalide.",
        },
        {
          status: 403,
        },
      );
    }
  }

  const projectDirectory =
  process.env.LIFEBOARD_DIR ??
  "/home/lifeboard/Desktop/Lifeboard";

  const scriptPath = path.join(
    projectDirectory,
    "scripts",
    "update_and_reboot.sh",
  );

  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Le script de mise à jour est introuvable.",
      },
      {
        status: 500,
      },
    );
  }

  isUpdating = true;

  try {
    const updateProcess = spawn(
      "/bin/bash",
      [scriptPath, projectDirectory],
      {
        cwd: projectDirectory,
        detached: true,
        stdio: "ignore",
        env: {
          ...process.env,
          HOME: process.env.HOME,
        },
      },
    );

    updateProcess.once("error", (error) => {
  isUpdating = false;

  console.error(
    "[lifeboard-update-spawn-error]",
    error,
  );
});

updateProcess.once(
  "exit",
  (code, signal) => {
    if (code !== 0) {
      console.error(
        "[lifeboard-update-exit-error]",
        {
          code,
          signal,
        },
      );
    }

    isUpdating = false;
  },
);

updateProcess.unref();

    /*
     * Le script continue même lorsque Next.js
     * est arrêté pendant le redémarrage.
     */

    return NextResponse.json(
      {
        ok: true,
        message:
          "Mise à jour lancée. Le Raspberry Pi redémarrera après la compilation.",
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    isUpdating = false;

    console.error(
      "[lifeboard-update-start-error]",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Impossible de lancer la mise à jour.",
      },
      {
        status: 500,
      },
    );
  }
}