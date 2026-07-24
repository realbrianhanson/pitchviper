import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCoaching, type CoachingAction } from "@/hooks/useCoaching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, PlayCircle, AlertTriangle, ClipboardList, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { isOverdue, nextActionStatus } from "@/lib/coachingValidation";
import { cn } from "@/lib/utils";

function StatusPill({ action }: { action: CoachingAction }) {
  const overdue = isOverdue(action.due_date, action.status);
  const map = {
    assigned: { label: "Assigned", cls: "border-border bg-background text-foreground" },
    in_progress: { label: "In progress", cls: "border-warning/40 bg-warning/10 text-warning" },
    completed: { label: "Completed", cls: "border-success/40 bg-success/10 text-success" },
  } as const;
  const s = map[action.status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.cls)}>
      {s.label}
      {overdue && <span className="text-destructive">· overdue</span>}
    </span>
  );
}

export function MyCoachingActions() {
  const navigate = useNavigate();
  const { canManageTeam } = useAuth();
  const { useMyCoachingActions, updateActionStatus } = useCoaching();
  const { data: actions = [], isLoading, error } = useMyCoachingActions();
  const [showCompleted, setShowCompleted] = useState(false);

  const { open, completed } = useMemo(() => {
    const open: CoachingAction[] = [];
    const completed: CoachingAction[] = [];
    for (const a of actions) {
      if (a.status === "completed") completed.push(a);
      else open.push(a);
    }
    open.sort((a, b) => {
      const ao = isOverdue(a.due_date, a.status) ? 0 : 1;
      const bo = isOverdue(b.due_date, b.status) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return { open, completed };
  }, [actions]);

  const isPending = updateActionStatus.isPending;

  return (
    <Card className="rounded-[12px] border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="h-4 w-4 text-primary" strokeWidth={2} />
          My coaching actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading actions…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-2">Couldn't load your coaching actions.</p>
        ) : actions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-foreground">Nothing on your plate</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canManageTeam
                ? "Assign actions from the Coaching console to see them here."
                : "Your manager hasn't assigned any coaching actions yet."}
            </p>
          </div>
        ) : (
          <>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">All caught up — nothing open.</p>
            ) : (
              <ul className="space-y-2">
                {open.map((a) => {
                  const next = nextActionStatus(a.status);
                  const overdue = isOverdue(a.due_date, a.status);
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        "rounded-[10px] border bg-card p-3",
                        overdue ? "border-destructive/40" : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <StatusPill action={a} />
                            {a.due_date && (
                              <span
                                className={cn(
                                  "text-[11px]",
                                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                                )}
                              >
                                Due {format(parseISO(a.due_date), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                        {next && (
                          <Button
                            size="sm"
                            variant={next === "completed" ? "default" : "outline"}
                            disabled={isPending}
                            onClick={() => updateActionStatus.mutate({ action_id: a.id, status: next })}
                            className="shrink-0"
                          >
                            {next === "in_progress" ? (
                              <>
                                <PlayCircle className="h-3.5 w-3.5 mr-1" /> Start
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {completed.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCompleted((s) => !s)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showCompleted ? "Hide" : "Show"} {completed.length} completed
                </button>
                {showCompleted && (
                  <ul className="mt-2 space-y-1.5">
                    {completed.slice(0, 5).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground rounded-[8px] border border-border/60 bg-muted/30 px-3 py-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="truncate flex-1">{a.title}</span>
                        {a.completed_at && (
                          <span className="tabular-nums">{format(parseISO(a.completed_at), "MMM d")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {canManageTeam && (
          <div className="pt-2 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/coaching")}>
              Open coaching console
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
