"use client";

import { useEffect, useState } from "react";
import { X, Download, RefreshCw, Share } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export function PwaPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint]   = useState(false);
  const [showUpdate, setShowUpdate]     = useState(false);
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Check if user dismissed before
    const key = "pwa-prompt-dismissed";
    if (sessionStorage.getItem(key)) return;

    // Android/Chrome: catch install event
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show manual hint after short delay
    if (isIos()) {
      const t = setTimeout(() => setShowIosHint(true), 2000);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", handler); };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      // If there's already a waiting worker
      if (reg.waiting) { setShowUpdate(true); return; }
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    });
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") dismiss();
  }

  function applyUpdate() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
        window.location.reload();
      }
    });
  }

  function dismiss() {
    setDismissed(true);
    setInstallEvent(null);
    setShowIosHint(false);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  }

  if (dismissed) return null;

  // Update banner — show above everything else
  if (showUpdate) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-primary text-primary-foreground rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        <RefreshCw size={18} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs opacity-80">Reload to get the latest version</p>
        </div>
        <button
          onClick={applyUpdate}
          className="shrink-0 bg-primary-foreground text-primary text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Reload
        </button>
        <button onClick={() => setShowUpdate(false)} className="shrink-0 opacity-70 hover:opacity-100">
          <X size={15} />
        </button>
      </div>
    );
  }

  // Android / Chrome install banner
  if (installEvent) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-4">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={15} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-touch-icon.png" alt="Knitify" className="w-12 h-12 rounded-2xl shadow-sm" />
          <div>
            <p className="font-semibold text-sm">Knitify</p>
            <p className="text-xs text-muted-foreground">Add to home screen</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Cài như app để dùng offline và truy cập nhanh hơn từ màn hình chính.
        </p>
        <div className="flex gap-2">
          <button
            onClick={install}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Download size={14} /> Cài đặt
          </button>
          <button
            onClick={dismiss}
            className="px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>
    );
  }

  // iOS hint
  if (showIosHint) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-4">
        <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={15} />
        </button>
        <div className="flex items-center gap-3 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-touch-icon.png" alt="Knitify" className="w-10 h-10 rounded-xl" />
          <p className="font-semibold text-sm">Thêm Knitify vào màn hình chính</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Bấm <Share size={12} className="inline mx-0.5 align-middle" /> ở thanh Safari → chọn{" "}
          <strong>Add to Home Screen</strong> → nhấn <strong>Add</strong>.
        </p>
      </div>
    );
  }

  return null;
}
