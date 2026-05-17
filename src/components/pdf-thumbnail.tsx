"use client";

import { useEffect, useRef, useState } from "react";

export function PdfThumbnail({ url }: { url: string }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Lazy-trigger: only start when card is in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function render() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      try {
        const pdf  = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const vp = page.getViewport({ scale: 1 });
        canvas.width  = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        if (!cancelled) setRendered(true);
      } catch { /* silently skip on corrupt/missing PDF */ }
    }
    render();
    return () => { cancelled = true; };
  }, [visible, url]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground/30 animate-pulse">PDF</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", display: rendered ? "block" : "none" }}
      />
    </div>
  );
}
