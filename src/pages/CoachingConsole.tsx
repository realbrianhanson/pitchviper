import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useCoaching, type CoachingAction } from "@/hooks/useCoaching";
import {
  MAX_ACTIONS,
  defaultActionDueDate,
  isOverdue,
  nextActionStatus,
  resolveRepParam,
} from "@/lib/coachingValidation";
import {
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  PlayCircle,
  Calendar,
  Target,
  ClipboardList,
  FileText,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function cleanName(name?: string | null): string {
  return (name || "").replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}
function initials(name: string): string {
  return cleanName(name).split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

interface DraftAction {
  key: string;
  title: string;
  description: string;
  due_date: string;
}

function makeDraftAction(): DraftAction {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    description: "",
    due_date: defaultActionDueDate(),
  };
}

export default function CoachingConsole() {
  const { canManageTeam, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  const {
    teamMembers,
    isLoadingMembers,
    useRepCoachingSessions,
    useRepCoachingActions,
    saveCoachingSession,
    updateActionStatus,
  } = useCoaching();

  const teamMemberIds = useMemo(() => teamMembers.map((m) => m.user_id), [teamMembers]);

  // Sync ?rep= into state after verifying membership; ignore/clear invalid IDs.
  useEffect(() => {
    if (isLoadingMembers) return;
    const raw = searchParams.get("rep");
    const resolved = resolveRepParam(raw, teamMemberIds);
    if (resolved && resolved !== selectedRepId) {
      setSelectedRepId(resolved);
    } else if (raw && !resolved) {
      // Invalid or cross-team id; drop it from the URL.
      const next = new URLSearchParams(searchParams);
      next.delete("rep");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, teamMemberIds, isLoadingMembers, selectedRepId, setSearchParams]);

  const selectedRep = useMemo(
    () => teamMembers.find((m) => m.user_id === selectedRepId) || null,
    [teamMembers, selectedRepId]
  );

  const { data: sessions = [], isLoading: loadingSessions } = useRepCoachingSessions(selectedRepId);
  const { data: actions = [], isLoading: loadingActions } = useRepCoachingActions(selectedRepId);

  // Form state
  const [notes, setNotes] = useState("");
  const [focusInput, setFocusInput] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [draftActions, setDraftActions] = useState<DraftAction[]>([makeDraftAction()]);

  const resetForm = () => {
    setNotes("");
    setFocusInput("");
    setFocusAreas([]);
    setDraftActions([makeDraftAction()]);
  };

  useEffect(() => {
    resetForm();
  }, [selectedRepId]);

  if (!loading && !canManageTeam) return <Navigate to="/" replace />;

  const selectRep = (userId: string) => {
    setSelectedRepId(userId);
    const next = new URLSearchParams(searchParams);
    next.set("rep", userId);
    setSearchParams(next, { replace: true });
  };

  const clearSelection = () => {
    setSelectedRepId(null);
    const next = new URLSearchParams(searchParams);
    next.delete("rep");
    setSearchParams(next, { replace: true });
  };

  const addFocus = () => {
    const v = focusInput.trim();
    if (!v) return;
    setFocusAreas((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setFocusInput("");
  };

  const openActions = actions.filter((a) => a.status !== "completed");
  const completedActions = actions.filter((a) => a.status === "completed");

  const handleSave = () => {
    if (!selectedRepId || saveCoachingSession.isPending) return;
    saveCoachingSession.mutate(
      {
        rep_id: selectedRepId,
        notes,
        focus_areas: focusAreas,
        actions: draftActions
          .map((d) => ({
            title: d.title,
            description: d.description || undefined,
            due_date: d.due_date || undefined,
          }))
          .filter((a) => a.title.trim().length > 0),
      },
      { onSuccess: () => resetForm() }
    );
  };

  return (
    <AppLayout title="Coaching Console">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Coaching</p>
          <h1 className="text-[28px] md:text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            Coach your team.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a rep, log a session, assign clear next actions.
          </p>
        </div>

        {selectedRepId && (
          <div className="lg:hidden">
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back to team
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Rep list */}
          <div className={cn("lg:col-span-3", selectedRepId ? "hidden lg:block" : "block")}>
            <Card className="rounded-[12px] border-border shadow-sm lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" strokeWidth={2} />
                  Team members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {isLoadingMembers ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No team members yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {teamMembers.map((m) => {
                      const name = cleanName(m.full_name);
                      const active = selectedRepId === m.user_id;
                      return (
                        <li key={m.user_id}>
                          <button
                            type="button"
                            onClick={() => selectRep(m.user_id)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors",
                              active ? "bg-primary/10 text-foreground" : "hover:bg-accent"
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={m.avatar_url || undefined} alt={name} />
                              <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {m.last_coached_at
                                  ? `Coached ${format(parseISO(m.last_coached_at), "MMM d")}`
                                  : "Never coached"}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main */}
          <div className={cn("lg:col-span-9 space-y-4", !selectedRepId ? "hidden lg:block" : "block")}>
            {!selectedRep ? (
              <Card className="rounded-[12px] border-border shadow-sm">
                <CardContent className="py-16 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
                  <p className="text-base font-semibold text-foreground">Select a rep to begin</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Pick someone from your team on the left to view their history and log a new coaching session.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header */}
                <Card className="rounded-[12px] border-border shadow-sm">
                  <CardContent className="flex items-center gap-4 py-5">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={selectedRep.avatar_url || undefined} />
                      <AvatarFallback>{initials(cleanName(selectedRep.full_name))}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-foreground truncate">
                        {cleanName(selectedRep.full_name) || "Unknown"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Level {selectedRep.current_level} · {selectedRep.current_streak}-day streak ·{" "}
                        {selectedRep.last_coached_at
                          ? `Last coached ${format(parseISO(selectedRep.last_coached_at), "MMM d, yyyy")}`
                          : "Never coached"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Active actions */}
                <Card className="rounded-[12px] border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4 text-primary" strokeWidth={2} />
                      Coaching actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {loadingActions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading actions…
                      </div>
                    ) : openActions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No open actions.</p>
                    ) : (
                      <ul className="space-y-2">
                        {openActions.map((a) => (
                          <ActionRow
                            key={a.id}
                            action={a}
                            pending={updateActionStatus.isPending}
                            onAdvance={(status) => updateActionStatus.mutate({ action_id: a.id, status })}
                          />
                        ))}
                      </ul>
                    )}
                    {completedActions.length > 0 && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                          Recently completed
                        </p>
                        <ul className="space-y-1.5">
                          {completedActions.slice(0, 5).map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground rounded-[8px] border border-border/60 bg-muted/20 px-3 py-1.5"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              <span className="flex-1 truncate">{a.title}</span>
                              {a.completed_at && (
                                <span className="text-xs tabular-nums">
                                  {format(parseISO(a.completed_at), "MMM d")}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* New session */}
                <Card className="rounded-[12px] border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
                      New coaching session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="notes">Session notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What did you discuss? What's the recap?"
                        className="mt-1 min-h-[100px]"
                        maxLength={4000}
                      />
                    </div>

                    <div>
                      <Label>Focus areas</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={focusInput}
                          onChange={(e) => setFocusInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFocus())}
                          placeholder="Add a focus area…"
                          maxLength={80}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={addFocus}>
                          Add
                        </Button>
                      </div>
                      {focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {focusAreas.map((f, i) => (
                            <Badge key={i} variant="secondary" className="gap-1">
                              <Target className="h-3 w-3" />
                              {f}
                              <button
                                type="button"
                                onClick={() => setFocusAreas((prev) => prev.filter((_, idx) => idx !== i))}
                                className="ml-1 hover:text-destructive"
                                aria-label={`Remove focus ${f}`}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Action items ({draftActions.length}/{MAX_ACTIONS})</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={draftActions.length >= MAX_ACTIONS}
                          onClick={() => setDraftActions((prev) => [...prev, makeDraftAction()])}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add action
                        </Button>
                      </div>
                      <ul className="space-y-3">
                        {draftActions.map((d, idx) => (
                          <li key={d.key} className="rounded-[10px] border border-border bg-background p-3 space-y-2">
                            <div className="flex items-start gap-2">
                              <Input
                                value={d.title}
                                onChange={(e) =>
                                  setDraftActions((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                                  )
                                }
                                placeholder={`Action ${idx + 1} title`}
                                maxLength={160}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setDraftActions((prev) =>
                                    prev.length === 1 ? [makeDraftAction()] : prev.filter((_, i) => i !== idx)
                                  )
                                }
                                aria-label={`Remove action ${idx + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input
                                className="sm:col-span-2"
                                value={d.description}
                                onChange={(e) =>
                                  setDraftActions((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                                  )
                                }
                                placeholder="Optional details"
                                maxLength={1000}
                              />
                              <div className="relative">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <Input
                                  type="date"
                                  className="pl-8"
                                  value={d.due_date}
                                  onChange={(e) =>
                                    setDraftActions((prev) =>
                                      prev.map((x, i) => (i === idx ? { ...x, due_date: e.target.value } : x))
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSave}
                        disabled={
                          saveCoachingSession.isPending ||
                          !notes.trim() ||
                          draftActions.every((d) => !d.title.trim())
                        }
                      >
                        {saveCoachingSession.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                          </>
                        ) : (
                          "Save session"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* History */}
                <Card className="rounded-[12px] border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Previous sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingSessions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No previous sessions.</p>
                    ) : (
                      <ul className="space-y-3">
                        {sessions.map((s) => (
                          <li key={s.id} className="rounded-[10px] border border-border bg-background p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">
                                {format(parseISO(s.created_at), "MMM d, yyyy")}
                              </span>
                              <Badge variant="outline" className="text-[11px]">{s.status}</Badge>
                            </div>
                            <p className="text-sm text-foreground/85 whitespace-pre-wrap">{s.notes}</p>
                            {s.focus_areas && s.focus_areas.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {s.focus_areas.map((f, i) => (
                                  <Badge key={i} variant="secondary" className="text-[11px]">{f}</Badge>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ActionRow({
  action,
  pending,
  onAdvance,
}: {
  action: CoachingAction;
  pending: boolean;
  onAdvance: (status: "in_progress" | "completed") => void;
}) {
  const overdue = isOverdue(action.due_date, action.status);
  const next = nextActionStatus(action.status);
  return (
    <li
      className={cn(
        "rounded-[10px] border bg-background p-3",
        overdue ? "border-destructive/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
          {action.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                action.status === "assigned"
                  ? "border-border bg-background text-foreground"
                  : action.status === "in_progress"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-success/40 bg-success/10 text-success"
              )}
            >
              {action.status.replace("_", " ")}
            </span>
            {action.due_date && (
              <span className={cn(overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                Due {format(parseISO(action.due_date), "MMM d")}
                {overdue ? " · overdue" : ""}
              </span>
            )}
          </div>
        </div>
        {next && (
          <Button
            size="sm"
            variant={next === "completed" ? "default" : "outline"}
            disabled={pending}
            onClick={() => onAdvance(next as "in_progress" | "completed")}
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
}
