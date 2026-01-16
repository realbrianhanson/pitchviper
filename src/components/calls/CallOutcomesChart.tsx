import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface CallOutcomesChartProps {
  outcomes: {
    connected: number;
    voicemail: number;
    no_answer: number;
    wrong_number: number;
  };
}

const COLORS = {
  connected: 'hsl(var(--success))',
  voicemail: 'hsl(var(--warning))',
  no_answer: 'hsl(var(--muted-foreground))',
  wrong_number: 'hsl(var(--destructive))',
};

const LABELS = {
  connected: 'Connected',
  voicemail: 'Voicemail',
  no_answer: 'No Answer',
  wrong_number: 'Wrong Number',
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
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          {/* Center total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
