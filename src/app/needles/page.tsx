import { prisma } from "@/lib/db";
import { NeedlesClient } from "./needles-client";

export const dynamic = "force-dynamic";

export default async function NeedlesPage() {
  const needles = await prisma.needle.findMany({ orderBy: { createdAt: "desc" } });
  const serialized = needles.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));
  return <NeedlesClient initialNeedles={serialized} />;
}
