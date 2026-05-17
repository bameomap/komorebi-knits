import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReaderPageClient } from "./reader-page-client";

export const dynamic = "force-dynamic";

export default async function PatternReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pattern = await prisma.pattern.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      patternFile: true,
      readerState: true,
      projects: {
        select: { id: true, name: true, currentRow: true, totalRows: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!pattern || !pattern.patternFile) notFound();

  return (
    <ReaderPageClient
      patternId={pattern.id}
      patternName={pattern.name}
      fileUrl={pattern.patternFile}
      initialState={pattern.readerState ?? null}
      linkedProjects={pattern.projects}
    />
  );
}
