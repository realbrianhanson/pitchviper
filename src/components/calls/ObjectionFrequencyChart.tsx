import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";

interface ObjectionFrequencyChartProps {
  data: Array<{ objection: string; count: number }>;
}

export function ObjectionFrequencyChart({ data }: ObjectionFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Objection Frequency
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>No objection data yet. Log calls with self-assessments to see insights.</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Objection Frequency
        </ViperCardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Most common objections reps struggled with
        </p>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="objection" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                width={120}
                tickFormatter={(value) => value.length > 15 ? `${value.slice(0, 15)}...` : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--warning))" 
                radius={[0, 4, 4, 0]}
                name="Times Struggled"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
