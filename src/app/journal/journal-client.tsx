"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, CalendarDays, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Project = { id: string; name: string };

type JournalEntry = {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  content: string;
  mood: string | null;
  projectId: string | null;
  images: string | null;
  tags: string | null;
  project: Project | null;
};

type Props = {
  initialEntries: JournalEntry[];
  projects: Project[];
};

const MOODS = [
  { value: "happy",      label: "😊 Happy" },
  { value: "excited",    label: "🤩 Excited" },
  { value: "proud",      label: "🥰 Proud" },
  { value: "focused",    label: "🧘 Focused" },
  { value: "motivated",  label: "🔥 Motivated" },
  { value: "frustrated", label: "😤 Frustrated" },
  { value: "tired",      label: "😴 Tired" },
];
const MOOD_LABELS: Record<string, string> = Object.fromEntries(MOODS.map((m) => [m.value, m.label]));

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
}

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

type FormState = {
  title: string;
  content: string;
  mood: string | null;
  projectId: string;
  tags: string;
  date: string;
  images: string[];
};

const emptyForm = (): FormState => ({
  title: "", content: "", mood: null, projectId: "", tags: "",
  date: new Date().toISOString().slice(0, 10), images: [],
});

const GENERAL_ID = "__general__";
const ALL_ID     = "__all__";

export function JournalClient({ initialEntries, projects }: Props) {
  const [entries, setEntries]       = useState<JournalEntry[]>(initialEntries);
  const [open, setOpen]             = useState(false);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [selectedId, setSelectedId] = useState<string>(ALL_ID);
  // mobile: show list or entries pane
  const [mobilePane, setMobilePane] = useState<"projects" | "entries">("projects");

  // Build sidebar list: All + linked projects + General bucket
  const projectsWithEntries = useMemo(() => {
    const counts: Record<string, number> = { [GENERAL_ID]: 0 };
    projects.forEach((p) => (counts[p.id] = 0));
    entries.forEach((e) => {
      const key = e.projectId ?? GENERAL_ID;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const linked = projects.map((p) => ({ id: p.id, name: p.name, count: counts[p.id] ?? 0 }));
    return [
      { id: ALL_ID, name: "All entries", count: entries.length },
      ...linked,
      { id: GENERAL_ID, name: "General", count: counts[GENERAL_ID] },
    ];
  }, [entries, projects]);

  const visibleEntries = useMemo(() => {
    if (selectedId === ALL_ID)     return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedId === GENERAL_ID) return entries.filter((e) => !e.projectId);
    return entries.filter((e) => e.projectId === selectedId);
  }, [entries, selectedId]);

  function selectProject(id: string) {
    setSelectedId(id);
    setMobilePane("entries");
  }

  function openNew() {
    setEditId(null);
    setForm({
      ...emptyForm(),
      projectId: selectedId === GENERAL_ID ? "" : selectedId,
    });
    setOpen(true);
  }

  function openEdit(entry: JournalEntry) {
    setEditId(entry.id);
    setForm({
      title:     entry.title ?? "",
      content:   entry.content,
      mood:      entry.mood,
      projectId: entry.projectId ?? "",
      tags:      entry.tags ? JSON.parse(entry.tags).join(", ") : "",
      date:      new Date(entry.date).toISOString().slice(0, 10),
      images:    parseImages(entry.images),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.content.trim()) return;
    setSaving(true);
    const tagsList   = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    const imagesList = form.images.length ? form.images : null;
    const payload = {
      title:     form.title || null,
      content:   form.content,
      mood:      form.mood || null,
      projectId: form.projectId || null,
      tags:      tagsList,
      images:    imagesList,
      date:      form.date,
    };

    if (editId) {
      const res = await fetch(`/api/journal/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => e.id === editId ? {
        ...updated,
        images: imagesList ? JSON.stringify(imagesList) : null,
        tags:   tagsList   ? JSON.stringify(tagsList)   : null,
      } : e));
    } else {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setEntries((prev) => [{
        ...created,
        images: imagesList ? JSON.stringify(imagesList) : null,
        tags:   tagsList   ? JSON.stringify(tagsList)   : null,
      }, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDeleteEntry() {
    if (!deleteEntryId) return;
    setDeleting(true);
    await fetch(`/api/journal/${deleteEntryId}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== deleteEntryId));
    setDeleteEntryId(null);
    setDeleting(false);
  }

  const selectedName = selectedId === ALL_ID ? "All entries" : projectsWithEntries.find((p) => p.id === selectedId)?.name ?? "General";

  // ── Sidebar ──────────────────────────────────────────────────
  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Journal</h1>
        <Button size="sm" onClick={openNew} className="gap-1.5 h-8">
          <Plus size={14} /> New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-0.5">
        {projectsWithEntries.map(({ id, name, count }) => (
          <button
            key={id}
            onClick={() => selectProject(id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
              selectedId === id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span className="truncate">
              {id === ALL_ID ? "📋 All entries" : id === GENERAL_ID ? "📓 General" : `🧶 ${name}`}
            </span>
            <span className={cn(
              "text-xs ml-2 shrink-0 rounded-full px-1.5 py-0.5 font-medium",
              selectedId === id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Entries pane ─────────────────────────────────────────────
  const EntriesPane = (
    <div className="flex flex-col h-full">
      {/* Mobile back + header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-border md:border-0">
        <div className="flex items-center gap-2">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobilePane("projects")}
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <div>
            <h2 className="font-semibold text-base leading-tight">
              {selectedId === ALL_ID ? "All entries" : selectedId === GENERAL_ID ? "General Notes" : selectedName}
            </h2>
            <p className="text-xs text-muted-foreground">{visibleEntries.length} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedId !== GENERAL_ID && selectedId !== ALL_ID && (
            <Link href={`/projects/${selectedId}`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                View Project <ChevronRight size={12} />
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={openNew} className="h-8 gap-1 hidden md:flex">
            <Plus size={14} /> New
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {visibleEntries.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-3">📓</p>
            <p className="font-medium text-sm">No entries here yet</p>
            <p className="text-xs mt-1">Click &ldquo;New&rdquo; to add one</p>
          </div>
        ) : (
          visibleEntries.map((entry) => {
            const entryImages = parseImages(entry.images);
            return (
              <Card key={entry.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {entry.title && (
                        <h3 className="font-semibold text-sm truncate">{entry.title}</h3>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} />
                          {formatDate(entry.date)}
                        </span>
                        {entry.mood && <span>{MOOD_LABELS[entry.mood] ?? entry.mood}</span>}
                        {selectedId === ALL_ID && entry.project && (
                          <Link
                            href={`/projects/${entry.project.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 font-medium hover:bg-amber-200 transition-colors"
                          >
                            🧶 {entry.project.name}
                          </Link>
                        )}
                        {selectedId === ALL_ID && !entry.project && (
                          <span className="inline-flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 font-medium text-muted-foreground">
                            📓 General
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteEntryId(entry.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
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
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-sidebar overflow-y-auto">
          {Sidebar}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {EntriesPane}
        </div>
      </div>

      {/* Mobile: toggle between panes */}
      <div className="md:hidden h-full">
        {mobilePane === "projects" ? Sidebar : EntriesPane}
      </div>

      <ConfirmDialog
        open={!!deleteEntryId}
        onOpenChange={(o) => { if (!o) setDeleteEntryId(null); }}
        title="Delete journal entry?"
        description="This entry will be permanently deleted."
        onConfirm={handleDeleteEntry}
        loading={deleting}
      />

      {/* New / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Mood</Label>
                <Select value={form.mood ?? ""} onValueChange={(v) => setForm({ ...form, mood: v || null })}>
                  <SelectTrigger><SelectValue placeholder="How are you feeling?" /></SelectTrigger>
                  <SelectContent>
                    {MOODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" placeholder="Give this entry a title..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">Notes *</Label>
              <Textarea id="content" placeholder="Progress, thoughts, modifications..." rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Photos</Label>
              <ImageUpload value={form.images} onChange={(urls) => setForm({ ...form, images: urls })} onUploadingChange={setImgUploading} max={6} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Link to a project..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (General)</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" placeholder="e.g. gauge, modification, frogging" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || imgUploading || !form.content.trim()}>
                {imgUploading ? "Uploading..." : saving ? "Saving..." : editId ? "Save Changes" : "Add Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
