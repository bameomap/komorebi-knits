import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const needle = await prisma.needle.update({
    where: { id },
    data: {
      ...(body.type     !== undefined && { type:     body.type }),
      ...(body.size     !== undefined && { size:     body.size }),
      ...(body.material !== undefined && { material: body.material || null }),
      ...(body.brand    !== undefined && { brand:    body.brand    || null }),
      ...(body.length   !== undefined && { length:   body.length   || null }),
      ...(body.quantity !== undefined && { quantity: Number(body.quantity) }),
      ...(body.notes    !== undefined && { notes:    body.notes    || null }),
      ...(body.status   !== undefined && { status:   body.status }),
    },
  });
  return NextResponse.json(needle);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.needle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
