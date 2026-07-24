import { useGhlStats } from "@/hooks/useGhlStats";
import { NumberFlash } from "@/components/ui/number-flash";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

export function LiveTicker() {
  const { stats, loading } = useGhlStats();

  const items: Array<{ label: string; numeric: number; display: string; tone?: string; mobile: boolean }> = [
    { label: "Calls",    numeric: stats.callsToday,          display: loading ? "—" : String(stats.callsToday),          mobile: true },
    { label: "Pipeline", numeric: stats.dealsInPipeline,     display: loading ? "—" : String(stats.dealsInPipeline),     mobile: true },
    { label: "Won",      numeric: stats.dealsWonThisWeek,    display: loading ? "—" : String(stats.dealsWonThisWeek),    mobile: false },
    { label: "Revenue",  numeric: stats.revenueWonThisWeek,  display: loading ? "—" : formatCurrency(stats.revenueWonThisWeek), tone: "text-success", mobile: true },
    { label: "Streak",   numeric: stats.currentStreak,       display: loading ? "—" : `${stats.currentStreak}d`,         mobile: false },
  ];

  return (
    <div className="h-10 border-b border-border bg-card/60 backdrop-blur-sm flex items-center gap-6 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 shrink-0">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success/60 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        <span className="text-[12px] font-medium text-foreground">Today</span>
      </div>
      <div className="flex-1 flex items-center gap-5 md:gap-8 min-w-0 overflow-x-auto">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 shrink-0 ${item.mobile ? "" : "hidden md:flex"} ${
              i > 0 ? "md:border-l md:border-border md:pl-5" : ""
            }`}
          >
            <span className="text-[12px] text-muted-foreground">{item.label}</span>
            <NumberFlash
              value={item.numeric}
              className={`font-mono text-[12px] tabular-nums ${item.tone ?? "text-foreground"}`}
            >
              {item.display}
            </NumberFlash>
          </div>
        ))}
      </div>
    </div>
  );
}
