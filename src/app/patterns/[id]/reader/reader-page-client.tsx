"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PatternReader = dynamic(
  () => import("@/components/pattern-reader").then((m) => m.PatternReader),
  { ssr: false, loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#1a1a1a] text-white/40 text-sm">
      Đang khởi động reader…
    </div>
  )}
);

export type LinkedProject = {
  id: string;
  name: string;
  currentRow: number | null;
  totalRows: number | null;
};

type Props = {
  patternId: string;
  patternName: string;
  fileUrl: string;
  initialState: string | null;
  linkedProjects: LinkedProject[];
};

export function ReaderPageClient({ patternId, patternName, fileUrl, initialState, linkedProjects }: Props) {
  const router = useRouter();

  useEffect(() => {
    document.title = `${patternName} — Pattern Reader`;
    return () => { document.title = "Knitify — Knitting Journal"; };
  }, [patternName]);

  const parsed = (() => {
    if (!initialState) return null;
    try { return JSON.parse(initialState); } catch { return null; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#1a1a1a" }}>
      <PatternReader
        fileUrl={fileUrl}
        patternId={patternId}
        initialState={parsed}
        linkedProjects={linkedProjects}
        onClose={() => router.back()}
      />
    </div>
  );
}
