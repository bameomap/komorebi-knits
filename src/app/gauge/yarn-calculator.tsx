"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ShoppingCart, Plus, Trash2, Package, X } from "lucide-react";

type Colorway = {
  id: number;
  label: string;
  yardage: string;
  skeinYards: string;
  price: string;
  stashColor?: string | null;
};

type StashYarn = {
  id: string;
  brand: string;
  name: string;
  colorway: string | null;
  color: string | null;
  weight: string | null;
  yardagePerSkein: number | null;
  status: string;
};

let nextId = 2;

const BUFFERS = [
  { label: "0%",  value: 0 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
];

export function YarnCalculator() {
  const [colorways, setColorways] = useState<Colorway[]>([
    { id: 1, label: "Main color", yardage: "", skeinYards: "", price: "" },
  ]);
  const [buffer, setBuffer]       = useState(10);
  const [sizeScale, setSizeScale] = useState("1");

  // Stash picker
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickerForId, setPickerForId]   = useState<number | null>(null);
  const [stashYarns, setStashYarns]     = useState<StashYarn[] | null>(null);
  const [stashLoading, setStashLoading] = useState(false);
  const [stashSearch, setStashSearch]   = useState("");

  async function openPicker(colorwayId: number) {
    setPickerForId(colorwayId);
    setStashSearch("");
    setPickerOpen(true);
    if (stashYarns === null) {
      setStashLoading(true);
      const data = await fetch("/api/stash").then((r) => r.json());
      setStashYarns(data);
      setStashLoading(false);
    }
  }

  function pickYarn(yarn: StashYarn) {
    if (pickerForId === null) return;
    setColorways((prev) => prev.map((c) => {
      if (c.id !== pickerForId) return c;
      const label = yarn.colorway
        ? `${yarn.brand} ${yarn.name} – ${yarn.colorway}`
        : `${yarn.brand} ${yarn.name}`;
      return {
        ...c,
        label,
        skeinYards: yarn.yardagePerSkein ? String(yarn.yardagePerSkein) : c.skeinYards,
        stashColor: yarn.color,
      };
    }));
    setPickerOpen(false);
  }

  const filteredStash = useMemo(() => {
    if (!stashYarns) return [];
    const q = stashSearch.toLowerCase().trim();
    if (!q) return stashYarns;
    return stashYarns.filter((y) =>
      y.brand.toLowerCase().includes(q) ||
      y.name.toLowerCase().includes(q) ||
      (y.colorway ?? "").toLowerCase().includes(q)
    );
  }, [stashYarns, stashSearch]);

  function updateColorway(id: number, field: keyof Colorway, value: string) {
    setColorways((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  function addColorway() {
    setColorways((prev) => [...prev, {
      id: nextId++,
      label: `Color ${prev.length + 1}`,
      yardage: "",
      skeinYards: "",
      price: "",
    }]);
  }

  function removeColorway(id: number) {
    setColorways((prev) => prev.filter((c) => c.id !== id));
  }

  const results = useMemo(() => {
    const scale = parseFloat(sizeScale) || 1;
    return colorways.map((c) => {
      const base      = parseFloat(c.yardage)    || 0;
      const perSkein  = parseFloat(c.skeinYards) || 0;
      const priceEach = parseFloat(c.price)      || 0;
      if (!base || !perSkein) return null;
      const adjusted = base * scale;
      const withBuf  = adjusted * (1 + buffer / 100);
      const skeins   = Math.ceil(withBuf / perSkein);
      const exact    = withBuf / perSkein;
      const cost     = priceEach > 0 ? skeins * priceEach : null;
      return { adjusted, withBuf, skeins, exact, cost };
    });
  }, [colorways, buffer, sizeScale]);

  const total = useMemo(() => {
    const valid = results.filter(Boolean) as NonNullable<typeof results[0]>[];
    if (!valid.length) return null;
    const totalYds  = valid.reduce((s, r) => s + r.withBuf, 0);
    const totalCost = valid.every((r) => r.cost != null)
      ? valid.reduce((s, r) => s + (r.cost ?? 0), 0)
      : null;
    return { totalYds, totalCost };
  }, [results]);

  const anyResult = results.some(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Size scale */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-1 text-sm uppercase tracking-wide text-muted-foreground">Size Adjustment</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Đan size lớn hơn/nhỏ hơn pattern? Nhập hệ số scale (mặc định 1 = đúng size pattern).
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <Input
            type="number"
            min="0.1"
            step="0.05"
            placeholder="1.0"
            value={sizeScale}
            onChange={(e) => setSizeScale(e.target.value)}
            className="w-24 text-center font-mono"
          />
          <span className="text-sm text-muted-foreground">×</span>
          <div className="flex gap-1.5 text-xs flex-wrap">
            {[
              { label: "XS (×0.85)", v: "0.85" },
              { label: "M (×1)",     v: "1" },
              { label: "XL (×1.2)",  v: "1.2" },
              { label: "2XL (×1.35)", v: "1.35" },
            ].map(({ label, v }) => (
              <button
                key={v}
                onClick={() => setSizeScale(v)}
                className={cn(
                  "px-2 py-1 rounded-md border transition-colors",
                  sizeScale === v
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Buffer */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Safety Buffer</h2>
        <div className="flex gap-2">
          {BUFFERS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBuffer(b.value)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                buffer === b.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Nên để ít nhất 10–15% để dự phòng chênh lệch gauge và dây thừa</p>
      </div>

      {/* Colorways */}
      <div className="flex flex-col gap-3">
        {colorways.map((c, i) => {
          const r = results[i];
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {c.stashColor && (
                    <span
                      className="w-4 h-4 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: c.stashColor }}
                    />
                  )}
                  <Input
                    value={c.label}
                    onChange={(e) => updateColorway(c.id, "label", e.target.value)}
                    className="h-7 text-sm font-semibold border-none shadow-none px-0 w-auto flex-1 focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openPicker(c.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-lg px-2.5 py-1.5 transition-colors"
                    title="Chọn từ stash"
                  >
                    <Package size={12} /> From stash
                  </button>
                  {colorways.length > 1 && (
                    <button onClick={() => removeColorway(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Pattern yardage (yds)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 900"
                    value={c.yardage}
                    onChange={(e) => updateColorway(c.id, "yardage", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Yardage / skein</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 200"
                    value={c.skeinYards}
                    onChange={(e) => updateColorway(c.id, "skeinYards", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Price / skein (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 12"
                    value={c.price}
                    onChange={(e) => updateColorway(c.id, "price", e.target.value)}
                  />
                </div>
              </div>

              {r && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[120px] bg-primary/5 rounded-xl p-3 text-center">
                    <p className="text-3xl font-bold text-primary">{r.skeins}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">skeins</p>
                    <p className="text-xs text-muted-foreground">({r.exact.toFixed(2)} exact)</p>
                  </div>
                  <div className="flex-1 min-w-[120px] bg-muted/60 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold">{Math.round(r.withBuf).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">yds needed</p>
                    {buffer > 0 && (
                      <p className="text-xs text-muted-foreground">incl. {buffer}% buffer</p>
                    )}
                  </div>
                  {r.cost != null && (
                    <div className="flex-1 min-w-[100px] bg-muted/60 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold">${r.cost.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">est. cost</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={addColorway}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors self-start px-1"
        >
          <Plus size={15} /> Add another color / yarn
        </button>
      </div>

      {/* Total */}
      {anyResult && colorways.length > 1 && total && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={16} className="text-primary" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-primary">Total</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-2xl font-bold">{Math.round(total.totalYds).toLocaleString()} yds</p>
              <p className="text-xs text-muted-foreground">tổng yardage cần (incl. buffer)</p>
            </div>
            {total.totalCost != null && (
              <div>
                <p className="text-2xl font-bold">${total.totalCost.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">tổng chi phí ước tính</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!anyResult && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          Nhập yardage trong pattern và yardage / skein để xem kết quả
        </div>
      )}

      {/* Stash picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setStashSearch(""); }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chọn len từ Stash</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Tìm brand, tên len, colorway..."
            value={stashSearch}
            onChange={(e) => setStashSearch(e.target.value)}
            className="shrink-0"
            autoFocus
          />

          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-1.5 pt-1">
            {stashLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Đang tải...</p>
            ) : filteredStash.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {stashSearch ? "Không tìm thấy len phù hợp" : "Stash trống — thêm len ở trang Stash trước nhé"}
              </div>
            ) : (
              filteredStash.map((y) => (
                <button
                  key={y.id}
                  onClick={() => pickYarn(y)}
                  className="flex items-center gap-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/40 p-3 text-left transition-colors w-full"
                >
                  {/* Color dot */}
                  <span
                    className="w-8 h-8 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: y.color ?? "#e8d5b7" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {y.brand} <span className="text-muted-foreground font-normal">{y.name}</span>
                    </p>
                    {y.colorway && (
                      <p className="text-xs text-muted-foreground truncate">{y.colorway}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {y.weight && (
                        <span className="text-xs text-muted-foreground">{y.weight}</span>
                      )}
                      {y.yardagePerSkein ? (
                        <span className="text-xs font-medium text-primary">{y.yardagePerSkein} yds/skein</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">no yds/skein on record</span>
                      )}
                    </div>
                  </div>
                  {!y.yardagePerSkein && (
                    <X size={14} className="text-muted-foreground shrink-0" aria-label="Không có yds/skein" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
