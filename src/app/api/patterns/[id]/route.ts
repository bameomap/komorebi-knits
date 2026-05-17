import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pattern = await prisma.pattern.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pattern);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const pattern = await prisma.pattern.update({
    where: { id },
    data: {
      ...(body.name       !== undefined && { name:        body.name }),
      ...(body.designer   !== undefined && { designer:    body.designer   ?? null }),
      ...(body.source     !== undefined && { source:      body.source     ?? null }),
      ...(body.sourceUrl  !== undefined && { sourceUrl:   body.sourceUrl  ?? null }),
      ...(body.category   !== undefined && { category:    body.category   ?? null }),
      ...(body.yarnWeight !== undefined && { yarnWeight:  body.yarnWeight ?? null }),
      ...(body.difficulty !== undefined && { difficulty:  body.difficulty ?? null }),
      ...(body.notes      !== undefined && { notes:       body.notes      ?? null }),
      ...(body.isFavorite !== undefined && { isFavorite:  body.isFavorite }),
      ...(body.status     !== undefined && { status:      body.status }),
      ...(body.coverImage !== undefined && { coverImage:  body.coverImage ?? null }),
      ...(body.patternFile !== undefined && { patternFile: body.patternFile ?? null }),
      ...(body.readerState !== undefined && { readerState: body.readerState ?? null }),
    },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(pattern);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.pattern.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
