import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { EDITORIAL_COLORS, editorialAxis, editorialGrid, EditorialTooltip, EditorialLegend } from "@/lib/chart-theme";

interface CallsOverTimeChartProps {
  data: Array<{ date: string; total: number; connected: number }>;
}

export function CallsOverTimeChart({ data }: CallsOverTimeChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: format(parseISO(item.date), "MMM d"),
  }));

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle>Calls Over Time</ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...editorialGrid} />
              <XAxis dataKey="dateLabel" {...editorialAxis} />
              <YAxis {...editorialAxis} width={32} />
              <Tooltip content={<EditorialTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
              <Legend content={<EditorialLegend />} />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Calls"
                stroke={EDITORIAL_COLORS.gold}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: EDITORIAL_COLORS.gold }}
              />
              <Line
                type="monotone"
                dataKey="connected"
                name="Connected"
                stroke={EDITORIAL_COLORS.acidGreen}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: EDITORIAL_COLORS.acidGreen }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
