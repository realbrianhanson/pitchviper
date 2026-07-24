import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Phone,
  Calendar,
  DollarSign,
  Target,
  Building2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  SAMPLE_WORKSPACE,
  sampleTotals,
  type SampleKpi,
  type SampleRep,
  type SampleRepStatus,
} from "@/lib/sampleWorkspace";
import { cn } from "@/lib/utils";

/* -------------------------- helpers -------------------------- */

const currency = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const percent = (n: number, digits = 0) =>
  `${(n * 100).toFixed(digits)}%`;

function formatKpi(kpi: SampleKpi): string {
  if (kpi.unit === "currency") return currency(kpi.value);
  if (kpi.unit === "percent") return percent(kpi.value, 1);
  return kpi.value.toLocaleString("en-US");
}

function formatKpiTarget(kpi: SampleKpi): string {
  if (kpi.unit === "currency") return currency(kpi.target);
  if (kpi.unit === "percent") return percent(kpi.target, 0);
  return kpi.target.toLocaleString("en-US");
}

const STATUS_META: Record<SampleRepStatus, { label: string; dot: string; text: string }> = {
  on_call: { label: "On call", dot: "bg-primary", text: "text-primary" },
  available: { label: "Available", dot: "bg-success", text: "text-success" },
  coaching: { label: "Coaching", dot: "bg-warning", text: "text-warning" },
  offline: { label: "Offline", dot: "bg-muted-foreground/60", text: "text-muted-foreground" },
};

const SEVERITY_META: Record<
  NonNullable<SampleRep["needs_attention"]>["severity"],
  { label: string; className: string }
> = {
  high: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/25" },
  medium: { label: "Medium", className: "bg-warning/10 text-warning border-warning/25" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

/* -------------------------- banner -------------------------- */

function SampleBanner() {
  return (
    <div className="rounded-[12px] border border-primary/25 bg-primary/[0.04] px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <span className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            Sample workspace · fictional data · read only
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nothing here is saved to your workspace. Explore freely — buttons that would
            change data are disabled.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button asChild size="sm" variant="outline">
          <Link to="/manager">Back to my dashboard</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/workspace-setup">Set up my real workspace</Link>
        </Button>
      </div>
    </div>
  );
}

/* -------------------------- KPI strip -------------------------- */

function KpiCard({ kpi }: { kpi: SampleKpi }) {
  const progress = Math.max(0, Math.min(1, kpi.value / Math.max(kpi.target, 1)));
  const positive = kpi.delta_vs_prior_period >= 0;
  return (
    <div className="rounded-[12px] border border-border bg-card p-5 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        {kpi.label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tabular-nums text-foreground leading-none">
          {formatKpi(kpi)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
            positive ? "text-success" : "text-destructive",
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {percent(Math.abs(kpi.delta_vs_prior_period), 1)}
        </span>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 tabular-nums">
          <span>Target</span>
          <span>{formatKpiTarget(kpi)}</span>
        </div>
        <Progress value={progress * 100} className="h-1.5" />
      </div>
    </div>
  );
}

/* -------------------------- triage -------------------------- */

function TriageList({
  reps,
  onOpen,
}: {
  reps: readonly SampleRep[];
  onOpen: (rep: SampleRep) => void;
}) {
  const flagged = reps.filter((r) => r.needs_attention !== null);
  if (flagged.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nobody flagged right now.</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {flagged.map((rep) => {
        const sev = rep.needs_attention!.severity;
        return (
          <li key={rep.id} className="py-3 first:pt-0 last:pb-0">
            <button
              type="button"
              onClick={() => onOpen(rep)}
              className="w-full text-left flex items-start gap-3 rounded-md p-2 -m-2 hover:bg-muted/40 transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                {rep.avatar_initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{rep.name}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0", SEVERITY_META[sev].className)}
                  >
                    {SEVERITY_META[sev].label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {rep.needs_attention!.reason}
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------- chart -------------------------- */

function TrendCard() {
  const data = useMemo(
    () =>
      SAMPLE_WORKSPACE.trend_30d.map((p) => ({
        ...p,
        label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      })),
    [],
  );

  return (
    <div className="rounded-[12px] border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Calls & revenue · last 30 days
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily rollup across the sample team.
          </p>
        </div>
      </div>
      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sampleRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: 11 }}
              interval={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: 11 }}
              width={48}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name) =>
                name === "revenue" ? [currency(value), "Revenue"] : [value, name]
              }
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={1.75}
              fill="url(#sampleRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -------------------------- roster -------------------------- */

function RosterTable({
  reps,
  onOpen,
}: {
  reps: readonly SampleRep[];
  onOpen: (rep: SampleRep) => void;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">Rep</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Calls</th>
              <th className="text-right font-medium px-4 py-2.5">Appts</th>
              <th className="text-right font-medium px-4 py-2.5">Revenue · 30d</th>
              <th className="text-right font-medium px-4 py-2.5">Win rate</th>
              <th className="text-right font-medium px-4 py-2.5">Roleplay</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => {
              const status = STATUS_META[rep.status];
              return (
                <tr
                  key={rep.id}
                  onClick={() => onOpen(rep)}
                  className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground">
                        {rep.avatar_initials}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-tight">{rep.name}</p>
                        <p className="text-xs text-muted-foreground">{rep.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs", status.text)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {rep.calls_today}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {rep.appointments_today}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {currency(rep.revenue_30d)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {percent(rep.win_rate, 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {rep.roleplay_score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------- rep drawer -------------------------- */

function RepDrawer({
  rep,
  onOpenChange,
}: {
  rep: SampleRep | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={rep !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {rep && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                  {rep.avatar_initials}
                </span>
                <div className="text-left">
                  <div className="text-lg font-semibold">{rep.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {rep.title} · Sample profile
                  </div>
                </div>
              </SheetTitle>
              <SheetDescription>
                Read-only view. Coaching, messaging, and status actions are disabled in the
                sample workspace.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox icon={Phone} label="Calls today" value={rep.calls_today.toString()} />
                <MetricBox
                  icon={Calendar}
                  label="Appointments"
                  value={rep.appointments_today.toString()}
                />
                <MetricBox
                  icon={DollarSign}
                  label="Revenue · 30d"
                  value={currency(rep.revenue_30d)}
                />
                <MetricBox
                  icon={Target}
                  label="Win rate"
                  value={percent(rep.win_rate, 0)}
                />
              </div>

              {rep.needs_attention && (
                <div className="rounded-[10px] border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold text-foreground">Needs attention</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{rep.needs_attention.reason}</p>
                </div>
              )}

              <TooltipProvider>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <DisabledAction label="Assign coaching" />
                  <DisabledAction label="Message rep" />
                  <DisabledAction label="Change status" />
                </div>
              </TooltipProvider>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function DisabledAction({ label }: { label: string }) {
  return (
    <UiTooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="sm" variant="outline" disabled className="pointer-events-none">
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Disabled in sample workspace</TooltipContent>
    </UiTooltip>
  );
}

/* -------------------------- insights -------------------------- */

function InsightsPanel({ onOpenRep }: { onOpenRep: (rep: SampleRep) => void }) {
  return (
    <div className="rounded-[12px] border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Sample AI insights</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Sample
        </Badge>
      </div>
      <ul className="space-y-4">
        {SAMPLE_WORKSPACE.insights.map((ins) => {
          const relatedRep = SAMPLE_WORKSPACE.reps.find((r) =>
            ins.headline.includes(r.name),
          );
          return (
            <li key={ins.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {ins.headline}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {ins.detail}
              </p>
              <p className="text-xs text-foreground/80 mt-2">
                <span className="font-medium">Suggested:</span> {ins.suggested_action}
              </p>
              {relatedRep && (
                <button
                  type="button"
                  onClick={() => onOpenRep(relatedRep)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  View {relatedRep.name}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
        <Info className="h-3 w-3" />
        These insights are illustrative and generated from static sample data.
      </div>
    </div>
  );
}

/* -------------------------- page -------------------------- */

export default function SampleWorkspace() {
  const { canManageTeam, isLoading } = useAuth();
  const [openRep, setOpenRep] = useState<SampleRep | null>(null);
  const totals = useMemo(() => sampleTotals(), []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!canManageTeam) {
    return <Navigate to="/app" replace />;
  }

  return (
    <AppLayout title="Sample Workspace">
      <TooltipProvider>
        <div className="max-w-[1400px] mx-auto w-full space-y-6">
          <SampleBanner />

          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4"
          >
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                {SAMPLE_WORKSPACE.meta.company_name} · {SAMPLE_WORKSPACE.meta.period_label}
              </p>
              <h1 className="text-[32px] md:text-[40px] font-semibold leading-tight tracking-tight text-foreground">
                A day on a live sales floor.
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Preview how PitchViper looks with a fully populated team — triage, forecast,
                roster, and AI-style insights. Everything you see is fictional.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="tabular-nums font-medium">{totals.active}</span>
                <span className="text-muted-foreground">of {totals.reps} active</span>
              </span>
            </div>
          </motion.div>

          {/* KPI strip */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {SAMPLE_WORKSPACE.kpis.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} />
            ))}
          </section>

          {/* Triage + insights row */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 rounded-[12px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Needs attention</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totals.needs_attention} rep{totals.needs_attention === 1 ? "" : "s"} flagged
                    with a concrete reason.
                  </p>
                </div>
              </div>
              <TriageList reps={SAMPLE_WORKSPACE.reps} onOpen={setOpenRep} />
            </div>
            <div className="lg:col-span-5">
              <InsightsPanel onOpenRep={setOpenRep} />
            </div>
          </section>

          {/* Chart */}
          <section>
            <TrendCard />
          </section>

          {/* Roster */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Roster</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {totals.reps} sample reps
              </span>
            </div>
            <RosterTable reps={SAMPLE_WORKSPACE.reps} onOpen={setOpenRep} />
          </section>

          <RepDrawer rep={openRep} onOpenChange={(o) => !o && setOpenRep(null)} />
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
