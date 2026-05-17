"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, CalendarDays } from "lucide-react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Project = {
  id: string;
  name: string;
  status: string;
  needleSize: string | null;
  gauge: string | null;
  size: string | null;
  notes: string | null;
  patternId: string | null;
  coverImage: string | null;
  progress: number | null;
  currentRow: number | null;
  totalRows: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  pattern: { id: string; name: string; coverImage: string | null; patternFile: string | null } | null;
};

type Props = { initialProjects: Project[] };

const STATUSES = [
  { value: "planning", label: "Planning", color: "bg-blue-100 text-blue-800" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-800" },
  { value: "finished", label: "Finished", color: "bg-green-100 text-green-800" },
  { value: "hibernating", label: "Hibernating", color: "bg-slate-100 text-slate-600" },
  { value: "frogged", label: "Frogged", color: "bg-red-100 text-red-700" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const STATUS_ICONS: Record<string, string> = {
  planning: "📋",
  in_progress: "🧶",
  finished: "✅",
  hibernating: "💤",
  frogged: "🐸",
};

const STATUS_BG: Record<string, string> = {
  planning: "#dbeafe",
  in_progress: "#fef3c7",
  finished: "#dcfce7",
  hibernating: "#f1f5f9",
  frogged: "#fee2e2",
};

type FormState = {
  name: string;
  status: string;
  needleSize: string;
  gauge: string;
  size: string;
  notes: string;
  startDate: string;
  endDate: string;
};

const emptyForm = (): FormState => ({
  name: "",
  status: "planning",
  needleSize: "",
  gauge: "",
  size: "",
  notes: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
});

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseCoverImage(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) return arr[0];
  } catch {
    if (raw.startsWith("/") || raw.startsWith("http")) return raw;
  }
  return null;
}

export function ProjectsClient({ initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "progress" | "name">("newest");
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [progressPickerId, setProgressPickerId] = useState<string | null>(null);

  async function saveProgress(id: string, val: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, progress: val } : p));
    setProgressPickerId(null);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: val }),
    });
  }

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(p: Project, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditId(p.id);
    setForm({
      name: p.name,
      status: p.status,
      needleSize: p.needleSize ?? "",
      gauge: p.gauge ?? "",
      size: p.size ?? "",
      notes: p.notes ?? "",
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      endDate: p.endDate ? p.endDate.slice(0, 10) : "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      status: form.status,
      needleSize: form.needleSize || null,
      gauge: form.gauge || null,
      size: form.size || null,
      notes: form.notes || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    if (editId) {
      const res = await fetch(`/api/projects/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
    } else {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setProjects((prev) => [{ ...created, pattern: null }, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  function startDeleteProject(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteProjectId(id);
  }

  async function handleDeleteProject() {
    if (!deleteProjectId) return;
    setDeleting(true);
    await fetch(`/api/projects/${deleteProjectId}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== deleteProjectId));
    setDeleteProjectId(null);
    setDeleting(false);
  }

  const filtered = projects
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.pattern?.name.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "oldest")   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "progress") return (b.progress ?? 0) - (a.progress ?? 0);
      if (sortBy === "name")     return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-10 w-auto min-w-[130px] text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
            <SelectItem value="progress">% tiến độ</SelectItem>
            <SelectItem value="name">Tên A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {[{ value: "all", label: "All" }, ...STATUSES].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {STATUS_ICONS[s.value] ?? ""} {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">🧶</p>
          <p className="font-medium">
            {search
              ? `No results for "${search}"`
              : filter === "all"
              ? "No projects yet"
              : `No ${STATUS_MAP[filter]?.label ?? filter} projects`}
          </p>
          {!search && filter === "all" && (
            <p className="text-sm">Click &ldquo;New Project&rdquo; to start tracking your knitting</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((project) => {
            const status = STATUS_MAP[project.status];
            const cover = parseCoverImage(project.coverImage)
                       ?? parseCoverImage(project.pattern?.coverImage ?? null);
            const pdfFallback = !cover ? (project.pattern?.patternFile ?? null) : null;
            const bg = STATUS_BG[project.status] ?? "#f5f0eb";
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block h-full">
                <div className="h-full rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card flex flex-col">
                  {/* Cover image */}
                  <div
                    className="relative w-full aspect-square"
                    style={{ backgroundColor: (cover || pdfFallback) ? undefined : bg }}
                  >
                    {cover ? (
                      <Image src={cover} alt={project.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
                    ) : pdfFallback ? (
                      <PdfThumbnail url={pdfFallback} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        {STATUS_ICONS[project.status] ?? "🧶"}
                      </div>
                    )}
                    {/* Status badge overlay */}
                    {status && (
                      <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEdit(project, e)}
                        className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => startDeleteProject(project.id, e)}
                        className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white text-destructive"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Card info */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-semibold text-sm leading-snug line-clamp-2 mb-1">{project.name}</p>
                    {project.pattern && (
                      <p className="text-xs text-muted-foreground truncate mb-1">{project.pattern.name}</p>
                    )}
                    {project.startDate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <CalendarDays size={10} />
                        {formatDate(project.startDate)}
                      </p>
                    )}
                    {project.status !== "frogged" && (
                      <div className="mt-auto pt-2 relative">
                        {project.currentRow != null && (
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Hàng {project.currentRow}
                          </p>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setProgressPickerId(progressPickerId === project.id ? null : project.id);
                          }}
                          className="w-full flex items-center gap-1.5 group/prog"
                        >
                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${project.progress ?? 0}%`,
                                backgroundColor: (project.progress ?? 0) === 100 ? "#22c55e" : "#f59e0b",
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 w-8 text-right group-hover/prog:text-primary">
                            {project.progress ?? 0}%
                          </span>
                        </button>
                        {progressPickerId === project.id && (
                          <div
                            className="absolute bottom-full mb-1 left-0 right-0 z-20 bg-popover border border-border rounded-xl shadow-lg p-2 flex flex-wrap gap-1"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            {[0, 25, 50, 75, 100].map((v) => (
                              <button
                                key={v}
                                onClick={(e) => saveProgress(project.id, v, e)}
                                className={`flex-1 min-w-[2.5rem] py-1 rounded-lg text-xs font-medium transition-colors ${
                                  (project.progress ?? 0) === v
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {v}%
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteProjectId}
        onOpenChange={(o) => { if (!o) setDeleteProjectId(null); }}
        title="Delete this project?"
        description="Journal entries linked to it will be unlinked. This cannot be undone."
        onConfirm={handleDeleteProject}
        loading={deleting}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-name">Project Name *</Label>
              <Input
                id="proj-name"
                placeholder="e.g. Winter Sweater, Cozy Socks..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v ?? "planning" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {STATUS_ICONS[s.value]} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-needle">Needle Size</Label>
                <Input
                  id="proj-needle"
                  placeholder="e.g. 4.5mm, US7"
                  value={form.needleSize}
                  onChange={(e) => setForm({ ...form, needleSize: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-gauge">Gauge</Label>
                <Input
                  id="proj-gauge"
                  placeholder="e.g. 20 sts / 10cm"
                  value={form.gauge}
                  onChange={(e) => setForm({ ...form, gauge: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-size">Size Made</Label>
              <Input
                id="proj-size"
                placeholder="e.g. M, 38cm, custom"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-start">Start Date</Label>
                <Input
                  id="proj-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-end">End Date</Label>
                <Input
                  id="proj-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-notes">Notes</Label>
              <Textarea
                id="proj-notes"
                placeholder="Modifications, yarn used, anything to remember..."
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
