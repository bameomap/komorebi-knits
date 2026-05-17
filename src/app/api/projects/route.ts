import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { pattern: { select: { id: true, name: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      patternId: body.patternId || null,
      status: body.status || "planning",
      needleSize: body.needleSize || null,
      gauge: body.gauge || null,
      size: body.size || null,
      notes: body.notes || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
    include: { pattern: { select: { id: true, name: true } } },
  });
  return NextResponse.json(project, { status: 201 });
}
