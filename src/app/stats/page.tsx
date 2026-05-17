import { prisma } from "@/lib/db";
import { StatsClient } from "./stats-client";

export const dynamic = "force-dynamic";

function ydsForYarn(y: { yardage: number | null; skeinCount: number | null; yardagePerSkein: number | null }): number {
  if (y.yardage) return y.yardage;
  if (y.skeinCount && y.yardagePerSkein) return y.skeinCount * y.yardagePerSkein;
  return 0;
}

export default async function StatsPage() {
  const [patterns, projects, yarns, projectYarns] = await Promise.all([
    prisma.pattern.findMany({ select: { category: true, status: true, createdAt: true } }),
    prisma.project.findMany({ select: { status: true, createdAt: true } }),
    prisma.yarn.findMany({ select: { brand: true, weight: true, yardage: true, skeinCount: true, yardagePerSkein: true, status: true } }),
    prisma.projectYarn.findMany({ select: { amount: true, yarn: { select: { yardage: true, skeinCount: true, yardagePerSkein: true } } } }),
  ]);

  // Patterns by category
  const catMap: Record<string, number> = {};
  for (const p of patterns) {
    const key = p.category || "No category";
    catMap[key] = (catMap[key] ?? 0) + 1;
  }
  const patternsByCategory = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Patterns by status
  const statusMap: Record<string, number> = {};
  for (const p of patterns) {
    statusMap[p.status] = (statusMap[p.status] ?? 0) + 1;
  }
  const patternsByStatus = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Projects by status
  const projStatusMap: Record<string, number> = {};
  for (const p of projects) {
    projStatusMap[p.status] = (projStatusMap[p.status] ?? 0) + 1;
  }
  const projectsByStatus = Object.entries(projStatusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Stash by weight
  const weightMap: Record<string, number> = {};
  for (const y of yarns.filter((y) => y.status === "stash")) {
    const key = y.weight || "Unknown";
    weightMap[key] = (weightMap[key] ?? 0) + ydsForYarn(y);
  }
  const ORDER = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky", "Super Bulky", "Unknown"];
  const stashByWeight = Object.entries(weightMap)
    .map(([name, yardage]) => ({ name, yardage }))
    .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));

  // Yardage used: sum of ProjectYarn.amount (if set) or full yarn yardage
  const yardageUsed = projectYarns.reduce((sum, py) => {
    if (py.amount) return sum + py.amount;
    return sum + ydsForYarn(py.yarn);
  }, 0);

  // Monthly activity (last 12 months)
  const now = new Date();
  const months: { month: string; patterns: number; projects: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const patCount = patterns.filter((p) => p.createdAt.toISOString().startsWith(key)).length;
    const projCount = projects.filter((p) => p.createdAt.toISOString().startsWith(key)).length;
    months.push({ month: label, patterns: patCount, projects: projCount });
  }

  // Top brands (all stash yarns) — sort by yardage, fallback to skeins
  const brandMap: Record<string, { yardage: number; skeins: number }> = {};
  for (const y of yarns) {
    if (!y.brand) continue;
    const yds = ydsForYarn(y);
    const sk  = y.skeinCount ? Math.round(y.skeinCount) : (yds > 0 ? 1 : 0);
    if (!brandMap[y.brand]) brandMap[y.brand] = { yardage: 0, skeins: 0 };
    brandMap[y.brand].yardage += Math.round(yds);
    brandMap[y.brand].skeins  += sk;
  }
  const topBrands = Object.entries(brandMap)
    .map(([brand, v]) => ({ brand, yardage: v.yardage, skeins: v.skeins }))
    .filter((b) => b.skeins > 0)
    .sort((a, b) => (b.yardage - a.yardage) || (b.skeins - a.skeins))
    .slice(0, 10);

  const totalStashYds = yarns.filter((y) => y.status === "stash").reduce((s, y) => s + ydsForYarn(y), 0);

  return (
    <StatsClient
      patternsByCategory={patternsByCategory}
      patternsByStatus={patternsByStatus}
      projectsByStatus={projectsByStatus}
      stashByWeight={stashByWeight}
      topBrands={topBrands}
      monthlyActivity={months}
      totals={{
        patterns: patterns.length,
        projects: projects.length,
        stashYarns: yarns.filter((y) => y.status === "stash").length,
        stashYardage: totalStashYds,
        yardageUsed: Math.round(yardageUsed),
        finished: projects.filter((p) => p.status === "finished").length,
      }}
    />
  );
}
