import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const statusPath = path.join(
    process.cwd(),
    "scripts",
    "generation_status.json"
  );

  if (!fs.existsSync(statusPath)) {
    return NextResponse.json({
      isGenerating: false,
      mealPlan: 0,
      mealPlanMax: 1,
      images: 0,
      imagesMax: 7,
    });
  }

  const data = JSON.parse(fs.readFileSync(statusPath, "utf-8"));

  return NextResponse.json(data);
}