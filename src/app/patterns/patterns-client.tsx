"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, Star, ExternalLink, BookOpen, FileText, Upload, BookMarked, FolderPlus, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { PdfThumbnail } from "@/components/pdf-thumbnail";

type Pattern = {
  id: string;
  name: string;
  designer: string | null;
  source: string | null;
  sourceUrl: string | null;
  category: string | null;
  yarnWeight: string | null;
  difficulty: string | null;
  notes: string | null;
  isFavorite: boolean;
  status: string;
  coverImage: string | null;
  patternFile: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { projects: number };
};

type FormState = {
  name: string;
  designer: string;
  source: string;
  sourceUrl: string;
  category: string;
  yarnWeight: string;
  difficulty: string;
  notes: string;
  isFavorite: boolean;
  status: string;
  coverImage: string[];
};

const emptyForm = (): FormState => ({
  name: "", designer: "", source: "", sourceUrl: "",
  category: "", yarnWeight: "", difficulty: "", notes: "",
  isFavorite: false, status: "wishlist", coverImage: [],
});

const STATUSES = [
  { value: "wishlist",    label: "Wishlist",    color: "bg-purple-100 text-purple-700" },
  { value: "queued",      label: "Queued",      color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "finished",    label: "Finished",    color: "bg-green-100 text-green-700" },
  { value: "frogged",     label: "Frogged",     color: "bg-red-100 text-red-700" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const CATEGORIES = ["Sweater", "Cardigan", "Hat", "Socks", "Shawl", "Mittens", "Cowl", "Blanket", "Accessory", "Other"];
const YARN_WEIGHTS = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky", "Super Bulky"];
const DIFFICULTIES = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

const CATEGORY_EMOJI: Record<string, string> = {
  Sweater: "🧥", Cardigan: "🥼", Hat: "🎩", Socks: "🧦",
  Shawl: "🌙", Mittens: "🧤", Cowl: "💫", Blanket: "🛏️",
  Accessory: "✨", Other: "📋",
};

function parseImage(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
  } catch { return raw.startsWith("/") ? raw : null; }
}

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

const ALL_TAB = "__all__";
const FAV_TAB = "__fav__";

export function PatternsClient({ initialPatterns }: { initialPatterns: Pattern[] }) {
  const router = useRouter();
  const [patterns, setPatterns]   = useState<Pattern[]>(initialPatterns);
  const [open, setOpen]           = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [search, setSearch]       = useState("");
  const [creatingProject, setCreatingProject] = useState<string | null>(null);
  const [deletePatternId, setDeletePatternId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  // PDF upload state (per-card, outside dialog)
  const [filterWeight,     setFilterWeight]     = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterCategory,   setFilterCategory]   = useState("");

  // PDF upload state (per-card, outside dialog)
  const [pdfUploading, setPdfUploading] = useState<string | null>(null); // patternId being uploaded
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfTargetId = useRef<string | null>(null);

  // Ravelry auto-fill state
  const [fetchingRavelry, setFetchingRavelry] = useState<string | null>(null);

  // Import state
  type ImportRow = { name: string; designer: string; sourceUrl: string; notes: string; source: string };
  const [importOpen, setImportOpen]     = useState(false);
  const [importRows, setImportRows]     = useState<ImportRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const xlsInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { value: ALL_TAB, label: "All" },
    { value: FAV_TAB, label: "⭐ Favorites" },
    ...STATUSES,
  ];

  const hasFilter = !!(filterWeight || filterDifficulty || filterCategory);

  const visible = useMemo(() => {
    let list = patterns;
    if (activeTab === FAV_TAB) list = list.filter((p) => p.isFavorite);
    else if (activeTab !== ALL_TAB) list = list.filter((p) => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.designer ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q)
      );
    }
    if (filterWeight)     list = list.filter((p) => p.yarnWeight === filterWeight);
    if (filterDifficulty) list = list.filter((p) => p.difficulty === filterDifficulty);
    if (filterCategory)   list = list.filter((p) => p.category === filterCategory);
    return list;
  }, [patterns, activeTab, search, filterWeight, filterDifficulty, filterCategory]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(p: Pattern) {
    setEditId(p.id);
    setForm({
      name:       p.name,
      designer:   p.designer    ?? "",
      source:     p.source      ?? "",
      sourceUrl:  p.sourceUrl   ?? "",
      category:   p.category    ?? "",
      yarnWeight: p.yarnWeight  ?? "",
      difficulty: p.difficulty  ?? "",
      notes:      p.notes       ?? "",
      isFavorite: p.isFavorite,
      status:     p.status,
      coverImage: parseImages(p.coverImage),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name:       form.name,
      designer:   form.designer   || null,
      source:     form.source     || null,
      sourceUrl:  form.sourceUrl  || null,
      category:   form.category   || null,
      yarnWeight: form.yarnWeight || null,
      difficulty: form.difficulty || null,
      notes:      form.notes      || null,
      isFavorite: form.isFavorite,
      status:     form.status,
      coverImage: form.coverImage.length ? JSON.stringify(form.coverImage) : null,
    };

    if (editId) {
      const res = await fetch(`/api/patterns/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setPatterns((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
    } else {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setPatterns((prev) => [{ ...created, patternFile: null }, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDeletePattern() {
    if (!deletePatternId) return;
    setDeleting(true);
    await fetch(`/api/patterns/${deletePatternId}`, { method: "DELETE" });
    setPatterns((prev) => prev.filter((p) => p.id !== deletePatternId));
    setDeletePatternId(null);
    setDeleting(false);
  }

  async function toggleFavorite(p: Pattern) {
    const res = await fetch(`/api/patterns/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !p.isFavorite }),
    });
    const updated = await res.json();
    setPatterns((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
  }

  async function createProject(p: Pattern) {
    setCreatingProject(p.id);
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        patternId: p.id,
        status: "in_progress",
        startDate: today,
      }),
    });
    const project = await res.json();
    setCreatingProject(null);
    router.push(`/projects/${project.id}`);
  }

  function triggerPdfUpload(patternId: string) {
    pdfTargetId.current = patternId;
    pdfInputRef.current?.click();
  }

  async function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = pdfTargetId.current;
    if (!file || !id) return;
    e.target.value = "";

    setPdfUploading(id);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-pdf", { method: "POST", body: fd });
    if (!res.ok) {
      alert("PDF upload failed — max 50MB, PDF only");
      setPdfUploading(null);
      return;
    }
    const { url } = await res.json();
    const patch = await fetch(`/api/patterns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternFile: url }),
    });
    const updated = await patch.json();
    setPatterns((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    setPdfUploading(null);
  }

  async function fetchRavelry(p: Pattern) {
    setFetchingRavelry(p.id);
    const res = await fetch(`/api/patterns/${p.id}/fetch-ravelry`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to fetch from Ravelry");
      setFetchingRavelry(null);
      return;
    }
    const updated = await res.json();
    setPatterns((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
    setFetchingRavelry(null);
  }

  function handleXlsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows: ImportRow[] = json.map((row) => ({
        name:      String(row["Title"] || row["name"] || "").trim(),
        designer:  String(row["Author"] || row["designer"] || "").trim(),
        sourceUrl: String(row["Ravelry link"] || row["sourceUrl"] || "").trim(),
        notes:     [row["Type"] ? `Type: ${row["Type"]}` : "", row["Notes"] || ""].filter(Boolean).join(" | "),
        source:    "Ravelry",
      })).filter((r) => r.name);
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    if (importRows.length === 0) return;
    setImportLoading(true);
    const res = await fetch("/api/patterns/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importRows),
    });
    const result = await res.json();
    setImportResult(result);
    setImportLoading(false);
    if (result.imported > 0) {
      const fresh = await fetch("/api/patterns").then((r) => r.json());
      setPatterns(fresh);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Hidden PDF file input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfSelected}
      />
      {/* Hidden XLS import input */}
      <input
        ref={xlsInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={handleXlsFile}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Patterns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{patterns.length} patterns saved</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => { setImportRows([]); setImportResult(null); setImportOpen(true); }}>
            <FileSpreadsheet size={15} /> Import
          </Button>
          <Button onClick={openNew} className="gap-1.5">
            <Plus size={15} /> Add Pattern
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Input
          placeholder="Search by name, designer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px]"
        />
        <Select value={filterWeight || undefined} onValueChange={(v) => setFilterWeight(v ?? "")}>
          <SelectTrigger className="h-10 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Weight" />
          </SelectTrigger>
          <SelectContent>
            {YARN_WEIGHTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty || undefined} onValueChange={(v) => setFilterDifficulty(v ?? "")}>
          <SelectTrigger className="h-10 w-auto min-w-[120px] text-xs">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory || undefined} onValueChange={(v) => setFilterCategory(v ?? "")}>
          <SelectTrigger className="h-10 w-auto min-w-[120px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c] ?? ""} {c}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilter && (
          <button
            onClick={() => { setFilterWeight(""); setFilterDifficulty(""); setFilterCategory(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-1 shrink-0 self-center"
          >
            Xoá filter
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-4xl mb-3">🧶</p>
          <p className="font-medium text-sm">
            {search ? "No patterns match your search" : "No patterns here yet"}
          </p>
          {!search && <p className="text-xs mt-1">Click &ldquo;Add Pattern&rdquo; to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((p) => {
            const cover = parseImage(p.coverImage);
            const status = STATUS_MAP[p.status];
            const isUploadingPdf = pdfUploading === p.id;
            const isFetchingRavelry = fetchingRavelry === p.id;
            const isRavelry = p.sourceUrl?.includes("ravelry.com");
            return (
              <div key={p.id} className="group relative rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow flex flex-col">
                {/* Cover image or PDF thumbnail or emoji placeholder */}
                <div className="relative h-40 bg-muted/40 flex items-center justify-center shrink-0">
                  {cover ? (
                    <Image src={cover} alt={p.name} fill className="object-cover" sizes="240px" unoptimized={cover.includes("ravelry")} />
                  ) : p.patternFile ? (
                    <PdfThumbnail url={p.patternFile} />
                  ) : (
                    <span className="text-4xl">
                      {p.category ? (CATEGORY_EMOJI[p.category] ?? "📋") : "🧶"}
                    </span>
                  )}
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil size={13} />
                    </Button>
                    {isRavelry && (
                      <Button
                        size="icon" variant="secondary"
                        className="h-8 w-8 text-violet-600 hover:text-violet-700"
                        title="Auto-fill info from Ravelry"
                        onClick={() => fetchRavelry(p)}
                        disabled={isFetchingRavelry}
                      >
                        {isFetchingRavelry ? (
                          <span className="animate-spin text-xs">⟳</span>
                        ) : (
                          <Sparkles size={13} />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon" variant="secondary"
                      className="h-8 w-8 text-green-600 hover:text-green-700"
                      title="Start a project from this pattern"
                      onClick={() => createProject(p)}
                      disabled={creatingProject === p.id}
                    >
                      <FolderPlus size={13} />
                    </Button>
                    <Button
                      size="icon" variant="secondary"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletePatternId(p.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                  {/* Favorite star */}
                  <button
                    onClick={() => toggleFavorite(p)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                  >
                    <Star size={14} className={p.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white"} />
                  </button>
                  {/* Project count badge */}
                  {p._count.projects > 0 && (
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <BookOpen size={10} /> {p._count.projects}
                    </div>
                  )}
                  {/* PDF indicator */}
                  {p.patternFile && (
                    <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <FileText size={10} /> PDF
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-semibold text-sm leading-tight truncate">{p.name}</p>
                  {p.designer && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">by {p.designer}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {status && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", status.color)}>
                        {status.label}
                      </span>
                    )}
                    {p.category && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                    {p.difficulty && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {p.difficulty}
                      </span>
                    )}
                  </div>
                  {p.yarnWeight && (
                    <p className="text-xs text-muted-foreground mt-1.5">🧶 {p.yarnWeight}</p>
                  )}
                  {p.sourceUrl && (
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={10} /> {p.source || "View pattern"}
                    </a>
                  )}

                  {/* PDF actions — pushed to bottom */}
                  <div className="mt-auto pt-3 flex gap-1.5">
                    {p.patternFile ? (
                      <Link
                        href={`/patterns/${p.id}/reader`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-1.5 px-2 transition-colors"
                      >
                        <BookMarked size={12} /> Open Reader
                      </Link>
                    ) : (
                      <button
                        onClick={() => triggerPdfUpload(p.id)}
                        disabled={isUploadingPdf}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-dashed border-border hover:border-amber-400 hover:text-amber-600 rounded-lg py-1.5 px-2 transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        {isUploadingPdf ? (
                          <span className="animate-pulse">Uploading…</span>
                        ) : (
                          <><Upload size={11} /> Upload PDF</>
                        )}
                      </button>
                    )}
                    {p.patternFile && (
                      <button
                        onClick={() => triggerPdfUpload(p.id)}
                        disabled={isUploadingPdf}
                        title="Replace PDF"
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border hover:border-amber-400 hover:text-amber-600 text-muted-foreground transition-colors text-xs disabled:opacity-50 shrink-0"
                      >
                        <Upload size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletePatternId}
        onOpenChange={(o) => { if (!o) setDeletePatternId(null); }}
        title="Delete this pattern?"
        description="This will permanently delete the pattern and its PDF."
        onConfirm={handleDeletePattern}
        loading={deleting}
      />

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportRows([]); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Patterns from Ravelry / XLS</DialogTitle>
          </DialogHeader>

          {importResult ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-lg">Import complete</p>
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{importResult.imported}</span> patterns added,{" "}
                <span className="font-medium text-foreground">{importResult.skipped}</span> skipped (already existed)
              </p>
              <Button onClick={() => { setImportOpen(false); setImportRows([]); setImportResult(null); }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-h-0">
              {importRows.length === 0 ? (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => xlsInputRef.current?.click()}
                >
                  <FileSpreadsheet size={36} className="text-muted-foreground" />
                  <p className="font-medium">Click to choose your Ravelry library export</p>
                  <p className="text-xs text-muted-foreground">Supports .xls and .xlsx files exported from Ravelry</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between shrink-0">
                    <p className="text-sm font-medium">
                      {importRows.length} patterns found
                    </p>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      onClick={() => { setImportRows([]); xlsInputRef.current?.click(); }}
                    >
                      Choose different file
                    </button>
                  </div>
                  <div className="overflow-auto flex-1 border border-border rounded-lg min-h-0 max-h-[40vh]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr>
                          <th className="text-left p-2 font-medium">#</th>
                          <th className="text-left p-2 font-medium">Title</th>
                          <th className="text-left p-2 font-medium">Designer</th>
                          <th className="text-left p-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-medium max-w-[200px] truncate">{r.name}</td>
                            <td className="p-2 text-muted-foreground max-w-[140px] truncate">{r.designer || "—"}</td>
                            <td className="p-2 text-muted-foreground max-w-[160px] truncate">{r.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <AlertCircle size={13} />
                    Patterns with the same name as existing ones will be skipped.
                  </div>
                  <div className="flex justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                    <Button onClick={doImport} disabled={importLoading}>
                      {importLoading ? "Importing…" : `Import ${importRows.length} patterns`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Pattern" : "Add Pattern"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Pattern Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Campside Cardigan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="designer">Designer</Label>
                <Input
                  id="designer"
                  placeholder="e.g. Tin Can Knits"
                  value={form.designer}
                  onChange={(e) => setForm({ ...form, designer: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "wishlist" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c] ?? ""} {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Yarn Weight</Label>
              <Select value={form.yarnWeight} onValueChange={(v) => setForm({ ...form, yarnWeight: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {YARN_WEIGHTS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  placeholder="e.g. Ravelry, book title"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  placeholder="https://..."
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cover Photo</Label>
              <ImageUpload
                value={form.coverImage}
                onChange={(urls) => setForm({ ...form, coverImage: urls })}
                onUploadingChange={setImgUploading}
                max={1}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Modifications, sizing notes..."
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFavorite}
                onChange={(e) => setForm({ ...form, isFavorite: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">⭐ Mark as favorite</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || imgUploading || !form.name.trim()}>
                {imgUploading ? "Uploading..." : saving ? "Saving..." : editId ? "Save Changes" : "Add Pattern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
