import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const needles = await prisma.needle.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(needles);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const needle = await prisma.needle.create({
    data: {
      type:     body.type,
      size:     body.size,
      material: body.material || null,
      brand:    body.brand    || null,
      length:   body.length   || null,
      quantity: body.quantity  ? Number(body.quantity) : 1,
      notes:    body.notes    || null,
      status:   body.status   || "owned",
    },
  });
  return NextResponse.json(needle, { status: 201 });
}
