import { prisma } from "@/lib/db";
import { StashClient } from "./stash-client";

export const dynamic = "force-dynamic";

export default async function StashPage() {
  const rawYarns = await prisma.yarn.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projectYarns: true } } },
  });

  const yarns = rawYarns.map((y) => ({
    ...y,
    createdAt: y.createdAt.toISOString(),
    updatedAt: y.updatedAt.toISOString(),
  }));

  return <StashClient initialYarns={yarns} />;
}
