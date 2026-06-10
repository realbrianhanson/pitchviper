import { useEffect, useState } from "react";
import { useGhlStats } from "@/hooks/useGhlStats";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

function formatLocalClock(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LiveTicker() {
  const { stats, loading } = useGhlStats();
  const [clock, setClock] = useState(() => formatLocalClock(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(formatLocalClock(new Date()));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Only real metrics. Appts/Connect were hardcoded "—" and have been removed
  // until a real data source (ghl_activities appointment event) is wired up.
  const items = [
    { label: "Calls", value: loading ? "—" : stats.callsToday, tone: "text-foreground" },
    { label: "Pipeline", value: loading ? "—" : stats.dealsInPipeline, tone: "text-foreground" },
    { label: "Won", value: loading ? "—" : stats.dealsWonThisWeek, tone: "text-primary" },
    { label: "Revenue", value: loading ? "—" : formatCurrency(stats.revenueWonThisWeek), tone: "text-success" },
    { label: "Streak", value: loading ? "—" : `${stats.currentStreak}D`, tone: "text-primary" },
  ];

  // Duplicate for seamless marquee
  const loop = [...items, ...items, ...items];

  return (
    <div className="relative h-7 overflow-hidden border-y border-border bg-background/95 backdrop-blur-sm">
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      {/* Left label */}
      <div className="absolute inset-y-0 left-4 z-20 flex items-center gap-2 bg-background pr-4">
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-success">Live</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 hidden md:inline tabular-nums">
          {clock}
        </span>
        <span className="h-3 w-px bg-border ml-2 hidden md:block" />
      </div>

      {/* Marquee track */}
      <div className="flex items-center h-full animate-marquee whitespace-nowrap pl-24 md:pl-48 will-change-transform">
        {loop.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">
              {item.label}
            </span>
            <span className={`font-mono text-xs tabular-nums ${item.tone}`}>{item.value}</span>
            <span className="text-muted-foreground/30 ml-4">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
