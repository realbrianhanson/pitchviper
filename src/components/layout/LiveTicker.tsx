import { useEffect, useState } from "react";
import { useGhlStats } from "@/hooks/useGhlStats";
import { NumberFlash } from "@/components/ui/number-flash";

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

  const items: Array<{ label: string; numeric: number; display: string; tone: string }> = [
    { label: "Calls", numeric: stats.callsToday, display: loading ? "—" : String(stats.callsToday), tone: "text-foreground" },
    { label: "Pipeline", numeric: stats.dealsInPipeline, display: loading ? "—" : String(stats.dealsInPipeline), tone: "text-foreground" },
    { label: "Won", numeric: stats.dealsWonThisWeek, display: loading ? "—" : String(stats.dealsWonThisWeek), tone: "text-primary" },
    { label: "Revenue", numeric: stats.revenueWonThisWeek, display: loading ? "—" : formatCurrency(stats.revenueWonThisWeek), tone: "text-success" },
    { label: "Streak", numeric: stats.currentStreak, display: loading ? "—" : `${stats.currentStreak}D`, tone: "text-primary" },
  ];

  // Mobile: static compact strip (no marquee).
  const mobileItems = items.slice(0, 3);

  // Duplicate for seamless marquee (desktop)
  const loop = [...items, ...items, ...items];

  return (
    <div className="relative h-7 overflow-hidden border-y border-border bg-background/95 backdrop-blur-sm">
      {/* Edge fades (desktop only) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent hidden md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent hidden md:block" />

      {/* Left label */}
      <div className="absolute inset-y-0 left-3 md:left-4 z-20 flex items-center gap-2 bg-background pr-3 md:pr-4">
        <span className="flex h-1.5 w-1.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-success">Live</span>
        <span className="hidden md:inline font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
          {clock}
        </span>
      </div>

      {/* Desktop marquee */}
      <div className="hidden md:flex items-center h-full animate-marquee whitespace-nowrap pl-48 will-change-transform">
        {loop.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">
              {item.label}
            </span>
            <NumberFlash value={item.numeric} className={`font-mono text-xs tabular-nums ${item.tone}`}>
              {item.display}
            </NumberFlash>
            <span className="text-muted-foreground/30 ml-4">·</span>
          </div>
        ))}
      </div>

      {/* Mobile static strip */}
      <div className="md:hidden flex items-center h-full pl-20 pr-3 gap-4 overflow-hidden">
        {mobileItems.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
              {item.label}
            </span>
            <NumberFlash value={item.numeric} className={`font-mono text-[11px] tabular-nums ${item.tone}`}>
              {item.display}
            </NumberFlash>
          </div>
        ))}
      </div>
    </div>
  );
}
