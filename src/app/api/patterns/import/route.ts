import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ImportRow = {
  name: string;
  designer?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  source?: string | null;
};

export async function POST(req: NextRequest) {
  const rows: ImportRow[] = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows" }, { status: 400 });
  }

  // Fetch existing names to skip duplicates
  const existing = await prisma.pattern.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((p: { name: string }) => p.name.toLowerCase()));

  const toInsert = rows.filter((r) => r.name && !existingNames.has(r.name.toLowerCase()));

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped: rows.length });
  }

  await prisma.pattern.createMany({
    data: toInsert.map((r) => ({
      name:      r.name,
      designer:  r.designer  || null,
      sourceUrl: r.sourceUrl || null,
      notes:     r.notes     || null,
      source:    r.source    || null,
      status:    "wishlist",
    })),
  });

  return NextResponse.json({ imported: toInsert.length, skipped: rows.length - toInsert.length });
}
