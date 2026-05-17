"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Needle = {
  id: string;
  type: string;
  size: string;
  material: string | null;
  brand: string | null;
  length: string | null;
  quantity: number;
  notes: string | null;
  status: string;
  createdAt: string;
};

type FormState = {
  type: string;
  size: string;
  material: string;
  brand: string;
  length: string;
  quantity: string;
  notes: string;
  status: string;
};

const TYPES = [
  { value: "circular",  label: "Circular",  emoji: "🔄" },
  { value: "straight",  label: "Straight",  emoji: "📏" },
  { value: "dpn",       label: "DPN",       emoji: "🪡" },
  { value: "cable",     label: "Cable",     emoji: "🧶" },
  { value: "crochet",   label: "Crochet",   emoji: "🪝" },
];

const MATERIALS = ["Bamboo", "Metal", "Carbon fiber", "Plastic", "Wood", "Nickel-plated"];

const CIRCULAR_LENGTHS = ["40cm", "60cm", "80cm", "100cm", "120cm", "150cm"];

const NEEDLE_SIZES = [
  "1.5mm","1.75mm","2.0mm","2.25mm","2.5mm","2.75mm","3.0mm","3.25mm","3.5mm",
  "3.75mm","4.0mm","4.5mm","5.0mm","5.5mm","6.0mm","6.5mm","7.0mm","8.0mm",
  "9.0mm","10.0mm","12.0mm","15.0mm",
];

const STATUSES = [
  { value: "owned",    label: "Owned",    color: "bg-green-100 text-green-800" },
  { value: "wishlist", label: "Wishlist", color: "bg-blue-100 text-blue-800" },
  { value: "lost",     label: "Lost",     color: "bg-red-100 text-red-700" },
  { value: "lent",     label: "Lent out", color: "bg-amber-100 text-amber-800" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const TYPE_ORDER = ["circular", "straight", "dpn", "cable", "crochet"];

function emptyForm(): FormState {
  return { type: "circular", size: "", material: "", brand: "", length: "", quantity: "1", notes: "", status: "owned" };
}

function sizeSort(a: string, b: string) {
  return parseFloat(a) - parseFloat(b);
}

export function NeedlesClient({ initialNeedles }: { initialNeedles: Needle[] }) {
  const [needles, setNeedles] = useState<Needle[]>(initialNeedles);
  const [open, setOpen]       = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<FormState>(emptyForm());
  const [saving, setSaving]   = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterType, setFilterType]     = useState("");
  const [filterStatus, setFilterStatus] = useState("owned");

  const grouped = useMemo(() => {
    let list = needles;
    if (filterType)   list = list.filter((n) => n.type === filterType);
    if (filterStatus) list = list.filter((n) => n.status === filterStatus);

    const map = new Map<string, Needle[]>();
    for (const n of list) {
      if (!map.has(n.type)) map.set(n.type, []);
      map.get(n.type)!.push(n);
    }
    // sort each group by size numerically
    for (const [, arr] of map) arr.sort((a, b) => sizeSort(a.size, b.size));
    // return in TYPE_ORDER
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, items: map.get(t)! }));
  }, [needles, filterType, filterStatus]);

  const counts = useMemo(() => {
    const owned = needles.filter((n) => n.status === "owned").length;
    const wishlist = needles.filter((n) => n.status === "wishlist").length;
    return { owned, wishlist, total: needles.length };
  }, [needles]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(n: Needle) {
    setEditId(n.id);
    setForm({
      type:     n.type,
      size:     n.size,
      material: n.material  ?? "",
      brand:    n.brand     ?? "",
      length:   n.length    ?? "",
      quantity: String(n.quantity),
      notes:    n.notes     ?? "",
      status:   n.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.type || !form.size) return;
    setSaving(true);
    const payload = {
      type:     form.type,
      size:     form.size,
      material: form.material || null,
      brand:    form.brand    || null,
      length:   form.length   || null,
      quantity: Number(form.quantity) || 1,
      notes:    form.notes    || null,
      status:   form.status,
    };
    if (editId) {
      const res = await fetch(`/api/needles/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setNeedles((prev) => prev.map((n) => n.id === editId ? updated : n));
    } else {
      const res = await fetch("/api/needles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setNeedles((prev) => [created, ...prev]);
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/needles/${deleteId}`, { method: "DELETE" });
    setNeedles((prev) => prev.filter((n) => n.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  const typeInfo = (t: string) => TYPES.find((x) => x.value === t) ?? { emoji: "📌", label: t };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Needles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.owned} owned · {counts.wishlist} wishlist
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus size={15} /> Add Needle
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-6 flex-wrap mt-4">
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[{ value: "", label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filterStatus === s.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* Type filter */}
        <Select value={filterType || undefined} onValueChange={(v) => setFilterType(v ?? "")}>
          <SelectTrigger className="h-9 w-auto min-w-[120px] text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterType && (
          <button
            onClick={() => setFilterType("")}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-center px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {needles.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-4xl mb-3">🪡</p>
          <p className="font-medium text-sm">No needles yet</p>
          <p className="text-xs mt-1">Click &ldquo;Add Needle&rdquo; to start your inventory</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No needles match your filter</div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ type, items }) => {
            const info = typeInfo(type);
            return (
              <div key={type}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  {info.emoji} {info.label} <span className="font-normal">({items.length})</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {items.map((n) => {
                    const st = STATUS_MAP[n.status];
                    return (
                      <div key={n.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        {/* Size — primary info */}
                        <div className="w-16 shrink-0 text-center">
                          <p className="text-xl font-bold text-primary leading-none">{n.size}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {n.material && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.material}</span>
                            )}
                            {n.brand && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.brand}</span>
                            )}
                            {n.length && (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{n.length}</span>
                            )}
                            {n.quantity > 1 && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">×{n.quantity}</span>
                            )}
                            {n.status !== "owned" && st && (
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", st.color)}>{st.label}</span>
                            )}
                          </div>
                          {n.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.notes}</p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(n)}>
                            <Pencil size={12} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(n.id)}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title="Remove this needle?"
        description="This will permanently delete the needle from your inventory."
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Needle" : "Add Needle"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <Label>Type *</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value, length: t.value !== "circular" ? "" : form.length })}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                      form.type === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size + Length (circular only) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Size *</Label>
                <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {NEEDLE_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.type === "circular" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Cable length</Label>
                  <Select value={form.length || undefined} onValueChange={(v) => setForm({ ...form, length: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {CIRCULAR_LENGTHS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Material + Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Material</Label>
                <Select value={form.material || undefined} onValueChange={(v) => setForm({ ...form, material: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Brand</Label>
                <Input placeholder="e.g. Addi, Knit Pro" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
            </div>

            {/* Quantity + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "owned" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Condition, set name, where bought…" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.type || !form.size}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Needle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
