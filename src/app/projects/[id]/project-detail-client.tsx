"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import {
  ArrowLeft, CalendarDays, Pencil, Trash2, Plus, BookOpen, Ruler, Tag, Package, Search, X, FileText, Minus, Link2, Link2Off, ScrollText, Timer,
} from "lucide-react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  projectId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  createdAt: string;
};

type Mod = {
  id: string;
  category: string;
  note: string;
  original: string;
  modified: string;
};

const MOD_CATEGORIES = [
  "Cast On", "Needle Size", "Length", "Stitch Count",
  "Yarn Sub", "Sizing", "Shaping", "Other",
];

type JournalEntry = {
  id: string;
  date: string;
  title: string | null;
  content: string;
  mood: string | null;
  tags: string | null;
  images: string | null;
};

type YarnLink = {
  id: string;
  amount: number | null;
  yarn: {
    id: string;
    brand: string;
    name: string;
    colorway: string | null;
    color: string | null;
    weight: string | null;
    image: string | null;
  };
};

type LinkedSwatch = {
  id: string;
  stitchesPer10: number;
  rowsPer10: number | null;
  needleSize: string | null;
  yarnBrand: string | null;
  yarnName: string | null;
  yarnWeight: string | null;
  image: string | null;
  yarns: string | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  needleSize: string | null;
  gauge: string | null;
  size: string | null;
  notes: string | null;
  coverImage: string | null;
  progress: number | null;
  currentRow: number | null;
  totalRows: number | null;
  gaugeSwatchId: string | null;
  modifications: string | null;
  startDate: string | null;
  endDate: string | null;
  pattern: { id: string; name: string; coverImage: string | null; patternFile: string | null } | null;
  gaugeSwatch: LinkedSwatch | null;
  journalEntries: JournalEntry[];
  yarns: YarnLink[];
  sessions: Session[];
};

const STATUSES = [
  { value: "planning",    label: "Planning",    color: "bg-blue-100 text-blue-800" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "finished",    label: "Finished",    color: "bg-green-100 text-green-800" },
  { value: "hibernating", label: "Hibernating", color: "bg-slate-100 text-slate-600" },
  { value: "frogged",     label: "Frogged",     color: "bg-red-100 text-red-700" },
];
const STATUS_MAP    = Object.fromEntries(STATUSES.map((s) => [s.value, s]));
const STATUS_ICONS: Record<string, string> = {
  planning: "📋", in_progress: "🧶", finished: "✅", hibernating: "💤", frogged: "🐸",
};
const MOODS: Record<string, string> = {
  happy: "😊", excited: "🤩", proud: "🥰", focused: "🧘", motivated: "🔥", frustrated: "😤", tired: "😴",
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTotalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function ProjectDetailClient({ project: initial }: { project: Project }) {
  const router = useRouter();
  const [project, setProject] = useState(initial);
  const [editOpen, setEditOpen]         = useState(false);
  const [journalOpen, setJournalOpen]   = useState(false);
  const [yarnPickerOpen, setYarnPickerOpen] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"project" | string | null>(null); // "project" or entryId
  const [deleting, setDeleting]         = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [noteUploading, setNoteUploading]   = useState(false);
  const [entryUploading, setEntryUploading] = useState(false);

  // Edit journal entry
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({
    title: "", content: "", mood: "" as string | null,
    tags: "", date: "", images: [] as string[],
  });
  const [editEntrySaving, setEditEntrySaving] = useState(false);

  // Yarn picker state
  type StashYarn = { id: string; brand: string; name: string; colorway: string | null; color: string | null; weight: string | null; image: string | null; yardage: number | null; skeinCount: number | null; yardagePerSkein: number | null; status: string; };
  const [stash, setStash]               = useState<StashYarn[]>([]);
  const [stashLoading, setStashLoading] = useState(false);
  const [yarnSearch, setYarnSearch]     = useState("");
  const [selectedYarnId, setSelectedYarnId] = useState<string | null>(null);
  const [yarnAmount, setYarnAmount]     = useState("");
  const [markReserved, setMarkReserved] = useState(false);
  // Inline amount editing
  const [editingAmountId, setEditingAmountId]   = useState<string | null>(null);
  const [editingAmountVal, setEditingAmountVal] = useState("");

  // Modifications
  function parseMods(raw: string | null): Mod[] {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }
  const [mods, setMods] = useState<Mod[]>(() => parseMods(initial.modifications));
  const [modOpen, setModOpen]       = useState(false);
  const [editingMod, setEditingMod] = useState<Mod | null>(null);
  const [modForm, setModForm]       = useState({ category: "Other", note: "", original: "", modified: "" });
  const [modSaving, setModSaving]   = useState(false);

  async function saveMods(next: Mod[]) {
    setMods(next);
    await fetch(`/api/projects/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modifications: JSON.stringify(next) }),
    });
  }

  function openNewMod() {
    setEditingMod(null);
    setModForm({ category: "Other", note: "", original: "", modified: "" });
    setModOpen(true);
  }

  function openEditMod(m: Mod) {
    setEditingMod(m);
    setModForm({ category: m.category, note: m.note, original: m.original, modified: m.modified });
    setModOpen(true);
  }

  async function saveMod() {
    if (!modForm.note.trim()) return;
    setModSaving(true);
    const next = editingMod
      ? mods.map((m) => m.id === editingMod.id ? { ...editingMod, ...modForm } : m)
      : [...mods, { id: crypto.randomUUID(), ...modForm }];
    await saveMods(next);
    setModSaving(false);
    setModOpen(false);
  }

  async function deleteMod(id: string) {
    await saveMods(mods.filter((m) => m.id !== id));
  }

  // Session timer state
  const [sessions, setSessions] = useState<Session[]>(initial.sessions);
  const activeSession = sessions.find((s) => s.endTime === null) ?? null;
  const [elapsed, setElapsed] = useState<number>(() => {
    const active = initial.sessions.find((s) => s.endTime === null);
    if (!active) return 0;
    return Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000);
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0) +
    (activeSession ? elapsed : 0);

  async function startSession() {
    const res = await fetch(`/api/projects/${initial.id}/sessions`, { method: "POST" });
    const s: Session = await res.json();
    setSessions((prev) => [s, ...prev]);
    setElapsed(0);
  }

  async function stopSession() {
    if (!activeSession) return;
    const endTime = new Date().toISOString();
    const duration = Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 1000);
    const res = await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endTime, duration }),
    });
    const updated: Session = await res.json();
    setSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  async function deleteSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  // Swatch picker state
  type SwatchOption = LinkedSwatch;
  const [swatchPickerOpen, setSwatchPickerOpen] = useState(false);
  const [swatches, setSwatches]                 = useState<SwatchOption[]>([]);
  const [swatchLoading, setSwatchLoading]       = useState(false);
  const [linkedSwatch, setLinkedSwatch]         = useState<LinkedSwatch | null>(initial.gaugeSwatch ?? null);

  const [progress, setProgressState] = useState<number>(initial.progress ?? 0);
  const [currentRow, setCurrentRow] = useState<number>(initial.currentRow ?? 0);
  const [totalRows]                 = useState<string>(initial.totalRows != null ? String(initial.totalRows) : "");
  const [rowSaving, setRowSaving]   = useState(false);

  const [form, setForm] = useState({
    name:       initial.name,
    status:     initial.status,
    needleSize: initial.needleSize ?? "",
    gauge:      initial.gauge ?? "",
    size:       initial.size ?? "",
    notes:      initial.notes ?? "",
    startDate:  initial.startDate?.slice(0, 10) ?? "",
    endDate:    initial.endDate?.slice(0, 10) ?? "",
    coverImages: parseImages(initial.coverImage),
    progress:   initial.progress ?? 0,
  });

  const [journalForm, setJournalForm] = useState({
    title:   "",
    content: "",
    mood:    null as string | null,
    tags:    "",
    date:    new Date().toISOString().slice(0, 10),
    images:  [] as string[],
  });

  async function saveProject() {
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:       form.name,
        status:     form.status,
        needleSize: form.needleSize || null,
        gauge:      form.gauge || null,
        size:       form.size || null,
        notes:      form.notes || null,
        startDate:  form.startDate || null,
        endDate:    form.endDate || null,
        coverImage: form.coverImages.length ? JSON.stringify(form.coverImages) : null,
        progress:   form.progress,
      }),
    });
    const updated = await res.json();
    setProject((p) => ({ ...p, ...updated }));
    setProgressState(form.progress);
    setSaving(false);
    setEditOpen(false);
  }

  async function saveRow(row: number, total?: string) {
    setRowSaving(true);
    const tr = total !== undefined ? total : totalRows;
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentRow: row,
        totalRows: tr ? Number(tr) : null,
      }),
    });
    setRowSaving(false);
  }

  function stepRow(delta: number) {
    const next = Math.max(0, currentRow + delta);
    setCurrentRow(next);
    saveRow(next);
  }

  async function openSwatchPicker() {
    setSwatchPickerOpen(true);
    if (swatches.length === 0) {
      setSwatchLoading(true);
      const res = await fetch("/api/gauge");
      setSwatches(await res.json());
      setSwatchLoading(false);
    }
  }

  async function linkSwatch(s: LinkedSwatch) {
    setLinkedSwatch(s);
    setSwatchPickerOpen(false);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gaugeSwatchId: s.id }),
    });
  }

  async function unlinkSwatch() {
    setLinkedSwatch(null);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gaugeSwatchId: null }),
    });
  }

  function swatchYarnsLabel(s: LinkedSwatch): string {
    if (s.yarns) {
      try {
        const arr: { brand: string; name: string }[] = JSON.parse(s.yarns);
        const filled = arr.filter((y) => y.brand || y.name);
        if (filled.length) return filled.map((y) => [y.brand, y.name].filter(Boolean).join(" ")).join(" + ");
      } catch { /* fall through */ }
    }
    return [s.yarnBrand, s.yarnName].filter(Boolean).join(" ");
  }

  function openEditEntry(entry: JournalEntry) {
    setEditingEntry(entry);
    setEditEntryForm({
      title:   entry.title   ?? "",
      content: entry.content,
      mood:    entry.mood,
      tags:    entry.tags ? (JSON.parse(entry.tags) as string[]).join(", ") : "",
      date:    new Date(entry.date).toISOString().slice(0, 10),
      images:  entry.images ? JSON.parse(entry.images) : [],
    });
  }

  async function saveEditEntry() {
    if (!editingEntry || !editEntryForm.content.trim()) return;
    setEditEntrySaving(true);
    const tagsList = editEntryForm.tags ? editEntryForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    const imagesList = editEntryForm.images.length ? editEntryForm.images : null;
    const res = await fetch(`/api/journal/${editingEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:   editEntryForm.title   || null,
        content: editEntryForm.content,
        mood:    editEntryForm.mood    || null,
        tags:    tagsList,
        images:  imagesList,
        date:    editEntryForm.date,
      }),
    });
    const updated = await res.json();
    setProject((p) => ({
      ...p,
      journalEntries: p.journalEntries.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              title:   editEntryForm.title   || null,
              content: editEntryForm.content,
              mood:    editEntryForm.mood    || null,
              tags:    tagsList ? JSON.stringify(tagsList) : null,
              images:  imagesList ? JSON.stringify(imagesList) : null,
              date:    updated.date,
            }
          : e
      ),
    }));
    setEditEntrySaving(false);
    setEditingEntry(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    if (deleteTarget === "project") {
      await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      router.push("/projects");
    } else {
      await fetch(`/api/journal/${deleteTarget}`, { method: "DELETE" });
      setProject((p) => ({ ...p, journalEntries: p.journalEntries.filter((e) => e.id !== deleteTarget) }));
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  async function addJournalEntry() {
    if (!journalForm.content.trim()) return;
    setSaving(true);
    const tagsList = journalForm.tags ? journalForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    const imagesList = journalForm.images.length ? journalForm.images : null;
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:     journalForm.title || null,
        content:   journalForm.content,
        mood:      journalForm.mood || null,
        projectId: project.id,
        tags:      tagsList,
        images:    imagesList,
        date:      journalForm.date,
      }),
    });
    const entry = await res.json();
    setProject((p) => ({
      ...p,
      journalEntries: [
        {
          id: entry.id,
          date: entry.date,
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          tags: tagsList ? JSON.stringify(tagsList) : null,
          images: imagesList ? JSON.stringify(imagesList) : null,
        },
        ...p.journalEntries,
      ],
    }));
    setJournalForm({ title: "", content: "", mood: null, tags: "", date: new Date().toISOString().slice(0, 10), images: [] });
    setSaving(false);
    setJournalOpen(false);
  }


  function stashYds(y: StashYarn): number | null {
    if (y.yardage) return y.yardage;
    if (y.skeinCount && y.yardagePerSkein) return Math.round(y.skeinCount * y.yardagePerSkein);
    return null;
  }

  function selectStashYarn(y: StashYarn) {
    if (selectedYarnId === y.id) {
      setSelectedYarnId(null);
      setYarnAmount("");
    } else {
      setSelectedYarnId(y.id);
      const yds = stashYds(y);
      setYarnAmount(yds ? String(yds) : "");
    }
  }

  async function openYarnPicker() {
    setYarnPickerOpen(true);
    setYarnSearch("");
    setSelectedYarnId(null);
    setYarnAmount("");
    setMarkReserved(false);
    if (stash.length === 0) {
      setStashLoading(true);
      const res = await fetch("/api/stash");
      const data = await res.json();
      setStash(data);
      setStashLoading(false);
    }
  }

  async function addYarn() {
    if (!selectedYarnId) return;
    const res = await fetch(`/api/projects/${project.id}/yarns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yarnId: selectedYarnId,
        amount: yarnAmount ? Number(yarnAmount) : null,
      }),
    });
    const link = await res.json();
    setProject((p) => ({
      ...p,
      yarns: p.yarns.some((y) => y.yarn.id === selectedYarnId)
        ? p.yarns.map((y) => y.yarn.id === selectedYarnId ? link : y)
        : [...p.yarns, link],
    }));
    if (markReserved) {
      await fetch(`/api/stash/${selectedYarnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reserved" }),
      });
      setStash((prev) => prev.map((y) => y.id === selectedYarnId ? { ...y, status: "reserved" } : y));
    }
    setYarnPickerOpen(false);
  }

  async function saveYarnAmount(linkId: string) {
    const amount = editingAmountVal.trim() ? Number(editingAmountVal) : null;
    const res = await fetch(`/api/projects/${project.id}/yarns/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const updated = await res.json();
    setProject((p) => ({ ...p, yarns: p.yarns.map((y) => y.id === linkId ? updated : y) }));
    setEditingAmountId(null);
  }

  async function removeYarn(linkId: string) {
    await fetch(`/api/projects/${project.id}/yarns/${linkId}`, { method: "DELETE" });
    setProject((p) => ({ ...p, yarns: p.yarns.filter((y) => y.id !== linkId) }));
  }

  const status = STATUS_MAP[project.status];
  const coverImages = parseImages(project.coverImage);
  const patternCover = parseImages(project.pattern?.coverImage ?? null);
  const pdfFallback = coverImages.length === 0 && patternCover.length === 0
    ? (project.pattern?.patternFile ?? null)
    : null;
  // effective first cover: project's own, or pattern's cover
  const heroCover = coverImages[0] ?? patternCover[0] ?? null;
  const thumbs = coverImages.length > 1 ? coverImages.slice(1) : [];

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Cover image strip */}
      {(heroCover || pdfFallback) && (
        <div className="relative h-52 md:h-72 w-full overflow-hidden mb-0">
          {heroCover ? (
            <>
              <Image src={heroCover} alt={project.name} fill className="object-cover" sizes="800px" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </>
          ) : (
            <PdfThumbnail url={pdfFallback!} />
          )}
          {thumbs.length > 0 && (
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {thumbs.map((img) => (
                <div key={img} className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-white/60">
                  <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={14} /> Projects
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-3 flex-wrap mt-1">
                {status && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                    {STATUS_ICONS[project.status]} {status.label}
                  </span>
                )}
                {project.status !== "frogged" && progress > 0 && (
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget("project")} className="text-destructive hover:text-destructive">
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        </div>

        {/* Info chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {project.needleSize && (
            <div className="bg-muted/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Ruler size={11} /> Needle</p>
              <p className="font-medium text-sm">{project.needleSize}</p>
            </div>
          )}
          {project.gauge && (
            <div className="bg-muted/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Gauge</p>
              <p className="font-medium text-sm">{project.gauge}</p>
            </div>
          )}
          {project.size && (
            <div className="bg-muted/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Tag size={11} /> Size</p>
              <p className="font-medium text-sm">{project.size}</p>
            </div>
          )}
          {project.startDate && (
            <div className="bg-muted/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><CalendarDays size={11} /> Started</p>
              <p className="font-medium text-sm">{formatDate(project.startDate)}</p>
            </div>
          )}
          {project.endDate && (
            <div className="bg-muted/60 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Finished</p>
              <p className="font-medium text-sm">{formatDate(project.endDate)}</p>
            </div>
          )}
          {project.pattern && (
            <div className="bg-muted/60 rounded-xl p-3 col-span-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><BookOpen size={11} /> Pattern</p>
              <div className="flex items-center justify-between gap-2">
                <Link href="/patterns" className="font-medium text-sm underline-offset-2 hover:underline">
                  {project.pattern.name}
                </Link>
                {project.pattern.patternFile && (
                  <Link
                    href={`/patterns/${project.pattern.id}/reader`}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <FileText size={12} /> Mở PDF
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gauge Swatch + Row Counter side by side */}
        <div className={`mb-6 ${project.status !== "frogged" && project.status !== "finished" ? "grid grid-cols-2 gap-4 items-start" : ""}`}>
          {/* Gauge Swatch */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base">Gauge Swatch</h2>
              {linkedSwatch ? (
                <Button size="sm" variant="ghost" onClick={unlinkSwatch} className="gap-1.5 text-muted-foreground h-8">
                  <Link2Off size={13} /> Unlink
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={openSwatchPicker} className="gap-1.5 h-8">
                  <Link2 size={13} /> Link
                </Button>
              )}
            </div>
            {linkedSwatch ? (
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3">
                {linkedSwatch.image && (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                    <Image src={linkedSwatch.image} alt="swatch" fill className="object-cover" sizes="48px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {swatchYarnsLabel(linkedSwatch) && (
                    <p className="text-xs font-medium truncate">🧶 {swatchYarnsLabel(linkedSwatch)}</p>
                  )}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{linkedSwatch.stitchesPer10} sts/10cm</span>
                    {linkedSwatch.rowsPer10 && <span>· {linkedSwatch.rowsPer10} rows</span>}
                    {linkedSwatch.needleSize && <span>· 🪡 {linkedSwatch.needleSize}</span>}
                    {linkedSwatch.yarnWeight && <span>· {linkedSwatch.yarnWeight}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={openSwatchPicker}
                className="w-full py-5 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors flex flex-col items-center gap-1"
              >
                <Ruler size={18} />
                <span className="text-xs text-center">Link a gauge swatch</span>
              </button>
            )}
          </div>

          {/* Row Counter */}
          {project.status !== "frogged" && project.status !== "finished" && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Row Counter</h2>
                {rowSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => stepRow(-1)}
                  disabled={currentRow <= 0}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center active:scale-95"
                >
                  <Minus size={16} />
                </button>
                <div className="text-center min-w-[64px]">
                  <input
                    type="number"
                    min={0}
                    value={currentRow}
                    onChange={(e) => setCurrentRow(Math.max(0, Number(e.target.value)))}
                    onBlur={(e) => saveRow(Math.max(0, Number(e.target.value)))}
                    className="text-4xl font-bold text-primary text-center bg-transparent border-none outline-none w-full appearance-none"
                    style={{ MozAppearance: "textfield" } as React.CSSProperties}
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">row</p>
                </div>
                <button
                  onClick={() => stepRow(1)}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {project.notes && (
          <div className="bg-accent/40 rounded-xl p-4 mb-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        {/* Yarn section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-base">Yarn Used ({project.yarns.length})</h2>
              {project.yarns.some((y) => y.amount) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {project.yarns.reduce((s, y) => s + (y.amount ?? 0), 0).toLocaleString()} yds total
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={openYarnPicker} className="gap-1.5">
              <Package size={13} /> Add Yarn
            </Button>
          </div>
          {project.yarns.length === 0 ? (
            <button
              onClick={openYarnPicker}
              className="w-full py-6 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors flex flex-col items-center gap-1.5"
            >
              <Package size={20} />
              <span>Add yarn from your stash</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {project.yarns.map((yl) => (
                <div key={yl.id} className="group flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border">
                    {yl.yarn.image ? (
                      <Image src={yl.yarn.image} alt={yl.yarn.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full" style={{ backgroundColor: yl.yarn.color ?? "#e8d5b7" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{yl.yarn.brand} {yl.yarn.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {yl.yarn.colorway && (
                        <span className="flex items-center gap-1">
                          {yl.yarn.color && (
                            <span className="inline-block w-2 h-2 rounded-full border border-border" style={{ backgroundColor: yl.yarn.color }} />
                          )}
                          {yl.yarn.colorway}
                        </span>
                      )}
                      {yl.yarn.weight && <span>· {yl.yarn.weight}</span>}
                    </div>
                  </div>
                  {editingAmountId === yl.id ? (
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      value={editingAmountVal}
                      onChange={(e) => setEditingAmountVal(e.target.value)}
                      onBlur={() => saveYarnAmount(yl.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveYarnAmount(yl.id);
                        if (e.key === "Escape") setEditingAmountId(null);
                      }}
                      placeholder="yds"
                      className="w-20 text-xs border border-primary rounded-md px-2 py-1 text-right font-mono outline-none bg-background"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingAmountId(yl.id); setEditingAmountVal(yl.amount ? String(yl.amount) : ""); }}
                      className="text-xs font-medium text-muted-foreground shrink-0 hover:text-primary transition-colors px-1"
                      title="Click to edit yardage"
                    >
                      {yl.amount ? `${yl.amount.toLocaleString()} yds` : <span className="opacity-40">+ yds</span>}
                    </button>
                  )}
                  <button
                    onClick={() => removeYarn(yl.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 rounded-md hover:bg-destructive/10 text-destructive"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modifications section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScrollText size={16} className="text-muted-foreground" />
              <h2 className="font-semibold text-base">Modifications ({mods.length})</h2>
            </div>
            <Button size="sm" variant="outline" onClick={openNewMod} className="gap-1.5">
              <Plus size={13} /> Add
            </Button>
          </div>

          {mods.length === 0 ? (
            <button
              onClick={openNewMod}
              className="w-full py-6 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors flex flex-col items-center gap-1.5"
            >
              <ScrollText size={20} />
              <span>Track changes from the original pattern</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {mods.map((m) => (
                <div key={m.id} className="group flex items-start gap-3 bg-muted/40 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {m.category}
                      </span>
                      {(m.original || m.modified) && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {m.original && <span className="line-through opacity-60">{m.original}</span>}
                          {m.original && m.modified && <span className="mx-1">→</span>}
                          {m.modified && <span className="text-foreground font-medium">{m.modified}</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-snug">{m.note}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditMod(m)}>
                      <Pencil size={12} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMod(m.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timer section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-muted-foreground" />
              <h2 className="font-semibold text-base">Sessions ({sessions.filter((s) => s.endTime !== null).length})</h2>
              {totalSeconds > 0 && (
                <span className="text-xs text-muted-foreground">· {formatTotalTime(totalSeconds)} total</span>
              )}
            </div>
            <Button
              size="sm"
              variant={activeSession ? "destructive" : "outline"}
              onClick={activeSession ? stopSession : startSession}
              className="gap-1.5 min-w-[80px]"
            >
              <Timer size={13} />
              {activeSession ? "Stop" : "Start"}
            </Button>
          </div>

          {activeSession && (
            <div className="flex items-center justify-center bg-primary/5 border border-primary/20 rounded-xl py-5 mb-3">
              <div className="text-center">
                <p className="text-4xl font-mono font-bold tracking-tight text-primary tabular-nums">
                  {formatDuration(elapsed)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">session in progress</p>
              </div>
            </div>
          )}

          {sessions.filter((s) => s.endTime !== null).length === 0 && !activeSession ? (
            <button
              onClick={startSession}
              className="w-full py-6 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-colors flex flex-col items-center gap-1.5"
            >
              <Timer size={20} />
              <span>Track time spent knitting</span>
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sessions.filter((s) => s.endTime !== null).slice(0, 8).map((s) => (
                <div key={s.id} className="group flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-sm">
                  <span className="text-muted-foreground text-xs">
                    {new Date(s.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="font-mono font-medium">{formatDuration(s.duration ?? 0)}</span>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journal section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Journal ({project.journalEntries.length})</h2>
          <Button size="sm" onClick={() => setJournalOpen(true)} className="gap-1.5">
            <Plus size={14} /> Add Note
          </Button>
        </div>

        {project.journalEntries.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="text-2xl mb-2">📓</p>
            <p className="text-sm">No journal entries for this project yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {project.journalEntries.map((entry) => {
              const entryImages = parseImages(entry.images);
              return (
                <Card key={entry.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {entry.title && <p className="font-medium text-sm">{entry.title}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <CalendarDays size={11} />
                            {formatDate(entry.date)}
                          </span>
                          {entry.mood && <span>{MOODS[entry.mood] ?? entry.mood}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditEntry(entry)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entry.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    {entryImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {entryImages.map((img) => (
                          <div key={img} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                            <Image src={img} alt="" fill className="object-cover" sizes="96px" />
                          </div>
                        ))}
                      </div>
                    )}
                    {entry.tags && JSON.parse(entry.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(JSON.parse(entry.tags) as string[]).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit project dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={deleteTarget === "project" ? "Delete this project?" : "Delete journal entry?"}
        description={
          deleteTarget === "project"
            ? "Journal entries will be unlinked. This cannot be undone."
            : "This entry will be permanently deleted."
        }
        onConfirm={handleDelete}
        loading={deleting}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "planning" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{STATUS_ICONS[s.value]} {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Needle Size</Label>
                <Input placeholder="4.5mm" value={form.needleSize} onChange={(e) => setForm({ ...form, needleSize: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Gauge</Label>
                <Input placeholder="20 sts/10cm" value={form.gauge} onChange={(e) => setForm({ ...form, gauge: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Size Made</Label>
              <Input placeholder="M, 38cm..." value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Progress</Label>
              <div className="flex gap-2">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, progress: v })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.progress === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Photos (up to 4)</Label>
              <ImageUpload
                value={form.coverImages}
                onChange={(urls) => setForm({ ...form, coverImages: urls })}
                onUploadingChange={setCoverUploading}
                max={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveProject} disabled={saving || coverUploading || !form.name.trim()}>
                {coverUploading ? "Uploading..." : saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add journal note dialog */}
      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Journal Note</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input type="date" value={journalForm.date} onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Mood</Label>
                <Select value={journalForm.mood ?? ""} onValueChange={(v) => setJournalForm({ ...journalForm, mood: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Feeling?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOODS).map(([val, emoji]) => (
                      <SelectItem key={val} value={val}>{emoji} {val.charAt(0).toUpperCase() + val.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Title (optional)</Label>
              <Input placeholder="Quick title..." value={journalForm.title} onChange={(e) => setJournalForm({ ...journalForm, title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes *</Label>
              <Textarea rows={4} placeholder="Progress, modifications, thoughts..." value={journalForm.content} onChange={(e) => setJournalForm({ ...journalForm, content: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Photos</Label>
              <ImageUpload
                value={journalForm.images}
                onChange={(urls) => setJournalForm({ ...journalForm, images: urls })}
                onUploadingChange={setNoteUploading}
                max={6}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <Input placeholder="e.g. gauge, frogging" value={journalForm.tags} onChange={(e) => setJournalForm({ ...journalForm, tags: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setJournalOpen(false)}>Cancel</Button>
              <Button onClick={addJournalEntry} disabled={saving || noteUploading || !journalForm.content.trim()}>
                {noteUploading ? "Uploading..." : saving ? "Saving..." : "Add Note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit journal entry dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(o) => { if (!o) setEditingEntry(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Journal Entry</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input type="date" value={editEntryForm.date} onChange={(e) => setEditEntryForm({ ...editEntryForm, date: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Mood</Label>
                <Select value={editEntryForm.mood ?? ""} onValueChange={(v) => setEditEntryForm({ ...editEntryForm, mood: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Feeling?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOODS).map(([val, emoji]) => (
                      <SelectItem key={val} value={val}>{emoji} {val.charAt(0).toUpperCase() + val.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input placeholder="Title (optional)" value={editEntryForm.title} onChange={(e) => setEditEntryForm({ ...editEntryForm, title: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes *</Label>
              <Textarea rows={5} value={editEntryForm.content} onChange={(e) => setEditEntryForm({ ...editEntryForm, content: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Photos</Label>
              <ImageUpload value={editEntryForm.images} onChange={(urls) => setEditEntryForm({ ...editEntryForm, images: urls })} onUploadingChange={setEntryUploading} max={6} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tags (comma separated)</Label>
              <Input placeholder="e.g. gauge, modification" value={editEntryForm.tags} onChange={(e) => setEditEntryForm({ ...editEntryForm, tags: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button onClick={saveEditEntry} disabled={editEntrySaving || entryUploading || !editEntryForm.content.trim()}>
                {entryUploading ? "Uploading..." : editEntrySaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mod dialog */}
      <Dialog open={modOpen} onOpenChange={(o) => { setModOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMod ? "Edit Modification" : "Add Modification"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {MOD_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setModForm((f) => ({ ...f, category: c }))}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      modForm.category === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Original → Modified */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Original value</Label>
                <Input
                  placeholder="e.g. 110 sts"
                  value={modForm.original}
                  onChange={(e) => setModForm((f) => ({ ...f, original: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Modified to</Label>
                <Input
                  placeholder="e.g. 120 sts"
                  value={modForm.modified}
                  onChange={(e) => setModForm((f) => ({ ...f, modified: e.target.value }))}
                />
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <Label>Note *</Label>
              <Textarea
                rows={3}
                placeholder="Describe the modification…"
                value={modForm.note}
                onChange={(e) => setModForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setModOpen(false)}>Cancel</Button>
              <Button onClick={saveMod} disabled={modSaving || !modForm.note.trim()}>
                {modSaving ? "Saving…" : editingMod ? "Save Changes" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Swatch picker dialog */}
      <Dialog open={swatchPickerOpen} onOpenChange={setSwatchPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Link Gauge Swatch</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 py-1">
            {swatchLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading swatches…</p>
            ) : swatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No swatches in your library yet</p>
            ) : swatches.map((s) => {
              const label = swatchYarnsLabel(s);
              const isLinked = linkedSwatch?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => linkSwatch(s)}
                  className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors w-full ${
                    isLinked ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60 border border-border"
                  }`}
                >
                  {s.image ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                      <Image src={s.image} alt="swatch" fill className="object-cover" sizes="48px" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">📐</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.stitchesPer10} sts/10cm{s.rowsPer10 ? ` · ${s.rowsPer10} rows` : ""}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5 text-xs text-muted-foreground">
                      {label && <span>🧶 {label}</span>}
                      {s.needleSize && <span>· 🪡 {s.needleSize}</span>}
                      {s.yarnWeight && <span>· {s.yarnWeight}</span>}
                    </div>
                  </div>
                  {isLinked && <div className="shrink-0 w-4 h-4 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Yarn picker dialog */}
      <Dialog open={yarnPickerOpen} onOpenChange={setYarnPickerOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Add Yarn from Stash</DialogTitle></DialogHeader>

          {/* Search */}
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search yarn..."
              value={yarnSearch}
              onChange={(e) => setYarnSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Yarn list */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1.5 py-1">
            {stashLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading stash…</p>
            ) : stash.filter((y) => {
              const q = yarnSearch.toLowerCase();
              return !q || `${y.brand} ${y.name} ${y.colorway ?? ""}`.toLowerCase().includes(q);
            }).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No yarn found</p>
            ) : stash
              .filter((y) => {
                const q = yarnSearch.toLowerCase();
                return !q || `${y.brand} ${y.name} ${y.colorway ?? ""}`.toLowerCase().includes(q);
              })
              .map((y) => {
                const isLinked   = project.yarns.some((yl) => yl.yarn.id === y.id);
                const isSelected = selectedYarnId === y.id;
                const yds        = stashYds(y);
                return (
                  <button
                    key={y.id}
                    onClick={() => selectStashYarn(y)}
                    className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors w-full ${
                      isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted/60"
                    } ${isLinked ? "opacity-60" : ""}`}
                  >
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border">
                      {y.image ? (
                        <Image src={y.image} alt={y.name} fill className="object-cover" sizes="36px" />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: y.color ?? "#e8d5b7" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{y.brand} {y.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs text-muted-foreground truncate">
                          {[y.colorway, y.weight].filter(Boolean).join(" · ")}
                        </p>
                        {yds && <span className="text-xs font-medium text-primary shrink-0">{yds.toLocaleString()} yds</span>}
                        {isLinked && <span className="text-xs text-muted-foreground shrink-0">· added</span>}
                        {y.status === "reserved" && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">Reserved</span>}
                      </div>
                    </div>
                    {isSelected && <div className="shrink-0 w-4 h-4 rounded-full bg-primary" />}
                  </button>
                );
              })}
          </div>

          {/* Amount input + confirm */}
          {selectedYarnId && (
            <div className="shrink-0 pt-3 border-t border-border flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Yardage used (optional)"
                  value={yarnAmount}
                  onChange={(e) => setYarnAmount(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addYarn}>Add</Button>
              </div>
              {stash.find((y) => y.id === selectedYarnId)?.status !== "reserved" && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markReserved}
                    onChange={(e) => setMarkReserved(e.target.checked)}
                    className="rounded"
                  />
                  Mark as &quot;Reserved&quot; in stash
                </label>
              )}
            </div>
          )}
          {!selectedYarnId && (
            <p className="shrink-0 text-xs text-muted-foreground text-center pt-2">
              Chọn yarn ở trên để thêm vào project
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
