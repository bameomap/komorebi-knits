import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const swatch = await prisma.gaugeSwatch.update({
    where: { id },
    data: {
      stitchesPer10: body.stitchesPer10 != null ? Number(body.stitchesPer10) : undefined,
      rowsPer10:     body.rowsPer10     != null ? Number(body.rowsPer10)     : null,
      needleSize:    body.needleSize    ?? null,
      yarnBrand:     body.yarnBrand     ?? null,
      yarnName:      body.yarnName      ?? null,
      yarnWeight:    body.yarnWeight    ?? null,
      notes:         body.notes         ?? null,
      image:         body.image         ?? null,
      yarns:         body.yarns         ?? null,
    },
  });
  return NextResponse.json(swatch);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.gaugeSwatch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
