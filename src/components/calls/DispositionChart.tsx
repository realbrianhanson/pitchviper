import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DispositionChartProps {
  dispositions: Record<string, number>;
}

const DISPOSITION_CONFIG: Record<string, { label: string; color: string }> = {
  appointment_set: { label: 'Appointment Set', color: 'hsl(var(--success))' },
  deal_closed: { label: 'Deal Closed', color: 'hsl(var(--success))' },
  callback_scheduled: { label: 'Callback Scheduled', color: 'hsl(var(--primary))' },
  info_sent: { label: 'Info Sent', color: 'hsl(var(--primary))' },
  no_decision: { label: 'No Decision', color: 'hsl(var(--muted-foreground))' },
  not_interested: { label: 'Not Interested', color: 'hsl(var(--destructive))' },
  deal_lost: { label: 'Deal Lost', color: 'hsl(var(--destructive))' },
};

export function DispositionChart({ dispositions }: DispositionChartProps) {
  const data = Object.entries(dispositions)
    .map(([key, value]) => ({
      name: DISPOSITION_CONFIG[key]?.label || key,
      value,
      color: DISPOSITION_CONFIG[key]?.color || 'hsl(var(--muted-foreground))',
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>Disposition Breakdown</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No disposition data yet
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle>Disposition Breakdown</ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
