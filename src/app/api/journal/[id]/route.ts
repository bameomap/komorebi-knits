import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const entry = await prisma.journalEntry.update({
    where: { id },
    data: {
      title:     body.title     ?? null,
      content:   body.content,
      mood:      body.mood      ?? null,
      projectId: body.projectId || null,
      tags:      body.tags   ? JSON.stringify(body.tags)   : null,
      images:    body.images ? JSON.stringify(body.images) : null,
      ...(body.date && { date: new Date(body.date) }),
    },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
