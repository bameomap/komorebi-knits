import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "./project-detail-client";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      pattern: { select: { id: true, name: true, coverImage: true, patternFile: true } },
      gaugeSwatch: { select: { id: true, stitchesPer10: true, rowsPer10: true, needleSize: true, yarnBrand: true, yarnName: true, yarnWeight: true, image: true, yarns: true } },
      journalEntries: { orderBy: { date: "desc" } },
      sessions: { orderBy: { startTime: "desc" } },
      yarns: {
        include: {
          yarn: { select: { id: true, brand: true, name: true, colorway: true, color: true, weight: true, image: true } },
        },
      },
    },
  });

  if (!project) notFound();

  const serialized = {
    ...project,
    progress:       project.progress       ?? null,
    currentRow:     project.currentRow     ?? null,
    totalRows:      project.totalRows      ?? null,
    gaugeSwatchId:  project.gaugeSwatchId  ?? null,
    modifications:  project.modifications  ?? null,
    startDate: project.startDate?.toISOString() ?? null,
    endDate:   project.endDate?.toISOString()   ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    journalEntries: project.journalEntries.map((e) => ({
      ...e,
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
    sessions: project.sessions.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return <ProjectDetailClient project={serialized} />;
}
