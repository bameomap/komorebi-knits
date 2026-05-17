"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, X, Maximize2, Minimize2, StickyNote, Trash2, ChevronUp, ChevronDown, Highlighter } from "lucide-react";
import type { LinkedProject } from "@/app/patterns/[id]/reader/reader-page-client";

// ─── Types ────────────────────────────────────────────────────────────────────
type Note = {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
};

type Highlight = {
  id: string;
  page: number;
  x: number; // fraction of canvas width
  y: number; // fraction of canvas height
  w: number; // fraction of canvas width
  h: number; // fraction of canvas height
  color: string; // hex
};

type ReaderState = {
  page: number;
  markers: Record<number, number>;
  highlights: Highlight[];
  notes: Note[];
  rowCounter: number;
};

type Props = {
  fileUrl: string;
  patternId: string;
  initialState: ReaderState | null;
  linkedProjects: LinkedProject[];
  onClose: () => void;
};

// ─── Highlight colors ─────────────────────────────────────────────────────────
const COLORS = [
  { hex: "#fde047", bg: "rgba(253,224,71,0.38)",  border: "rgba(234,179,8,0.75)"  },
  { hex: "#86efac", bg: "rgba(134,239,172,0.38)", border: "rgba(34,197,94,0.75)"  },
  { hex: "#93c5fd", bg: "rgba(147,197,253,0.38)", border: "rgba(59,130,246,0.75)" },
  { hex: "#f9a8d4", bg: "rgba(249,168,212,0.38)", border: "rgba(236,72,153,0.75)" },
];
function colorStyle(hex: string) {
  return COLORS.find((c) => c.hex === hex) ?? COLORS[0];
}

// ─── Per-page canvas ──────────────────────────────────────────────────────────
type PageProps = {
  pdf: import("pdfjs-dist").PDFDocumentProxy;
  pageNum: number;
  scale: number;
  marker: number | undefined;
  highlights: Highlight[];
  highlightMode: boolean;
  highlightColor: string;
  notes: Note[];
  onMarkerCommit: (page: number, y: number) => void;
  onAddHighlight: (page: number, x: number, y: number, w: number, h: number) => void;
  onDeleteHighlight: (id: string) => void;
  onVisible: (page: number) => void;
  onAddNote: (page: number, x: number, y: number, text: string) => void;
  onDeleteNote: (id: string) => void;
};

function PdfPage({
  pdf, pageNum, scale, marker, highlights, highlightMode, highlightColor,
  notes, onMarkerCommit, onAddHighlight, onDeleteHighlight, onVisible, onAddNote, onDeleteNote,
}: PageProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const taskRef    = useRef<import("pdfjs-dist").RenderTask | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canvasH,  setCanvasH]  = useState(0);
  const [canvasW,  setCanvasW]  = useState(0);
  const [dragging, setDragging] = useState(false);
  const [local,    setLocal]    = useState<number | undefined>(marker);

  // Highlight drawing
  const [drawStart,   setDrawStart]   = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Note state
  const [pending,      setPending]      = useState<{ x: number; y: number } | null>(null);
  const [pendingText,  setPendingText]  = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Visibility
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(pageNum); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageNum, onVisible]);

  // Render canvas
  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; }
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const vp     = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = vp.width;
      canvas.height = vp.height;
      setCanvasH(vp.height);
      setCanvasW(vp.width);
      const ctx  = canvas.getContext("2d")!;
      const task = page.render({ canvasContext: ctx, viewport: vp, canvas });
      taskRef.current = task;
      try { await task.promise; } catch { /* cancelled */ }
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, pageNum, scale]);

  // Marker Y helper
  function getY(clientY: number): number {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect   = canvas.getBoundingClientRect();
    const LINE_H = Math.round(scale * 15);
    const minY   = (LINE_H / 2) / rect.height;
    const maxY   = 1 - (LINE_H / 2) / rect.height;
    return Math.max(minY, Math.min(maxY, (clientY - rect.top) / rect.height));
  }

  // Fraction position from any pointer event
  function getFrac(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top)  / rect.height)),
    };
  }

  // Marker mouse drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setLocal(getY(e.clientY));
    const onUp   = (e: MouseEvent) => {
      const y = getY(e.clientY);
      setLocal(y);
      onMarkerCommit(pageNum, y);
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  });

  // Marker touch drag
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: TouchEvent) => setLocal(getY(e.touches[0].clientY));
    const onEnd  = (e: TouchEvent) => {
      const y = getY(e.changedTouches[0].clientY);
      setLocal(y);
      onMarkerCommit(pageNum, y);
      setDragging(false);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend",  onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onEnd);
    };
  });

  // ── Highlight drawing handlers (on wrapper div) ───────────────────────────
  function handleWrapperMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!highlightMode) return;
    e.preventDefault();
    const pos = getFrac(e.clientX, e.clientY);
    setDrawStart(pos);
    setDrawCurrent(pos);
  }

  function handleWrapperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!highlightMode || !drawStart) return;
    setDrawCurrent(getFrac(e.clientX, e.clientY));
  }

  function handleWrapperMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!highlightMode || !drawStart) return;
    const end = getFrac(e.clientX, e.clientY);
    const x = Math.min(drawStart.x, end.x);
    const y = Math.min(drawStart.y, end.y);
    const w = Math.abs(end.x - drawStart.x);
    const h = Math.abs(end.y - drawStart.y);
    if (w > 0.005 || h > 0.003) {
      onAddHighlight(pageNum, x, y, w, h);
    }
    setDrawStart(null);
    setDrawCurrent(null);
  }

  function handleWrapperTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (!highlightMode) return;
    const t = e.touches[0];
    const pos = getFrac(t.clientX, t.clientY);
    setDrawStart(pos);
    setDrawCurrent(pos);
  }

  function handleWrapperTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!highlightMode || !drawStart) return;
    const t = e.touches[0];
    setDrawCurrent(getFrac(t.clientX, t.clientY));
  }

  function handleWrapperTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!highlightMode || !drawStart) return;
    const t = e.changedTouches[0];
    const end = getFrac(t.clientX, t.clientY);
    const x = Math.min(drawStart.x, end.x);
    const y = Math.min(drawStart.y, end.y);
    const w = Math.abs(end.x - drawStart.x);
    const h = Math.abs(end.y - drawStart.y);
    if (w > 0.005 || h > 0.003) {
      onAddHighlight(pageNum, x, y, w, h);
    }
    setDrawStart(null);
    setDrawCurrent(null);
  }

  // ── Canvas click (marker placement) ──────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (highlightMode) return;
    if (clickTimer.current) return;
    const y = getY(e.clientY);
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      setLocal(y);
      onMarkerCommit(pageNum, y);
    }, 220);
  }

  function handleCanvasDblClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (highlightMode) return;
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    const pos = getFrac(e.clientX, e.clientY);
    setPending(pos);
    setPendingText("");
    setActiveNoteId(null);
  }

  function commitPending() {
    if (pending && pendingText.trim()) {
      onAddNote(pageNum, pending.x, pending.y, pendingText.trim());
    }
    setPending(null);
    setPendingText("");
  }

  const LINE_H         = Math.round(scale * 15);
  const displayMarker  = dragging ? local : marker;
  const hasMarker      = displayMarker !== undefined;
  const highlighterTop = hasMarker && canvasH > 0 ? displayMarker! * canvasH - LINE_H / 2 : 0;

  // In-progress draw rect
  const drawRect = drawStart && drawCurrent ? {
    left:   Math.min(drawStart.x, drawCurrent.x) * canvasW,
    top:    Math.min(drawStart.y, drawCurrent.y) * canvasH,
    width:  Math.abs(drawCurrent.x - drawStart.x) * canvasW,
    height: Math.abs(drawCurrent.y - drawStart.y) * canvasH,
  } : null;

  const activeColor = colorStyle(highlightColor);

  return (
    <div ref={wrapRef} className="flex flex-col items-center mb-8">
      <div className="text-white/25 text-xs mb-2 select-none tabular-nums">— {pageNum} —</div>
      <div
        className="relative inline-block"
        style={{
          userSelect: (dragging || !!drawStart) ? "none" : undefined,
          cursor: highlightMode ? "crosshair" : undefined,
        }}
        onMouseDown={handleWrapperMouseDown}
        onMouseMove={handleWrapperMouseMove}
        onMouseUp={handleWrapperMouseUp}
        onTouchStart={handleWrapperTouchStart}
        onTouchMove={handleWrapperTouchMove}
        onTouchEnd={handleWrapperTouchEnd}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className="block shadow-2xl"
          style={{ cursor: "crosshair", pointerEvents: highlightMode ? "none" : "auto" }}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDblClick}
        />

        {/* Primary marker (yellow) */}
        {hasMarker && canvasH > 0 && (
          <div
            onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
            onTouchStart={(e) => { e.preventDefault(); setDragging(true); }}
            style={{
              position:     "absolute",
              left:         0,
              right:        0,
              top:          `${highlighterTop}px`,
              height:       `${LINE_H}px`,
              background:   "rgba(255,235,0,0.40)",
              borderTop:    "1.5px solid rgba(255,220,0,0.80)",
              borderBottom: "1.5px solid rgba(255,220,0,0.80)",
              cursor:       "ns-resize",
              zIndex:       10,
              boxShadow:    "0 0 8px 2px rgba(255,235,0,0.15)",
              pointerEvents: highlightMode ? "none" : "auto",
            }}
          />
        )}

        {/* Saved highlights */}
        {canvasH > 0 && highlights.map((hl) => {
          const cs = colorStyle(hl.color);
          return (
            <div
              key={hl.id}
              className="group"
              style={{
                position:  "absolute",
                left:      `${hl.x * canvasW}px`,
                top:       `${hl.y * canvasH}px`,
                width:     `${hl.w * canvasW}px`,
                height:    `${hl.h * canvasH}px`,
                background: cs.bg,
                border:     `1px solid ${cs.border}`,
                zIndex:     9,
                pointerEvents: highlightMode ? "none" : "auto",
                cursor:    highlightMode ? "crosshair" : "default",
              }}
            >
              {!highlightMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteHighlight(hl.id); }}
                  title="Xóa highlight"
                  style={{
                    position:   "absolute",
                    top:        "-8px",
                    right:      "-8px",
                    width:      "16px",
                    height:     "16px",
                    borderRadius: "50%",
                    background: "#1c1c1e",
                    border:     "1px solid rgba(255,255,255,0.25)",
                    display:    "none",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:     "pointer",
                    zIndex:     20,
                  }}
                  className="group-hover:!flex"
                >
                  <X size={9} style={{ color: "#f87171" }} />
                </button>
              )}
            </div>
          );
        })}

        {/* In-progress draw rect */}
        {drawRect && canvasW > 0 && (
          <div
            style={{
              position:   "absolute",
              left:       `${drawRect.left}px`,
              top:        `${drawRect.top}px`,
              width:      `${drawRect.width}px`,
              height:     `${drawRect.height}px`,
              background: activeColor.bg,
              border:     `1.5px dashed ${activeColor.border}`,
              zIndex:     15,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Existing notes */}
        {canvasH > 0 && notes.map((note) => {
          const left     = note.x * canvasW;
          const top      = note.y * canvasH;
          const isActive = activeNoteId === note.id;
          return (
            <div
              key={note.id}
              style={{ position: "absolute", left: `${left}px`, top: `${top}px`, zIndex: 20 }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setActiveNoteId(isActive ? null : note.id); }}
                title={note.text}
                style={{
                  width: "24px", height: "24px",
                  background: "#facc15", border: "1.5px solid #ca8a04", borderRadius: "4px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                  transform: "translate(-50%, -50%)", flexShrink: 0,
                }}
              >
                <StickyNote size={13} style={{ color: "#78350f" }} />
              </button>
              {isActive && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "20px", left: "0px", width: "200px",
                    background: "#fefce8", border: "1.5px solid #ca8a04", borderRadius: "8px",
                    padding: "10px 10px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", zIndex: 30,
                  }}
                >
                  <p style={{ fontSize: "12px", color: "#1c1917", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {note.text}
                  </p>
                  <button
                    onClick={() => { onDeleteNote(note.id); setActiveNoteId(null); }}
                    style={{
                      marginTop: "8px", display: "flex", alignItems: "center", gap: "4px",
                      fontSize: "11px", color: "#dc2626", cursor: "pointer",
                      background: "none", border: "none", padding: 0,
                    }}
                  >
                    <Trash2 size={11} /> Delete note
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* New note input */}
        {pending && canvasH > 0 && (
          <div
            style={{
              position: "absolute",
              left: `${pending.x * canvasW}px`,
              top:  `${pending.y * canvasH}px`,
              transform: "translate(-4px, -4px)",
              zIndex: 30,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              placeholder="Ghi chú..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitPending(); }
                if (e.key === "Escape") { setPending(null); setPendingText(""); }
              }}
              onBlur={commitPending}
              style={{
                width: "180px", minHeight: "72px",
                background: "#fefce8", border: "2px solid #ca8a04", borderRadius: "6px",
                padding: "6px 8px", fontSize: "12px", color: "#1c1917",
                resize: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", outline: "none",
              }}
            />
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", marginTop: "3px" }}>
              Enter để lưu · Esc để hủy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main reader ──────────────────────────────────────────────────────────────
export function PatternReader({ fileUrl, patternId, initialState, linkedProjects: _linkedProjects, onClose }: Props) {
  const [pdf,          setPdf]          = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [totalPages,   setTotalPages]   = useState(0);
  const [currentPage,  setCurrentPage]  = useState(initialState?.page ?? 1);
  const [scale,        setScale]        = useState(1.4);
  const [markers,      setMarkers]      = useState<Record<number, number>>(initialState?.markers ?? {});
  const [highlights,   setHighlights]   = useState<Highlight[]>(initialState?.highlights ?? []);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightColor, setHighlightColor] = useState(COLORS[0].hex);
  const [notes,        setNotes]        = useState<Note[]>(initialState?.notes ?? []);
  const [rowCounter,   setRowCounter]   = useState<number>(initialState?.rowCounter ?? 0);
  const [fullscreen,   setFullscreen]   = useState(false);

  const markersRef    = useRef(markers);
  const highlightsRef = useRef(highlights);
  const notesRef      = useRef(notes);
  const rowCounterRef = useRef(rowCounter);
  useEffect(() => { markersRef.current    = markers;    }, [markers]);
  useEffect(() => { highlightsRef.current = highlights; }, [highlights]);
  useEffect(() => { notesRef.current      = notes;      }, [notes]);
  useEffect(() => { rowCounterRef.current = rowCounter; }, [rowCounter]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      try {
        const doc = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
      } catch (e) { console.error("PDF load error", e); }
    }
    load();
    return () => { cancelled = true; };
  }, [fileUrl]);

  // Scroll to saved page
  useEffect(() => {
    if (!pdf || !initialState?.page || initialState.page <= 1) return;
    const t = setTimeout(() => {
      document.getElementById(`pdf-page-${initialState.page}`)
        ?.scrollIntoView({ behavior: "instant" });
    }, 200);
    return () => clearTimeout(t);
  }, [pdf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveState = useCallback((page: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/patterns/${patternId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          readerState: JSON.stringify({
            page,
            markers:    markersRef.current,
            highlights: highlightsRef.current,
            notes:      notesRef.current,
            rowCounter: rowCounterRef.current,
          }),
        }),
      });
    }, 600);
  }, [patternId]);

  const handleMarkerCommit = useCallback((pageNum: number, y: number) => {
    setMarkers((prev) => {
      const next = { ...prev, [pageNum]: y };
      markersRef.current = next;
      saveState(pageNum);
      return next;
    });
  }, [saveState]);

  const handleAddHighlight = useCallback((pageNum: number, x: number, y: number, w: number, h: number) => {
    const hl: Highlight = { id: crypto.randomUUID(), page: pageNum, x, y, w, h, color: highlightColor };
    setHighlights((prev) => {
      const next = [...prev, hl];
      highlightsRef.current = next;
      saveState(pageNum);
      return next;
    });
  }, [saveState, highlightColor]);

  const handleDeleteHighlight = useCallback((id: string) => {
    setHighlights((prev) => {
      const next = prev.filter((h) => h.id !== id);
      highlightsRef.current = next;
      saveState(currentPage);
      return next;
    });
  }, [saveState, currentPage]);

  const handleVisible = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
    saveState(pageNum);
  }, [saveState]);

  const handleAddNote = useCallback((page: number, x: number, y: number, text: string) => {
    const note: Note = { id: crypto.randomUUID(), page, x, y, text };
    setNotes((prev) => {
      const next = [...prev, note];
      notesRef.current = next;
      saveState(page);
      return next;
    });
  }, [saveState]);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      notesRef.current = next;
      saveState(currentPage);
      return next;
    });
  }, [saveState, currentPage]);

  const handleRowChange = useCallback((delta: number) => {
    setRowCounter((prev) => {
      const next = Math.max(0, prev + delta);
      rowCounterRef.current = next;
      saveState(currentPage);
      return next;
    });
  }, [saveState, currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (highlightMode) { setHighlightMode(false); return; }
        onClose();
      }
      if ((e.key === "+" || e.key === "=") && !e.metaKey)
        setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)));
      if (e.key === "-" && !e.metaKey)
        setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)));
      if (e.key === "h" && !e.metaKey && !e.ctrlKey)
        setHighlightMode((m) => !m);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, highlightMode]);

  const noteCount = notes.length;

  return (
    <div className={`flex flex-col bg-[#1c1c1e] ${fullscreen ? "fixed inset-0 z-50" : "h-full"}`}>
      {/* Toolbar — 1 hàng */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#111] border-b border-white/10 shrink-0">
        {/* Trang */}
        <span className="text-white/50 text-xs tabular-nums min-w-[36px]">
          {pdf ? `${currentPage}/${totalPages}` : "…"}
        </span>

        <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

        {/* Row counter */}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={() => handleRowChange(-1)} title="Hàng trước">
          <ChevronDown size={13} />
        </Button>
        <span className="text-amber-300 text-xs font-mono tabular-nums select-none whitespace-nowrap">
          <span className="hidden sm:inline">Hàng </span>{rowCounter}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={() => handleRowChange(1)} title="Hàng tiếp theo">
          <ChevronUp size={13} />
        </Button>

        <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}>
          <ZoomOut size={14} />
        </Button>
        <span className="text-white/40 text-xs min-w-[34px] text-center tabular-nums hidden sm:block">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}>
          <ZoomIn size={14} />
        </Button>

        <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />

        {/* Highlight */}
        <button
          title="Bút highlight (H)"
          onClick={() => setHighlightMode((m) => !m)}
          className={`flex items-center gap-1 h-7 px-2 rounded-md text-xs shrink-0 transition-colors ${
            highlightMode ? "bg-amber-400/20 text-amber-300" : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <Highlighter size={13} />
          <span className="hidden md:inline">{highlightMode ? "On" : "Highlight"}</span>
        </button>

        {/* Color dots */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => { setHighlightColor(c.hex); setHighlightMode(true); }}
              style={{
                width: "11px", height: "11px", borderRadius: "50%",
                background: c.hex, flexShrink: 0,
                border: highlightColor === c.hex ? "2px solid white" : "2px solid rgba(255,255,255,0.15)",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>

        <div className="flex-1" />

        {/* Note count */}
        {noteCount > 0 && (
          <span className="text-white/30 text-xs flex items-center gap-0.5 shrink-0 mr-1">
            <StickyNote size={11} style={{ color: "rgba(250,204,21,0.5)" }} /> {noteCount}
          </span>
        )}

        {/* Fullscreen + close */}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setFullscreen((f) => !f)}>
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white/50 hover:text-white hover:bg-white/10" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-auto py-6 px-4">
        {!pdf ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-white/30 text-sm animate-pulse">Đang tải PDF…</span>
          </div>
        ) : (
          Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} id={`pdf-page-${pageNum}`}>
              <PdfPage
                pdf={pdf}
                pageNum={pageNum}
                scale={scale}
                marker={markers[pageNum]}
                highlights={highlights.filter((h) => h.page === pageNum)}
                highlightMode={highlightMode}
                highlightColor={highlightColor}
                notes={notes.filter((n) => n.page === pageNum)}
                onMarkerCommit={handleMarkerCommit}
                onAddHighlight={handleAddHighlight}
                onDeleteHighlight={handleDeleteHighlight}
                onVisible={handleVisible}
                onAddNote={handleAddNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
