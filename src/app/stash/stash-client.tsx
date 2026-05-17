"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
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
import { Plus, Pencil, Trash2, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowUpDown } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type Yarn = {
  id: string;
  brand: string;
  name: string;
  colorway: string | null;
  colorCode: string | null;
  weight: string | null;
  fiber: string | null;
  yardage: number | null;
  skeinCount: number | null;
  yardagePerSkein: number | null;
  color: string | null;
  notes: string | null;
  image: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { projectYarns: number };
};

type FormState = {
  brand: string;
  name: string;
  colorway: string;
  colorCode: string;
  weight: string;
  fiber: string;
  yardage: string;
  skeinCount: string;
  yardagePerSkein: string;
  color: string;
  notes: string;
  image: string[];
  status: string;
};

const emptyForm = (): FormState => ({
  brand: "", name: "", colorway: "", colorCode: "",
  weight: "", fiber: "", yardage: "", skeinCount: "",
  yardagePerSkein: "", color: "#d4a574", notes: "", image: [],
  status: "stash",
});

const YARN_WEIGHTS = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky", "Super Bulky"];

const STATUSES = [
  { value: "stash",    label: "In Stash",  color: "bg-green-100 text-green-700" },
  { value: "used",     label: "Used Up",   color: "bg-gray-100 text-gray-600" },
  { value: "reserved", label: "Reserved",  color: "bg-blue-100 text-blue-700" },
  { value: "gifted",   label: "Gifted",    color: "bg-pink-100 text-pink-700" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const ALL_TAB = "__all__";

const SORT_OPTIONS = [
  { value: "newest",  label: "Newest first" },
  { value: "brand",   label: "Brand A–Z" },
  { value: "weight",  label: "Weight" },
  { value: "yardage", label: "Most yardage" },
];

// Common Ravelry stash export column aliases
const COL = {
  brand:   ["Brand", "brand", "Brand Name"],
  name:    ["Yarn", "Name", "yarn", "Yarn Name", "name"],
  colorway: ["Colorway", "Colorway Name", "colorway"],
  colorCode: ["Color Number", "Colorway Number", "colorCode"],
  weight:  ["Weight", "weight", "Yarn Weight"],
  fiber:   ["Fiber", "fiber", "Fiber Content", "Content"],
  yardage: ["Yardage", "yardage", "Total Yardage"],
  skeinCount: ["Skeins", "skeinCount", "Quantity"],
  yardagePerSkein: ["Yards per Skein", "yardagePerSkein"],
  color:   ["Color Family", "color", "Color"],
  notes:   ["Notes", "notes", "Personal Notes"],
};

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k];
  return "";
}

export function StashClient({ initialYarns }: { initialYarns: Yarn[] }) {
  const [yarns, setYarns]           = useState<Yarn[]>(initialYarns);
  const [open, setOpen]             = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [activeStatus, setActiveStatus] = useState(ALL_TAB);
  const [activeWeight, setActiveWeight] = useState(ALL_TAB);
  const [search, setSearch]         = useState("");
  const [sortBy, setSortBy]         = useState("newest");
  const [deleteYarnId, setDeleteYarnId] = useState<string | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Import state
  type ImportRow = { brand: string; name: string; colorway: string; colorCode: string; weight: string; fiber: string; yardage: string; skeinCount: string; notes: string };
  const [importOpen, setImportOpen]     = useState(false);
  const [importRows, setImportRows]     = useState<ImportRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const xlsInputRef = useRef<HTMLInputElement>(null);

  const statusTabs = [
    { value: ALL_TAB, label: "All" },
    ...STATUSES,
  ];

  const weightTabs = [
    { value: ALL_TAB, label: "All weights" },
    ...YARN_WEIGHTS.map((w) => ({ value: w, label: w })),
  ];

  const visible = useMemo(() => {
    let list = yarns;
    if (activeStatus !== ALL_TAB) list = list.filter((y) => y.status === activeStatus);
    if (activeWeight !== ALL_TAB) list = list.filter((y) => y.weight === activeWeight);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((y) =>
        y.brand.toLowerCase().includes(q) ||
        y.name.toLowerCase().includes(q) ||
        (y.colorway ?? "").toLowerCase().includes(q) ||
        (y.fiber ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === "brand")   sorted.sort((a, b) => a.brand.localeCompare(b.brand));
    if (sortBy === "weight")  sorted.sort((a, b) => YARN_WEIGHTS.indexOf(a.weight ?? "") - YARN_WEIGHTS.indexOf(b.weight ?? ""));
    if (sortBy === "yardage") sorted.sort((a, b) => totalYds(b) - totalYds(a));
    return sorted;
  }, [yarns, activeStatus, activeWeight, search, sortBy]);

  function totalYds(y: Yarn): number {
    if (y.yardage) return y.yardage;
    if (y.skeinCount && y.yardagePerSkein) return y.skeinCount * y.yardagePerSkein;
    return 0;
  }

  const stats = useMemo(() => {
    const inStash = yarns.filter((y) => y.status === "stash");
    const yardage = inStash.reduce((s, y) => s + totalYds(y), 0);
    return { total: yarns.length, inStash: inStash.length, yardage };
  }, [yarns]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(y: Yarn) {
    setEditId(y.id);
    setForm({
      brand:          y.brand,
      name:           y.name,
      colorway:       y.colorway       ?? "",
      colorCode:      y.colorCode      ?? "",
      weight:         y.weight         ?? "",
      fiber:          y.fiber          ?? "",
      yardage:        y.yardage        != null ? String(y.yardage)        : "",
      skeinCount:     y.skeinCount     != null ? String(y.skeinCount)     : "",
      yardagePerSkein: y.yardagePerSkein != null ? String(y.yardagePerSkein) : "",
      color:          y.color          ?? "#d4a574",
      notes:          y.notes          ?? "",
      image:          y.image ? [y.image] : [],
      status:         y.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.brand.trim() || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      brand:          form.brand,
      name:           form.name,
      colorway:       form.colorway       || null,
      colorCode:      form.colorCode      || null,
      weight:         form.weight         || null,
      fiber:          form.fiber          || null,
      yardage:        form.yardage        || null,
      skeinCount:     form.skeinCount     || null,
      yardagePerSkein: form.yardagePerSkein || null,
      color:          form.color          || null,
      notes:          form.notes          || null,
      image:          form.image[0]       || null,
      status:         form.status,
    };

    if (editId) {
      const res = await fetch(`/api/stash/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setYarns((prev) => prev.map((y) => (y.id === editId ? updated : y)));
    } else {
      const res = await fetch("/api/stash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setYarns((prev) => [created, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDeleteYarn() {
    if (!deleteYarnId) return;
    setDeleting(true);
    await fetch(`/api/stash/${deleteYarnId}`, { method: "DELETE" });
    setYarns((prev) => prev.filter((y) => y.id !== deleteYarnId));
    setDeleteYarnId(null);
    setDeleting(false);
  }

  function yardageDisplay(y: Yarn): string {
    if (y.yardage) return `${y.yardage.toLocaleString()} yds`;
    if (y.skeinCount && y.yardagePerSkein)
      return `${y.skeinCount} × ${y.yardagePerSkein} yds`;
    if (y.skeinCount) return `${y.skeinCount} skein${y.skeinCount !== 1 ? "s" : ""}`;
    return "";
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
        brand:    pick(row, COL.brand),
        name:     pick(row, COL.name),
        colorway: pick(row, COL.colorway),
        colorCode: pick(row, COL.colorCode),
        weight:   pick(row, COL.weight),
        fiber:    pick(row, COL.fiber),
        yardage:  pick(row, COL.yardage),
        skeinCount: pick(row, COL.skeinCount),
        notes:    pick(row, COL.notes),
      })).filter((r) => r.brand || r.name);
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    if (importRows.length === 0) return;
    setImportLoading(true);
    const payload = importRows.map((r) => ({
      brand:      r.brand || "Unknown",
      name:       r.name  || r.colorway || "Unknown",
      colorway:   r.colorway  || null,
      colorCode:  r.colorCode || null,
      weight:     r.weight    || null,
      fiber:      r.fiber     || null,
      yardage:    r.yardage   ? Number(r.yardage)   : null,
      skeinCount: r.skeinCount ? Number(r.skeinCount) : null,
      notes:      r.notes     || null,
    }));
    const res = await fetch("/api/stash/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setImportResult(result);
    setImportLoading(false);
    if (result.imported > 0) {
      const fresh = await fetch("/api/stash").then((r) => r.json());
      setYarns(fresh);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      {/* Hidden XLS input */}
      <input
        ref={xlsInputRef}
        type="file"
        accept=".xls,.xlsx,.csv"
        className="hidden"
        onChange={handleXlsFile}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold">Stash</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.inStash} in stash · {stats.total} total
            {stats.yardage > 0 && ` · ${stats.yardage.toLocaleString()} yds`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => { setImportRows([]); setImportResult(null); setImportOpen(true); }}>
            <FileSpreadsheet size={15} /> Import
          </Button>
          <Button onClick={openNew} className="gap-1.5">
            <Plus size={15} /> Add Yarn
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mt-4 mb-2 scrollbar-none">
        {statusTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveStatus(t.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeStatus === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + weight filter + sort */}
      <div className="flex gap-2 mb-3 flex-wrap mt-3">
        <Input
          placeholder="Search brand, name, colorway, fiber..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px]"
        />
        <Select value={activeWeight} onValueChange={(v) => setActiveWeight(v ?? ALL_TAB)}>
          <SelectTrigger className="h-10 w-auto min-w-[110px] text-xs">
            <SelectValue placeholder="Weight" />
          </SelectTrigger>
          <SelectContent>
            {weightTabs.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "newest")}>
          <SelectTrigger className="h-10 w-auto min-w-[140px] text-xs gap-1">
            <ArrowUpDown size={12} className="shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-4xl mb-3">🧶</p>
          <p className="font-medium text-sm">
            {search || activeStatus !== ALL_TAB || activeWeight !== ALL_TAB
              ? "No yarns match your filter"
              : "Your stash is empty"}
          </p>
          {!search && activeStatus === ALL_TAB && activeWeight === ALL_TAB && (
            <p className="text-xs mt-1">Click &ldquo;Add Yarn&rdquo; to add your first skein</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((y) => {
            const yds = yardageDisplay(y);
            const statusInfo = STATUS_MAP[y.status];
            return (
              <div key={y.id} className={cn(
                "group relative rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow",
                y.status !== "stash" && "opacity-70"
              )}>
                {/* Photo or color swatch */}
                <div className="relative h-36 flex items-center justify-center overflow-hidden">
                  {y.image ? (
                    <Image src={y.image} alt={y.name} fill className="object-cover" sizes="240px" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: y.color ?? "#e8d5b7" }} />
                  )}
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => openEdit(y)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteYarnId(y.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                  {/* Weight badge */}
                  {y.weight && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {y.weight}
                    </div>
                  )}
                  {/* Status badge (only non-stash) */}
                  {y.status !== "stash" && statusInfo && (
                    <div className={cn("absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-medium", statusInfo.color)}>
                      {statusInfo.label}
                    </div>
                  )}
                  {/* Project count */}
                  {y._count.projectYarns > 0 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {y._count.projectYarns}p
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-semibold text-sm leading-tight truncate">{y.brand}</p>
                  <p className="text-xs text-muted-foreground truncate">{y.name}</p>
                  {y.colorway && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      {y.color && (
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-border shrink-0" style={{ backgroundColor: y.color }} />
                      )}
                      {y.colorway}
                    </p>
                  )}
                  {y.fiber && <p className="text-xs text-muted-foreground mt-0.5 truncate">{y.fiber}</p>}
                  {yds && <p className="text-xs font-medium mt-1.5 text-foreground">{yds}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteYarnId}
        onOpenChange={(o) => { if (!o) setDeleteYarnId(null); }}
        title="Remove from stash?"
        description="This yarn will be permanently removed."
        onConfirm={handleDeleteYarn}
        loading={deleting}
      />

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportRows([]); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Yarn Stash from XLS / CSV</DialogTitle>
          </DialogHeader>

          {importResult ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-500" />
              <p className="font-semibold text-lg">Import complete</p>
              <p className="text-muted-foreground text-sm">
                <span className="font-medium text-foreground">{importResult.imported}</span> yarns added,{" "}
                <span className="font-medium text-foreground">{importResult.skipped}</span> skipped
              </p>
              <Button onClick={() => { setImportOpen(false); setImportRows([]); setImportResult(null); }}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 min-h-0">
              {importRows.length === 0 ? (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => xlsInputRef.current?.click()}
                >
                  <FileSpreadsheet size={36} className="text-muted-foreground" />
                  <p className="font-medium">Click to choose your stash export file</p>
                  <p className="text-xs text-muted-foreground">
                    Supports Ravelry stash export (.xls, .xlsx) or any CSV with Brand / Yarn / Colorway columns
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between shrink-0">
                    <p className="text-sm font-medium">{importRows.length} yarns found</p>
                    <button className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => { setImportRows([]); xlsInputRef.current?.click(); }}>
                      Choose different file
                    </button>
                  </div>
                  <div className="overflow-auto flex-1 border border-border rounded-lg min-h-0 max-h-[40vh]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr>
                          <th className="text-left p-2 font-medium">#</th>
                          <th className="text-left p-2 font-medium">Brand</th>
                          <th className="text-left p-2 font-medium">Yarn</th>
                          <th className="text-left p-2 font-medium">Colorway</th>
                          <th className="text-left p-2 font-medium">Weight</th>
                          <th className="text-left p-2 font-medium">Yardage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((r, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-medium max-w-[100px] truncate">{r.brand || "—"}</td>
                            <td className="p-2 max-w-[120px] truncate">{r.name || "—"}</td>
                            <td className="p-2 text-muted-foreground max-w-[100px] truncate">{r.colorway || "—"}</td>
                            <td className="p-2 text-muted-foreground">{r.weight || "—"}</td>
                            <td className="p-2 text-muted-foreground">{r.yardage || (r.skeinCount ? `${r.skeinCount} sk` : "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <AlertCircle size={13} />
                    Tất cả yarn sẽ được import với status &ldquo;In Stash&rdquo;. Có thể chỉnh sửa sau.
                  </div>
                  <div className="flex justify-end gap-2 shrink-0">
                    <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                    <Button onClick={doImport} disabled={importLoading}>
                      {importLoading ? "Importing…" : `Import ${importRows.length} yarns`}
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
            <DialogTitle>{editId ? "Edit Yarn" : "Add Yarn"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="brand">Brand *</Label>
                <Input id="brand" placeholder="e.g. Drops, Malabrigo" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="yarnname">Yarn Name *</Label>
                <Input id="yarnname" placeholder="e.g. Lima, Rios" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="colorway">Colorway</Label>
                <Input id="colorway" placeholder="e.g. Navy, Teal" value={form.colorway} onChange={(e) => setForm({ ...form, colorway: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="colorCode">Color Code</Label>
                <Input id="colorCode" placeholder="e.g. 6790" value={form.colorCode} onChange={(e) => setForm({ ...form, colorCode: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Color Swatch</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent" />
                <span className="text-sm text-muted-foreground">Pick a colour to represent this yarn</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Weight</Label>
                <Select value={form.weight} onValueChange={(v) => setForm({ ...form, weight: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {YARN_WEIGHTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "stash" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fiber">Fiber</Label>
              <Input id="fiber" placeholder="e.g. 100% Merino" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} />
            </div>

            <div>
              <Label className="mb-2 block">Yardage</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Skeins</span>
                  <Input type="number" min="0" step="0.5" placeholder="2" value={form.skeinCount} onChange={(e) => setForm({ ...form, skeinCount: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Yds/skein</span>
                  <Input type="number" min="0" placeholder="220" value={form.yardagePerSkein} onChange={(e) => setForm({ ...form, yardagePerSkein: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Total yds</span>
                  <Input type="number" min="0" placeholder="440" value={form.yardage} onChange={(e) => setForm({ ...form, yardage: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Photo</Label>
              <ImageUpload value={form.image} onChange={(urls) => setForm({ ...form, image: urls })} onUploadingChange={setImgUploading} max={1} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Dye lot, where you bought it..." rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || imgUploading || !form.brand.trim() || !form.name.trim()}>
                {imgUploading ? "Uploading..." : saving ? "Saving..." : editId ? "Save Changes" : "Add Yarn"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
