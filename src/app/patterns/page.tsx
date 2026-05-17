import { prisma } from "@/lib/db";
import { PatternsClient } from "./patterns-client";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const rawPatterns = await prisma.pattern.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  const patterns = rawPatterns.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <PatternsClient initialPatterns={patterns} />;
}
