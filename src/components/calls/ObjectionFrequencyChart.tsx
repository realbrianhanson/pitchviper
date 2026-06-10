import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";
import { EDITORIAL_COLORS, editorialAxis, editorialGrid, EditorialTooltip } from "@/lib/chart-theme";
import { EditorialEmpty } from "@/components/ui/editorial-empty";

interface ObjectionFrequencyChartProps {
  data: Array<{ objection: string; count: number }>;
}

export function ObjectionFrequencyChart({ data }: ObjectionFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.5} />
            Objection Frequency
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <EditorialEmpty
            eyebrow="Objections"
            title="No friction recorded yet"
            description="Self-assess your calls and the pressure points will surface here."
            size="sm"
          />
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.5} />
          Objection Frequency
        </ViperCardTitle>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-1">
          Most Common Pushbacks
        </p>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 8 }}>
              <CartesianGrid {...editorialGrid} horizontal={false} vertical />
              <XAxis type="number" {...editorialAxis} />
              <YAxis
                type="category"
                dataKey="objection"
                {...editorialAxis}
                width={140}
                tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 18)}…` : value)}
              />
              <Tooltip content={<EditorialTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
              <Bar dataKey="count" fill={EDITORIAL_COLORS.magenta} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
