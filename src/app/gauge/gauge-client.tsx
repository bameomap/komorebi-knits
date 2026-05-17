"use client";

import { useState, useMemo } from "react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageUpload } from "@/components/image-upload";
import { Plus, Pencil, Trash2, Calculator, BookOpen, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { YarnCalculator } from "./yarn-calculator";

type YarnEntry = { brand: string; name: string };

type Swatch = {
  id: string;
  stitchesPer10: number;
  rowsPer10: number | null;
  needleSize: string | null;
  yarnBrand: string | null;
  yarnName: string | null;
  yarnWeight: string | null;
  notes: string | null;
  image: string | null;
  yarns: string | null;
  createdAt: string;
};

type FormState = {
  stitchesPer10: string;
  rowsPer10: string;
  needleSize: string;
  yarns: YarnEntry[];
  yarnWeight: string;
  notes: string;
  image: string[];
};

const emptyForm = (): FormState => ({
  stitchesPer10: "", rowsPer10: "", needleSize: "",
  yarns: [{ brand: "", name: "" }],
  yarnWeight: "", notes: "", image: [],
});

function parseYarns(s: Swatch): YarnEntry[] {
  if (s.yarns) {
    try { return JSON.parse(s.yarns); } catch { /* fall through */ }
  }
  if (s.yarnBrand || s.yarnName) return [{ brand: s.yarnBrand ?? "", name: s.yarnName ?? "" }];
  return [{ brand: "", name: "" }];
}

function yarnsLabel(yarns: YarnEntry[]): string {
  return yarns.filter((y) => y.brand || y.name)
    .map((y) => [y.brand, y.name].filter(Boolean).join(" "))
    .join(" + ");
}

const YARN_WEIGHTS = ["Lace", "Fingering", "Sport", "DK", "Worsted", "Aran", "Bulky", "Super Bulky"];

const NEEDLE_SIZES = [
  "1.5mm","1.75mm","2.0mm","2.25mm","2.5mm","2.75mm","3.0mm","3.25mm","3.5mm",
  "3.75mm","4.0mm","4.5mm","5.0mm","5.5mm","6.0mm","6.5mm","7.0mm","8.0mm",
  "9.0mm","10.0mm","12.0mm","15.0mm",
];

function diff(a: number, b: number) {
  return ((a - b) / b) * 100;
}

function needleAdvice(stDiff: number): string {
  if (Math.abs(stDiff) < 2) return "Gauge matches — no adjustment needed! 🎉";
  if (stDiff > 0) return `You're knitting tighter (+${stDiff.toFixed(1)}%). Try going up 0.25–0.5mm needle size.`;
  return `You're knitting looser (${stDiff.toFixed(1)}%). Try going down 0.25–0.5mm needle size.`;
}

export function GaugeClient({ initialSwatches }: { initialSwatches: Swatch[] }) {
  const [swatches, setSwatches] = useState<Swatch[]>(initialSwatches);
  const [tab, setTab] = useState<"calc" | "library" | "yarn">("calc");

  // Swatch dialog
  const [open, setOpen]         = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Library filters
  const [filterWeight, setFilterWeight]   = useState("");
  const [filterNeedle, setFilterNeedle]   = useState("");
  const [searchLib, setSearchLib]         = useState("");

  // Calculator state
  const [patSt, setPatSt]   = useState("");
  const [patRow, setPatRow] = useState("");
  const [mySt, setMySt]     = useState("");
  const [myRow, setMyRow]   = useState("");
  const [castOn, setCastOn] = useState("");
  const [rowCount, setRowCount] = useState("");
  const [selectedSwatch, setSelectedSwatch] = useState<string>("");

  const calcResult = useMemo(() => {
    const ps = parseFloat(patSt);
    const ms = parseFloat(mySt);
    if (!ps || !ms || ps <= 0 || ms <= 0) return null;

    const stScale  = ps / ms;
    const stDiffPct = diff(ms, ps);

    const pr = parseFloat(patRow);
    const mr = parseFloat(myRow);
    const rowScale = pr && mr && mr > 0 ? pr / mr : null;

    const adjCastOn   = castOn   ? Math.round(parseFloat(castOn)   * stScale)  : null;
    const adjRowCount = rowCount ? Math.round(parseFloat(rowCount)  * (rowScale ?? stScale)) : null;

    return { stScale, stDiffPct, rowScale, adjCastOn, adjRowCount };
  }, [patSt, patRow, mySt, myRow, castOn, rowCount]);

  const needleSizes = useMemo(() =>
    [...new Set(swatches.map((s) => s.needleSize).filter(Boolean) as string[])].sort(),
  [swatches]);

  const visibleSwatches = useMemo(() => {
    let list = swatches;
    if (filterWeight) list = list.filter((s) => s.yarnWeight === filterWeight);
    if (filterNeedle) list = list.filter((s) => s.needleSize === filterNeedle);
    if (searchLib.trim()) {
      const q = searchLib.toLowerCase();
      list = list.filter((s) => {
        const yarnStr = yarnsLabel(parseYarns(s)).toLowerCase();
        return yarnStr.includes(q) || (s.notes ?? "").toLowerCase().includes(q);
      });
    }
    return list;
  }, [swatches, filterWeight, filterNeedle, searchLib]);

  const hasLibFilter = !!(filterWeight || filterNeedle || searchLib);

  function loadSwatch(id: string) {
    setSelectedSwatch(id);
    const s = swatches.find((x) => x.id === id);
    if (!s) return;
    setMySt(String(s.stitchesPer10));
    if (s.rowsPer10) setMyRow(String(s.rowsPer10));
  }

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(s: Swatch) {
    setEditId(s.id);
    setForm({
      stitchesPer10: String(s.stitchesPer10),
      rowsPer10:     s.rowsPer10 != null ? String(s.rowsPer10) : "",
      needleSize:    s.needleSize ?? "",
      yarns:         parseYarns(s),
      yarnWeight:    s.yarnWeight ?? "",
      notes:         s.notes ?? "",
      image:         s.image ? [s.image] : [],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.stitchesPer10 || imgUploading) return;
    setSaving(true);
    const filledYarns = form.yarns.filter((y) => y.brand || y.name);
    const first = filledYarns[0];
    const payload = {
      stitchesPer10: form.stitchesPer10,
      rowsPer10:     form.rowsPer10  || null,
      needleSize:    form.needleSize || null,
      yarnBrand:     first?.brand    || null,
      yarnName:      first?.name     || null,
      yarns:         filledYarns.length > 0 ? JSON.stringify(filledYarns) : null,
      yarnWeight:    form.yarnWeight || null,
      notes:         form.notes      || null,
      image:         form.image[0]   || null,
    };
    if (editId) {
      const res = await fetch(`/api/gauge/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setSwatches((prev) => prev.map((s) => (s.id === editId ? updated : s)));
    } else {
      const res = await fetch("/api/gauge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setSwatches((prev) => [created, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/gauge/${deleteId}`, { method: "DELETE" });
    setSwatches((prev) => prev.filter((s) => s.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  function swatchLabel(s: Swatch) {
    const yarnStr = yarnsLabel(parseYarns(s));
    const parts = [yarnStr || null, s.needleSize ?? null].filter(Boolean);
    return parts.length ? parts.join(" · ") : `${s.stitchesPer10} sts/10cm`;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gauge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Calculator & swatch library</p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus size={15} /> Add Swatch
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
        {([
          { id: "calc",    label: "Calculator",   icon: Calculator },
          { id: "library", label: "Swatch Library", icon: BookOpen },
          { id: "yarn",    label: "Yarn Needed",    icon: ShoppingCart },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── CALCULATOR ── */}
      {tab === "calc" && (
        <div className="flex flex-col gap-6">
          {/* Pattern gauge */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Pattern Gauge</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Stitches / 10 cm *</Label>
                <Input type="number" min="1" step="0.5" placeholder="20" value={patSt} onChange={(e) => setPatSt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rows / 10 cm</Label>
                <Input type="number" min="1" step="0.5" placeholder="28" value={patRow} onChange={(e) => setPatRow(e.target.value)} />
              </div>
            </div>
          </div>

          {/* My gauge */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">My Gauge</h2>
              {swatches.length > 0 && (
                <Select value={selectedSwatch} onValueChange={(v) => v && loadSwatch(v)}>
                  <SelectTrigger className="h-8 w-auto text-xs min-w-[160px]">
                    <SelectValue placeholder="Load from swatch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {swatches.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{swatchLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Stitches / 10 cm *</Label>
                <Input type="number" min="1" step="0.5" placeholder="22" value={mySt} onChange={(e) => setMySt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rows / 10 cm</Label>
                <Input type="number" min="1" step="0.5" placeholder="30" value={myRow} onChange={(e) => setMyRow(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Optional: stitch / row counts from pattern */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-1 text-sm uppercase tracking-wide text-muted-foreground">Pattern Numbers (optional)</h2>
            <p className="text-xs text-muted-foreground mb-3">Nhập số mũi / hàng trong pattern để tính số điều chỉnh</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Cast-on stitches</Label>
                <Input type="number" min="1" placeholder="120" value={castOn} onChange={(e) => setCastOn(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Row count</Label>
                <Input type="number" min="1" placeholder="80" value={rowCount} onChange={(e) => setRowCount(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Result */}
          {calcResult ? (
            <div className={cn(
              "rounded-xl border-2 p-5 flex flex-col gap-4",
              Math.abs(calcResult.stDiffPct) < 2
                ? "border-green-400 bg-green-50"
                : "border-amber-400 bg-amber-50"
            )}>
              <h2 className="font-semibold text-base">Result</h2>

              {/* Needle advice */}
              <p className="text-sm font-medium">{needleAdvice(calcResult.stDiffPct)}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Stitch scale</p>
                  <p className="text-xl font-bold">{calcResult.stScale.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground">×</p>
                </div>
                {calcResult.rowScale && (
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Row scale</p>
                    <p className="text-xl font-bold">{calcResult.rowScale.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground">×</p>
                  </div>
                )}
                {calcResult.adjCastOn && (
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Cast on</p>
                    <p className="text-xl font-bold">{calcResult.adjCastOn}</p>
                    <p className="text-xs text-muted-foreground">stitches</p>
                  </div>
                )}
                {calcResult.adjRowCount && (
                  <div className="bg-white/70 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Row count</p>
                    <p className="text-xl font-bold">{calcResult.adjRowCount}</p>
                    <p className="text-xs text-muted-foreground">rows</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Pattern: {patSt} sts/10cm{patRow ? ` · ${patRow} rows/10cm` : ""} &nbsp;→&nbsp;
                My gauge: {mySt} sts/10cm{myRow ? ` · ${myRow} rows/10cm` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
              Nhập gauge của pattern và gauge của bạn để xem kết quả
            </div>
          )}
        </div>
      )}

      {/* ── SWATCH LIBRARY ── */}
      {tab === "library" && (
        <div>
          {swatches.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-4xl mb-3">📐</p>
              <p className="font-medium text-sm">No swatches yet</p>
              <p className="text-xs mt-1">Click &ldquo;Add Swatch&rdquo; to save your first gauge measurement</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <Input
                  placeholder="Search brand, name, notes..."
                  value={searchLib}
                  onChange={(e) => setSearchLib(e.target.value)}
                  className="flex-1 min-w-[160px] h-9 text-sm"
                />
                <Select value={filterWeight || undefined} onValueChange={(v) => setFilterWeight(v ?? "")}>
                  <SelectTrigger className="h-9 w-auto min-w-[110px] text-xs">
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {YARN_WEIGHTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                {needleSizes.length > 0 && (
                  <Select value={filterNeedle || undefined} onValueChange={(v) => setFilterNeedle(v ?? "")}>
                    <SelectTrigger className="h-9 w-auto min-w-[100px] text-xs">
                      <SelectValue placeholder="Needle" />
                    </SelectTrigger>
                    <SelectContent>
                      {needleSizes.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {hasLibFilter && (
                  <button
                    onClick={() => { setFilterWeight(""); setFilterNeedle(""); setSearchLib(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-center px-1 shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>

              {visibleSwatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No swatches match your filter</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleSwatches.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-card flex items-stretch overflow-hidden group">
                      {/* Photo */}
                      {s.image && (
                        <div className="relative w-24 shrink-0">
                          <Image src={s.image} alt="swatch" fill className="object-cover" sizes="96px" />
                        </div>
                      )}
                      <div className="flex-1 p-4 flex items-start justify-between gap-3 min-w-0">
                        <div className="flex-1 min-w-0">
                          {/* Yarn name + tags */}
                          {(() => {
                            const parsedYarns = parseYarns(s).filter((y) => y.brand || y.name);
                            return (
                              <div className="flex flex-wrap gap-1.5 text-xs mb-2">
                                {parsedYarns.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium truncate max-w-[220px]">
                                    🧶 {yarnsLabel(parsedYarns)}
                                  </span>
                                )}
                                {parsedYarns.length > 1 && (
                                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    {parsedYarns.length} strands
                                  </span>
                                )}
                                {s.yarnWeight && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {s.yarnWeight}
                                  </span>
                                )}
                                {s.needleSize && (
                                  <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    🪡 {s.needleSize}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          {/* Gauge numbers */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-2xl font-bold text-primary">{s.stitchesPer10}</span>
                            <span className="text-sm text-muted-foreground">sts / 10cm</span>
                            {s.rowsPer10 && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-2xl font-bold">{s.rowsPer10}</span>
                                <span className="text-sm text-muted-foreground">rows / 10cm</span>
                              </>
                            )}
                          </div>
                          {s.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.notes}</p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8"
                            title="Load into calculator"
                            onClick={() => { loadSwatch(s.id); setTab("calc"); }}
                          >
                            <Calculator size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                            <Pencil size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── YARN NEEDED ── */}
      {tab === "yarn" && <YarnCalculator />}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Delete this swatch?"
        description="This gauge record will be permanently removed."
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Swatch" : "Add Gauge Swatch"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Stitches / 10 cm *</Label>
                <Input type="number" min="1" step="0.5" placeholder="20" value={form.stitchesPer10} onChange={(e) => setForm({ ...form, stitchesPer10: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rows / 10 cm</Label>
                <Input type="number" min="1" step="0.5" placeholder="28" value={form.rowsPer10} onChange={(e) => setForm({ ...form, rowsPer10: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Needle Size</Label>
              <Select value={form.needleSize} onValueChange={(v) => setForm({ ...form, needleSize: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {NEEDLE_SIZES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Yarn{form.yarns.length > 1 ? "s" : ""}</Label>
                <span className="text-xs text-muted-foreground">
                  {form.yarns.length > 1 ? `${form.yarns.length} strands held together` : ""}
                </span>
              </div>
              {form.yarns.map((y, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Brand (e.g. Drops)"
                    value={y.brand}
                    onChange={(e) => {
                      const next = form.yarns.map((entry, idx) => idx === i ? { ...entry, brand: e.target.value } : entry);
                      setForm({ ...form, yarns: next });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Name (e.g. Lima)"
                    value={y.name}
                    onChange={(e) => {
                      const next = form.yarns.map((entry, idx) => idx === i ? { ...entry, name: e.target.value } : entry);
                      setForm({ ...form, yarns: next });
                    }}
                    className="flex-1"
                  />
                  {form.yarns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, yarns: form.yarns.filter((_, idx) => idx !== i) })}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, yarns: [...form.yarns, { brand: "", name: "" }] })}
                className="text-xs text-primary hover:underline self-start mt-0.5"
              >
                + Add yarn (held together)
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Yarn Weight</Label>
              <Select value={form.yarnWeight} onValueChange={(v) => setForm({ ...form, yarnWeight: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {YARN_WEIGHTS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Washed? Blocked? Needle type…" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Photo</Label>
              <ImageUpload
                value={form.image}
                onChange={(urls) => setForm({ ...form, image: urls })}
                onUploadingChange={setImgUploading}
                max={1}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || imgUploading || !form.stitchesPer10}>
                {imgUploading ? "Uploading…" : saving ? "Saving…" : editId ? "Save Changes" : "Add Swatch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
