import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const swatches = await prisma.gaugeSwatch.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(swatches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const swatch = await prisma.gaugeSwatch.create({
    data: {
      stitchesPer10: Number(body.stitchesPer10),
      rowsPer10:     body.rowsPer10  ? Number(body.rowsPer10)  : null,
      needleSize:    body.needleSize || null,
      yarnBrand:     body.yarnBrand  || null,
      yarnName:      body.yarnName   || null,
      yarnWeight:    body.yarnWeight || null,
      notes:         body.notes      || null,
      image:         body.image      || null,
      yarns:         body.yarns      || null,
    },
  });
  return NextResponse.json(swatch, { status: 201 });
}
