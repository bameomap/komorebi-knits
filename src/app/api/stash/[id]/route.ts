import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const yarn = await prisma.yarn.update({
    where: { id },
    data: {
      brand:           body.brand,
      name:            body.name,
      colorway:        body.colorway        ?? null,
      colorCode:       body.colorCode       ?? null,
      weight:          body.weight          ?? null,
      fiber:           body.fiber           ?? null,
      yardage:         body.yardage         ? Number(body.yardage)         : null,
      skeinCount:      body.skeinCount      ? Number(body.skeinCount)      : null,
      yardagePerSkein: body.yardagePerSkein ? Number(body.yardagePerSkein) : null,
      color:           body.color           ?? null,
      notes:           body.notes           ?? null,
      image:           body.image           ?? null,
      status:          body.status          ?? undefined,
    },
    include: { _count: { select: { projectYarns: true } } },
  });
  return NextResponse.json(yarn);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.yarn.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
