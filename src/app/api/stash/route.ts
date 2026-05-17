import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const yarns = await prisma.yarn.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projectYarns: true } } },
  });
  return NextResponse.json(yarns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const yarn = await prisma.yarn.create({
    data: {
      brand:          body.brand,
      name:           body.name,
      colorway:       body.colorway       || null,
      colorCode:      body.colorCode      || null,
      weight:         body.weight         || null,
      fiber:          body.fiber          || null,
      yardage:        body.yardage        ? Number(body.yardage)        : null,
      skeinCount:     body.skeinCount     ? Number(body.skeinCount)     : null,
      yardagePerSkein: body.yardagePerSkein ? Number(body.yardagePerSkein) : null,
      color:          body.color          || null,
      notes:          body.notes          || null,
      image:          body.image          || null,
      status:         body.status         || "stash",
    },
    include: { _count: { select: { projectYarns: true } } },
  });
  return NextResponse.json(yarn, { status: 201 });
}
