import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/projects/[id]/yarns — add a yarn to project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { yarnId, amount } = await req.json();

  // Prevent duplicates
  const existing = await prisma.projectYarn.findFirst({
    where: { projectId: id, yarnId },
  });
  if (existing) {
    // Update amount if already linked
    const updated = await prisma.projectYarn.update({
      where: { id: existing.id },
      data: { amount: amount ?? null },
      include: {
        yarn: { select: { id: true, brand: true, name: true, colorway: true, color: true, weight: true, image: true } },
      },
    });
    return NextResponse.json(updated);
  }

  const link = await prisma.projectYarn.create({
    data: { projectId: id, yarnId, amount: amount ?? null },
    include: {
      yarn: { select: { id: true, brand: true, name: true, colorway: true, color: true, weight: true, image: true } },
    },
  });
  return NextResponse.json(link);
}
