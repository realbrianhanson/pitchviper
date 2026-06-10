import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EDITORIAL_COLORS, EditorialTooltip, EditorialLegend } from "@/lib/chart-theme";

interface CallOutcomesChartProps {
  outcomes: {
    connected: number;
    voicemail: number;
    no_answer: number;
    wrong_number: number;
  };
}

const COLORS = {
  connected: EDITORIAL_COLORS.acidGreen,
  voicemail: EDITORIAL_COLORS.gold,
  no_answer: EDITORIAL_COLORS.muted,
  wrong_number: EDITORIAL_COLORS.magenta,
};

const LABELS = {
  connected: "Connected",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
};

export function CallOutcomesChart({ outcomes }: CallOutcomesChartProps) {
  const data = Object.entries(outcomes).map(([key, value]) => ({
    name: LABELS[key as keyof typeof LABELS],
    value,
    color: COLORS[key as keyof typeof COLORS],
  }));
  const total = Object.values(outcomes).reduce((sum, val) => sum + val, 0);

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle>Call Outcomes</ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[300px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={1}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<EditorialTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="font-display text-4xl tabular-nums text-foreground">{total}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70 mt-1">
                Total Calls
              </p>
            </div>
          </div>
        </div>
        <EditorialLegend payload={data.map((d) => ({ value: d.name, color: d.color }))} />
      </ViperCardContent>
    </ViperCard>
  );
}
