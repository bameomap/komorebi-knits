import { prisma } from "@/lib/db";
import { JournalClient } from "./journal-client";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const rawEntries = await prisma.journalEntry.findMany({
    orderBy: { date: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });

  const entries = rawEntries.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <JournalClient initialEntries={entries} projects={projects} />;
}
