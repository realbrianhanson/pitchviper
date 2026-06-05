import { useTickerStats } from "@/hooks/useTickerStats";

const formatCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

function formatClock(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function LiveTicker() {
  const stats = useTickerStats();

  const items = [
    { label: "Calls", value: stats?.callsToday ?? 0, tone: "text-foreground" },
    { label: "Appts", value: stats?.appts ?? 0, tone: "text-primary" },
    { label: "Connect", value: `${stats?.connectRate ?? 0}%`, tone: "text-foreground" },
    { label: "Revenue", value: formatCurrency(stats?.revenue ?? 0), tone: "text-success" },
    { label: "Streak", value: `${stats?.streak ?? 0}D`, tone: "text-primary" },
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
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 hidden md:inline">
          {formatClock()} UTC
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
