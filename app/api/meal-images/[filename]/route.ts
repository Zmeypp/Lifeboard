import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    filename: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { filename } = await context.params;

    const safeFilename = path.basename(filename);

    const imagePath = path.join(
      process.cwd(),
      "public",
      "images",
      safeFilename,
    );

    const image = await readFile(imagePath);

    return new NextResponse(image, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error(
      "Impossible de lire l'image du plat :",
      error,
    );

    return NextResponse.json(
      {
        error: "Image introuvable",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}