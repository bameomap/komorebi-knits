import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessions = await prisma.knittingSession.findMany({
    where: { projectId: id },
    orderBy: { startTime: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const session = await prisma.knittingSession.create({
    data: {
      projectId: id,
      startTime: body.startTime ? new Date(body.startTime) : new Date(),
    },
  });
  return NextResponse.json(session);
}
