import { prisma } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [
    projectCounts,
    yarns,
    journalCount,
    needleCount,
    activeProjects,
    recentEntries,
    wishlistPatterns,
    recentSwatches,
    patternCount,
  ] = await Promise.all([
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.yarn.findMany({ select: { yardage: true, skeinCount: true, yardagePerSkein: true } }),
    prisma.journalEntry.count(),
    prisma.needle.count({ where: { status: "owned" } }),
    prisma.project.findMany({
      where: { status: { in: ["in_progress", "planning"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, status: true, coverImage: true,
        startDate: true, progress: true, currentRow: true, totalRows: true,
        pattern: { select: { name: true, coverImage: true, patternFile: true } },
      },
    }),
    prisma.journalEntry.findMany({
      orderBy: { date: "desc" },
      take: 3,
      select: {
        id: true, title: true, date: true, mood: true, content: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.pattern.findMany({
      where: { status: "wishlist" },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, name: true, designer: true, coverImage: true, patternFile: true, difficulty: true, yarnWeight: true },
    }),
    prisma.gaugeSwatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, stitchesPer10: true, rowsPer10: true, needleSize: true, yarnBrand: true, yarnName: true, yarnWeight: true, image: true, yarns: true },
    }),
    prisma.pattern.count(),
  ]);

  const countMap = Object.fromEntries(projectCounts.map((g) => [g.status, g._count._all]));
  const totalYardage = yarns.reduce((sum, y) => {
    if (y.yardage) return sum + y.yardage;
    if (y.skeinCount && y.yardagePerSkein) return sum + y.skeinCount * y.yardagePerSkein;
    return sum;
  }, 0);

  return (
    <DashboardClient
      stats={{
        projects:       projectCounts.reduce((s, g) => s + g._count._all, 0),
        inProgress:     countMap["in_progress"] ?? 0,
        finished:       countMap["finished"] ?? 0,
        patterns:       patternCount,
        yarns:          yarns.length,
        journalEntries: journalCount,
        totalYardage:   Math.round(totalYardage),
        needles:        needleCount,
      }}
      activeProjects={activeProjects.map((p) => ({ ...p, startDate: p.startDate?.toISOString() ?? null }))}
      recentEntries={recentEntries.map((e) => ({ ...e, date: e.date.toISOString(), content: e.content ?? null }))}
      wishlistPatterns={wishlistPatterns}
      recentSwatches={recentSwatches}
    />
  );
}
