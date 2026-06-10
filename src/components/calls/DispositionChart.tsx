import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { EDITORIAL_COLORS, editorialAxis, editorialGrid, EditorialTooltip } from "@/lib/chart-theme";
import { EditorialEmpty } from "@/components/ui/editorial-empty";

interface DispositionChartProps {
  dispositions: Record<string, number>;
}

const DISPOSITION_CONFIG: Record<string, { label: string; color: string }> = {
  appointment_set: { label: "Appointment Set", color: EDITORIAL_COLORS.acidGreen },
  deal_closed: { label: "Deal Closed", color: EDITORIAL_COLORS.acidGreen },
  callback_scheduled: { label: "Callback Scheduled", color: EDITORIAL_COLORS.gold },
  info_sent: { label: "Info Sent", color: EDITORIAL_COLORS.gold },
  no_decision: { label: "No Decision", color: EDITORIAL_COLORS.muted },
  not_interested: { label: "Not Interested", color: EDITORIAL_COLORS.magenta },
  deal_lost: { label: "Deal Lost", color: EDITORIAL_COLORS.magenta },
};

export function DispositionChart({ dispositions }: DispositionChartProps) {
  const data = Object.entries(dispositions)
    .map(([key, value]) => ({
      name: DISPOSITION_CONFIG[key]?.label || key,
      value,
      color: DISPOSITION_CONFIG[key]?.color || EDITORIAL_COLORS.muted,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>Disposition Breakdown</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <EditorialEmpty
            eyebrow="Dispositions"
            title="No outcomes logged yet"
            description="Log a call disposition and the breakdown lands here."
            size="sm"
          />
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
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 8 }}>
              <CartesianGrid {...editorialGrid} horizontal={false} vertical />
              <XAxis type="number" {...editorialAxis} />
              <YAxis type="category" dataKey="name" {...editorialAxis} width={140} />
              <Tooltip content={<EditorialTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
              <Bar dataKey="value" radius={[0, 0, 0, 0]}>
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
