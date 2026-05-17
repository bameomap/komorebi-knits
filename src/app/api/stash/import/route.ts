import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ImportRow = {
  brand: string;
  name: string;
  colorway?: string | null;
  colorCode?: string | null;
  weight?: string | null;
  fiber?: string | null;
  yardage?: number | null;
  skeinCount?: number | null;
  yardagePerSkein?: number | null;
  color?: string | null;
  notes?: string | null;
};

const WEIGHT_MAP: Record<string, string> = {
  "lace":        "Lace",
  "light fingering": "Lace",
  "fingering":   "Fingering",
  "sport":       "Sport",
  "dk":          "DK",
  "worsted":     "Worsted",
  "aran":        "Aran",
  "bulky":       "Bulky",
  "super bulky": "Super Bulky",
  "superbulky":  "Super Bulky",
};

function normalizeWeight(w: string | null | undefined): string | null {
  if (!w) return null;
  return WEIGHT_MAP[w.toLowerCase().trim()] ?? w;
}

export async function POST(req: NextRequest) {
  const rows: ImportRow[] = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  const toInsert = rows.filter((r) => r.brand?.trim() && r.name?.trim());

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: rows.length });
  }

  await prisma.yarn.createMany({
    data: toInsert.map((r) => ({
      brand:          r.brand.trim(),
      name:           r.name.trim(),
      colorway:       r.colorway  || null,
      colorCode:      r.colorCode || null,
      weight:         normalizeWeight(r.weight),
      fiber:          r.fiber     || null,
      yardage:        r.yardage   ?? null,
      skeinCount:     r.skeinCount ?? null,
      yardagePerSkein: r.yardagePerSkein ?? null,
      color:          r.color     || null,
      notes:          r.notes     || null,
      status:         "stash",
    })),
  });

  return NextResponse.json({ imported: toInsert.length, skipped: rows.length - toInsert.length });
}
