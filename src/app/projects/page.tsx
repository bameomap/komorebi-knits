import { prisma } from "@/lib/db";
import { ProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const rawProjects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      needleSize: true,
      gauge: true,
      size: true,
      notes: true,
      patternId: true,
      coverImage: true,
      progress: true,
      currentRow: true,
      totalRows: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      pattern: { select: { id: true, name: true, coverImage: true, patternFile: true } },
    },
  });

  const projects = rawProjects.map((p) => ({
    ...p,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProjectsClient initialProjects={projects} />;
}
