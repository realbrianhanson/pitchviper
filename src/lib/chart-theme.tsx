/**
 * Sovereign Editorial Recharts theme.
 *
 * Hairline axes, JetBrains Mono 10px uppercase ticks, no gridlines.
 * Series limited to gold / magenta / acid-green.
 * Use `EditorialTooltip` as the `<Tooltip content={…} />` for every chart.
 */
import { ReactNode } from "react";

export const EDITORIAL_COLORS = {
  gold: "hsl(var(--primary))",
  goldSoft: "hsl(var(--primary) / 0.45)",
  magenta: "hsl(var(--magenta))",
  acidGreen: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  muted: "hsl(var(--muted-foreground) / 0.6)",
  border: "hsl(var(--border))",
} as const;

/** Sequence used when a chart needs many series. Order is intentional. */
export const EDITORIAL_SERIES: string[] = [
  EDITORIAL_COLORS.gold,
  EDITORIAL_COLORS.acidGreen,
  EDITORIAL_COLORS.magenta,
  EDITORIAL_COLORS.goldSoft,
  EDITORIAL_COLORS.warning,
];

const tickBase = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 10,
  fontFamily: "var(--font-mono, 'JetBrains Mono'), ui-monospace, monospace",
  textTransform: "uppercase" as const,
  letterSpacing: "0.15em",
};

export const editorialAxis = {
  stroke: "hsl(var(--border))",
  strokeWidth: 1,
  tickLine: false,
  tick: tickBase,
  axisLine: { stroke: "hsl(var(--border))" },
} as const;

/** 1px dotted gridline at very low opacity. Pass to `<CartesianGrid {...editorialGrid} />`. */
export const editorialGrid = {
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.4,
  strokeDasharray: "1 4",
  vertical: false,
} as const;

/** Editorial tooltip — a small hairline tile with mono eyebrow + serif value. */
export function EditorialTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>;
  label?: string | number;
  labelFormatter?: (label: any) => ReactNode;
  valueFormatter?: (value: any, name?: string) => ReactNode;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="border border-border bg-card px-3 py-2 shadow-none min-w-[140px]">
      {label !== undefined && (
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span
                className="inline-block h-1.5 w-1.5"
                style={{ background: entry.color || "currentColor" }}
              />
              {entry.name}
            </span>
            <span
              className="font-display tabular-nums text-sm"
              style={{ color: entry.color || "hsl(var(--foreground))" }}
            >
              {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Legend renderer — mono uppercase labels, small swatch. */
export function EditorialLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-4 mt-2">
      {payload.map((entry, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-3" style={{ background: entry.color }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
