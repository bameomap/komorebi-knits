import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { linkId } = await params;
  await prisma.projectYarn.delete({ where: { id: linkId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { linkId } = await params;
  const { amount } = await req.json();
  const updated = await prisma.projectYarn.update({
    where: { id: linkId },
    data: { amount: amount ?? null },
    include: {
      yarn: { select: { id: true, brand: true, name: true, colorway: true, color: true, weight: true, image: true } },
    },
  });
  return NextResponse.json(updated);
}
