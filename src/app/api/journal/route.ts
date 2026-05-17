import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.journalEntry.findMany({
    orderBy: { date: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await prisma.journalEntry.create({
    data: {
      title: body.title || null,
      content: body.content,
      mood: body.mood || null,
      projectId: body.projectId || null,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      images: body.images ? JSON.stringify(body.images) : null,
      date: body.date ? new Date(body.date) : new Date(),
    },
    include: { project: { select: { id: true, name: true } } },
  });
  return NextResponse.json(entry, { status: 201 });
}
