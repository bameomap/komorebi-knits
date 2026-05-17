import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const patterns = await prisma.pattern.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(patterns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pattern = await prisma.pattern.create({
    data: {
      name:        body.name,
      designer:    body.designer    || null,
      source:      body.source      || null,
      sourceUrl:   body.sourceUrl   || null,
      category:    body.category    || null,
      yarnWeight:  body.yarnWeight  || null,
      difficulty:  body.difficulty  || null,
      notes:       body.notes       || null,
      isFavorite:  body.isFavorite  ?? false,
      status:      body.status      ?? "wishlist",
      coverImage:  body.coverImage  || null,
    },
    include: { _count: { select: { projects: true } } },
  });
  return NextResponse.json(pattern, { status: 201 });
}
