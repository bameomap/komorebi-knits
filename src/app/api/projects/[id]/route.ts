import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      pattern: { select: { id: true, name: true } },
      journalEntries: { orderBy: { date: "desc" } },
      yarns: {
        include: {
          yarn: { select: { id: true, brand: true, name: true, colorway: true, color: true, weight: true, image: true } },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.needleSize !== undefined && { needleSize: body.needleSize ?? null }),
      ...(body.gauge !== undefined && { gauge: body.gauge ?? null }),
      ...(body.size !== undefined && { size: body.size ?? null }),
      ...(body.notes !== undefined && { notes: body.notes ?? null }),
      ...(body.patternId !== undefined && { patternId: body.patternId ?? null }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage ?? null }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.progress       !== undefined && { progress:       body.progress }),
      ...(body.currentRow     !== undefined && { currentRow:     body.currentRow     ?? null }),
      ...(body.totalRows      !== undefined && { totalRows:      body.totalRows      ?? null }),
      ...(body.gaugeSwatchId  !== undefined && { gaugeSwatchId:  body.gaugeSwatchId  ?? null }),
      ...(body.modifications  !== undefined && { modifications:  body.modifications  ?? null }),
    },
    include: { pattern: { select: { id: true, name: true } } },
  });
  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
