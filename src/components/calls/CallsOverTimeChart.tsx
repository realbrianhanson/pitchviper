import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";

interface CallsOverTimeChartProps {
  data: Array<{ date: string; total: number; connected: number }>;
}

export function CallsOverTimeChart({ data }: CallsOverTimeChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    dateLabel: format(parseISO(item.date), 'MMM d'),
  }));

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle>Calls Over Time</ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Calls"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="connected"
                name="Connected"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
