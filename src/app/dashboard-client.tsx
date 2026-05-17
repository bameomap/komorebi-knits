"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Layers, FolderKanban, Package, ArrowRight, CalendarDays, Sparkles, Scissors, Ruler } from "lucide-react";
import { PdfThumbnail } from "@/components/pdf-thumbnail";

type ActiveProject = {
  id: string;
  name: string;
  status: string;
  coverImage: string | null;
  startDate: string | null;
  progress: number | null;
  currentRow: number | null;
  totalRows: number | null;
  pattern: { name: string; coverImage: string | null; patternFile: string | null } | null;
};

type RecentEntry = {
  id: string;
  title: string | null;
  date: string;
  mood: string | null;
  content: string | null;
  project: { id: string; name: string } | null;
};

type WishlistPattern = {
  id: string;
  name: string;
  designer: string | null;
  coverImage: string | null;
  patternFile: string | null;
  difficulty: string | null;
  yarnWeight: string | null;
};

type RecentSwatch = {
  id: string;
  stitchesPer10: number;
  rowsPer10: number | null;
  needleSize: string | null;
  yarnBrand: string | null;
  yarnName: string | null;
  yarnWeight: string | null;
  image: string | null;
  yarns: string | null;
};

type Stats = {
  projects: number;
  inProgress: number;
  finished: number;
  patterns: number;
  yarns: number;
  journalEntries: number;
  totalYardage: number;
  needles: number;
};

type Props = {
  stats: Stats;
  activeProjects: ActiveProject[];
  recentEntries: RecentEntry[];
  wishlistPatterns: WishlistPattern[];
  recentSwatches: RecentSwatch[];
};

const STATUS_ICONS: Record<string, string> = {
  planning: "📋", in_progress: "🧶", finished: "✅", hibernating: "💤", frogged: "🐸",
};
const STATUS_LABELS: Record<string, string> = {
  planning: "Planning", in_progress: "In Progress", finished: "Finished",
  hibernating: "Hibernating", frogged: "Frogged",
};
const STATUS_COLOR: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  finished: "bg-green-100 text-green-800",
  hibernating: "bg-slate-100 text-slate-600",
  frogged: "bg-red-100 text-red-700",
};
const STATUS_BG: Record<string, string> = {
  planning: "#dbeafe", in_progress: "#fef3c7", finished: "#dcfce7",
  hibernating: "#f1f5f9", frogged: "#fee2e2",
};
const MOODS: Record<string, string> = {
  happy: "😊", proud: "🥰", focused: "🎯", frustrated: "😤",
  tired: "😴", motivated: "💪", excited: "🤩",
};

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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function yarnsLabel(yarns: string | null, brand: string | null, name: string | null): string {
  if (yarns) {
    try {
      const arr: { brand: string; name: string }[] = JSON.parse(yarns);
      const filled = arr.filter((y) => y.brand || y.name);
      if (filled.length) return filled.map((y) => [y.brand, y.name].filter(Boolean).join(" ")).join(" + ");
    } catch { /* fall through */ }
  }
  return [brand, name].filter(Boolean).join(" ");
}

export function DashboardClient({ stats, activeProjects, recentEntries, wishlistPatterns, recentSwatches }: Props) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{greeting()} 🧶</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {stats.inProgress > 0
            ? `${stats.inProgress} project đang đan · ${stats.finished} đã hoàn thành`
            : "Here's what's happening with your knitting"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        <Link href="/projects" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
              <FolderKanban size={16} className="text-amber-700" />
            </div>
            <p className="text-2xl font-bold">{stats.projects}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Projects</p>
            {stats.inProgress > 0 && (
              <p className="text-xs text-amber-600 mt-1 font-medium">{stats.inProgress} đang đan</p>
            )}
          </div>
        </Link>

        <Link href="/patterns" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center mb-3">
              <Layers size={16} className="text-violet-700" />
            </div>
            <p className="text-2xl font-bold">{stats.patterns}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Patterns</p>
            {wishlistPatterns.length > 0 && (
              <p className="text-xs text-violet-600 mt-1 font-medium">{wishlistPatterns.length} wishlist</p>
            )}
          </div>
        </Link>

        <Link href="/stash" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center mb-3">
              <Package size={16} className="text-pink-700" />
            </div>
            <p className="text-2xl font-bold">{stats.yarns}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Yarn skeins</p>
            {stats.totalYardage > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">{stats.totalYardage.toLocaleString()} yds</p>
            )}
          </div>
        </Link>

        <Link href="/journal" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-3">
              <BookOpen size={16} className="text-green-700" />
            </div>
            <p className="text-2xl font-bold">{stats.journalEntries}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Journal entries</p>
          </div>
        </Link>

        <Link href="/gauge" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
              <Ruler size={16} className="text-orange-700" />
            </div>
            <p className="text-2xl font-bold">{recentSwatches.length > 0 ? recentSwatches.length : "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recent swatches</p>
          </div>
        </Link>

        <Link href="/needles" className="group">
          <div className="h-full bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Scissors size={16} className="text-slate-600" />
            </div>
            <p className="text-2xl font-bold">{stats.needles}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Needles owned</p>
          </div>
        </Link>
      </div>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Đang đan</h2>
            <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeProjects.map((p) => {
              const cover      = parseCoverImage(p.coverImage) ?? parseCoverImage(p.pattern?.coverImage ?? null);
              const pdfFallback = !cover ? (p.pattern?.patternFile ?? null) : null;
              const bg         = STATUS_BG[p.status] ?? "#f5f0eb";
              const pct        = p.progress ?? 0;
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="group block h-full">
                  <div className="h-full rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card flex flex-col">
                    {/* Cover */}
                    <div
                      className="relative w-full aspect-square shrink-0"
                      style={{ backgroundColor: (cover || pdfFallback) ? undefined : bg }}
                    >
                      {cover ? (
                        <Image src={cover} alt={p.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                      ) : pdfFallback ? (
                        <PdfThumbnail url={pdfFallback} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {STATUS_ICONS[p.status] ?? "🧶"}
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${STATUS_COLOR[p.status] ?? ""}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm leading-snug line-clamp-2">{p.name}</p>
                        {p.pattern && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.pattern.name}</p>}
                        {p.startDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <CalendarDays size={10} /> {formatDate(p.startDate)}
                          </p>
                        )}
                      </div>

                      {/* Progress bar */}
                      {p.status !== "frogged" && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {p.currentRow != null && p.totalRows
                                ? `Hàng ${p.currentRow}/${p.totalRows}`
                                : `${pct}%`}
                            </span>
                            {pct === 100 && <span className="text-xs text-green-600 font-medium">Xong ✓</span>}
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? "#22c55e" : "#f59e0b",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent swatches */}
      {recentSwatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Gauge gần đây</h2>
            <Link href="/gauge" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSwatches.map((s) => {
              const label = yarnsLabel(s.yarns, s.yarnBrand, s.yarnName);
              return (
                <Link key={s.id} href="/gauge" className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
                  {s.image && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
                      <Image src={s.image} alt="swatch" fill className="object-cover" sizes="48px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {label && <p className="text-sm font-medium truncate">🧶 {label}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs font-bold text-primary">{s.stitchesPer10} sts/10cm</span>
                      {s.rowsPer10 && <span className="text-xs text-muted-foreground">· {s.rowsPer10} rows</span>}
                      {s.needleSize && <span className="text-xs text-muted-foreground">· 🪡 {s.needleSize}</span>}
                      {s.yarnWeight && <span className="text-xs text-muted-foreground">· {s.yarnWeight}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Wishlist patterns */}
      {wishlistPatterns.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base flex items-center gap-1.5">
              <Sparkles size={15} className="text-violet-500" /> Wishlist
            </h2>
            <Link href="/patterns" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wishlistPatterns.map((pat) => {
              const cover = parseCoverImage(pat.coverImage);
              const pdf   = !cover ? pat.patternFile : null;
              return (
                <Link key={pat.id} href="/patterns" className="group block h-full">
                  <div className="h-full rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow bg-card flex flex-col">
                    <div className="relative w-full aspect-square bg-violet-50">
                      {cover ? (
                        <Image src={cover} alt={pat.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                      ) : pdf ? (
                        <PdfThumbnail url={pdf} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="font-medium text-xs leading-snug line-clamp-2">{pat.name}</p>
                      {pat.designer && <p className="text-xs text-muted-foreground truncate mt-0.5">{pat.designer}</p>}
                      {(pat.difficulty || pat.yarnWeight) && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {[pat.difficulty, pat.yarnWeight].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent journal */}
      {recentEntries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Journal gần đây</h2>
            <Link href="/journal" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id}
                href={entry.project ? `/projects/${entry.project.id}` : "/journal"}
                className="block bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.mood && MOODS[entry.mood] && (
                        <span className="text-base">{MOODS[entry.mood]}</span>
                      )}
                      <p className="font-semibold text-sm truncate">{entry.title ?? "Untitled"}</p>
                    </div>
                    {entry.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                    {entry.project && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[100px]">{entry.project.name}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {activeProjects.length === 0 && recentEntries.length === 0 && wishlistPatterns.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-4">🧶</p>
          <p className="font-medium text-lg mb-2">Welcome to Knitify!</p>
          <p className="text-sm mb-6">Start by adding a project or logging a journal entry.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/projects" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              New Project
            </Link>
            <Link href="/journal" className="px-4 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
              Open Journal
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
