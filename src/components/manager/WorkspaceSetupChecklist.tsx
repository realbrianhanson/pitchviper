import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWorkspaceSetup } from "@/hooks/useWorkspaceSetup";
import { WORKSPACE_SETUP_ROUTE, workspaceSetupStepUrl } from "@/lib/workspaceSetup";

const NEXT_STEP_LABEL: Record<string, string> = {
  company: "Company details",
  targets: "Targets & brand",
  team: "Team",
  systems: "Systems",
};

export function WorkspaceSetupChecklist() {
  const { isLoading, settings, progress, canManage } = useWorkspaceSetup();

  if (!canManage || isLoading) return null;
  // Hide once setup has been completed.
  if (settings?.setup_completed_at) return null;

  const nextLabel = progress.nextStep ? NEXT_STEP_LABEL[progress.nextStep] : null;
  const continueHref = progress.nextStep ? workspaceSetupStepUrl(progress.nextStep) : WORKSPACE_SETUP_ROUTE;

  return (
    <motion.section
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[12px] border border-border bg-card shadow-sm p-5 md:p-6"
      aria-label="Workspace setup checklist"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Workspace setup</p>
          <h2 className="text-base font-semibold text-foreground">
            {progress.canComplete ? "Almost there — complete setup" : "Finish configuring your sales floor"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {progress.completedCount} of {progress.totalCount} steps complete
            {nextLabel ? <> · Up next: <span className="text-foreground">{nextLabel}</span></> : null}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button asChild size="sm" className="gap-2">
            <Link to={continueHref}>
              {progress.canComplete ? "Review & complete" : "Continue setup"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <Progress value={progress.percent} className="h-1.5" />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {progress.steps.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <CheckCircle2 className={s.complete ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 text-muted-foreground/40"} strokeWidth={2} />
              <span className={s.complete ? "text-foreground" : ""}>{s.id === "company" ? "Company" : s.id === "targets" ? "Targets" : s.id === "team" ? "Team" : "Systems"}</span>
              {s.deferred && !s.complete && <span className="text-[10px] uppercase tracking-wider">Deferred</span>}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
