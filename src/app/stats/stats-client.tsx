"use client";

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Legend,
} from "recharts";

type Props = {
  patternsByCategory: { name: string; value: number }[];
  patternsByStatus:   { name: string; value: number }[];
  projectsByStatus:   { name: string; value: number }[];
  stashByWeight:      { name: string; yardage: number }[];
  topBrands:          { brand: string; yardage: number; skeins: number }[];
  monthlyActivity:    { month: string; patterns: number; projects: number }[];
  totals: {
    patterns: number;
    projects: number;
    stashYarns: number;
    stashYardage: number;
    yardageUsed: number;
    finished: number;
  };
};

const PATTERN_STATUS_COLORS: Record<string, string> = {
  wishlist:    "#a78bfa",
  queued:      "#60a5fa",
  in_progress: "#fbbf24",
  finished:    "#34d399",
  frogged:     "#f87171",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning:    "#94a3b8",
  in_progress: "#fbbf24",
  finished:    "#34d399",
  frogged:     "#f87171",
  hibernating: "#c084fc",
};

const CAT_COLORS = [
  "#f97316","#eab308","#22c55e","#06b6d4",
  "#6366f1","#ec4899","#14b8a6","#f43f5e",
  "#84cc16","#8b5cf6",
];

const STATUS_LABELS: Record<string, string> = {
  wishlist: "Wishlist", queued: "Queued", in_progress: "In Progress",
  finished: "Finished", frogged: "Frogged", planning: "Planning",
  hibernating: "Hibernating",
};

const WEIGHT_COLOR = "#8b5e52";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-3 mt-1">{children}</h2>;
}

// Custom tooltip for recharts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{STATUS_LABELS[d.name] ?? d.name}</p>
      <p className="text-muted-foreground">{d.value.toLocaleString()} patterns</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function StatsClient({
  patternsByCategory, patternsByStatus, projectsByStatus,
  stashByWeight, topBrands, monthlyActivity, totals,
}: Props) {
  const hasPatCat  = patternsByCategory.some((d) => d.name !== "No category");
  const hasStash   = stashByWeight.length > 0 && stashByWeight.some((d) => d.yardage > 0);
  const hasMonthly = monthlyActivity.some((m) => m.patterns > 0 || m.projects > 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Statistics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your knitting activity</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Patterns" value={totals.patterns} />
        <StatCard label="Projects" value={totals.projects} sub={`${totals.finished} finished`} />
        <StatCard label="In Stash" value={totals.stashYarns} sub="skeins" />
        <StatCard label="Stash Yardage" value={totals.stashYardage > 0 ? `${totals.stashYardage.toLocaleString()}` : "—"} sub="yards" />
        <StatCard label="Yardage Used" value={totals.yardageUsed > 0 ? `${totals.yardageUsed.toLocaleString()}` : "—"} sub="yards in projects" />
        <StatCard label="Finished" value={totals.finished} sub="projects" />
      </div>

      {/* Row 1: Patterns by category + Patterns by status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>Patterns by Category</SectionTitle>
          {!hasPatCat ? (
            <EmptyChart message="Add categories to your patterns to see this chart" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={patternsByCategory.filter((d) => d.name !== "No category")}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => (percent ?? 0) > 0.04 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : ""}
                  labelLine={false}
                  fontSize={11}
                >
                  {patternsByCategory.filter((d) => d.name !== "No category").map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>Patterns by Status</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={patternsByStatus}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ percent }) => (percent ?? 0) > 0.04 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""}
                labelLine={false}
                fontSize={11}
              >
                {patternsByStatus.map((d, i) => (
                  <Cell key={i} fill={PATTERN_STATUS_COLORS[d.name] ?? CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{STATUS_LABELS[d.name as string] ?? d.name}</p>
                      <p className="text-muted-foreground">{(d.value as number).toLocaleString()} patterns</p>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) => STATUS_LABELS[value] ?? value}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Stash by weight + Projects by status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>Stash by Weight (yds)</SectionTitle>
          {!hasStash ? (
            <EmptyChart message="Add yarn weight info to see this chart" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stashByWeight} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                        <p className="font-medium">{label}</p>
                        <p style={{ color: WEIGHT_COLOR }}>{(payload[0].value as number).toLocaleString()} yds</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="yardage" fill={WEIGHT_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <SectionTitle>Projects by Status</SectionTitle>
          {projectsByStatus.length === 0 ? (
            <EmptyChart message="No projects yet" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => (percent ?? 0) > 0.06 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""}
                  labelLine={false}
                  fontSize={11}
                >
                  {projectsByStatus.map((d, i) => (
                    <Cell key={i} fill={PROJECT_STATUS_COLORS[d.name] ?? CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
                        <p className="font-medium">{STATUS_LABELS[d.name as string] ?? d.name}</p>
                        <p className="text-muted-foreground">{(d.value as number)} projects</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) => STATUS_LABELS[value] ?? value}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Top Brands */}
      <div className="rounded-xl border border-border bg-card p-4 mb-8">
        <div className="flex items-center justify-between mb-4 mt-1">
          <h2 className="text-base font-semibold">Top Brands</h2>
          <span className="text-xs text-muted-foreground">by skein count</span>
        </div>
        {topBrands.length === 0 ? (
          <EmptyChart message="Add yarns to your stash to see top brands" />
        ) : (
          <div className="flex flex-col gap-3">
            {topBrands.map((b) => {
              const maxSkeins = topBrands[0].skeins;
              const pct = maxSkeins > 0 ? (b.skeins / maxSkeins) * 100 : 0;
              return (
                <div key={b.brand}>
                  <div className="flex items-baseline justify-between mb-1 gap-2">
                    <span className="text-xs font-medium truncate">{b.brand}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {b.skeins} sk{b.yardage > 0 ? ` · ${b.yardage >= 1000 ? `${(b.yardage/1000).toFixed(1)}k` : b.yardage} yds` : ""}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: WEIGHT_COLOR }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 4: Monthly activity */}
      <div className="rounded-xl border border-border bg-card p-4 mb-8">
        <SectionTitle>Monthly Activity (last 12 months)</SectionTitle>
        {!hasMonthly ? (
          <EmptyChart message="No activity recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyActivity} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="patterns" name="Patterns" fill="#a78bfa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="projects" name="Projects" fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
