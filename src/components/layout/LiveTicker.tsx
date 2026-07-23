import { useGhlStats } from "@/hooks/useGhlStats";
import { NumberFlash } from "@/components/ui/number-flash";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export function LiveTicker() {
  const { stats, loading } = useGhlStats();

  const items: Array<{ label: string; numeric: number; display: string; tone: string; mobile: boolean }> = [
    { label: "Calls", numeric: stats.callsToday, display: loading ? "—" : String(stats.callsToday), tone: "text-foreground", mobile: true },
    { label: "Pipeline", numeric: stats.dealsInPipeline, display: loading ? "—" : String(stats.dealsInPipeline), tone: "text-foreground", mobile: true },
    { label: "Won", numeric: stats.dealsWonThisWeek, display: loading ? "—" : String(stats.dealsWonThisWeek), tone: "text-primary", mobile: false },
    { label: "Revenue", numeric: stats.revenueWonThisWeek, display: loading ? "—" : formatCurrency(stats.revenueWonThisWeek), tone: "text-success", mobile: true },
    { label: "Streak", numeric: stats.currentStreak, display: loading ? "—" : `${stats.currentStreak}D`, tone: "text-primary", mobile: false },
  ];

  return (
    <div className="h-7 border-y border-border bg-background flex items-center gap-4 px-3 md:px-8 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-success">Live Floor</span>
      </div>
      <div className="flex-1 flex items-center justify-between md:justify-around gap-3 md:gap-6 min-w-0">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 md:gap-2 shrink-0 ${item.mobile ? "" : "hidden md:flex"}`}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">
              {item.label}
            </span>
            <NumberFlash value={item.numeric} className={`font-mono text-[11px] md:text-xs tabular-nums ${item.tone}`}>
              {item.display}
            </NumberFlash>
          </div>
        ))}
      </div>
    </div>
  );
}
