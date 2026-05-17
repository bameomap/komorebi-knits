import { prisma } from "@/lib/db";
import { GaugeClient } from "./gauge-client";

export const dynamic = "force-dynamic";

export default async function GaugePage() {
  const rawSwatches = await prisma.gaugeSwatch.findMany({ orderBy: { createdAt: "desc" } });
  const swatches = rawSwatches.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
  return <GaugeClient initialSwatches={swatches} />;
}
