import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const session = await prisma.knittingSession.update({
    where: { id },
    data: {
      ...(body.endTime !== undefined && { endTime: body.endTime ? new Date(body.endTime) : null }),
      ...(body.duration !== undefined && { duration: body.duration }),
    },
  });
  return NextResponse.json(session);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.knittingSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
