import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Loader2, Building2, Target, Users, Plug, ClipboardCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceSetup } from "@/hooks/useWorkspaceSetup";
import { toast } from "sonner";
import {
  computeSetupProgress,
  isCompanyStepValid,
  isTargetsStepValid,
  type SetupStepId,
  type WorkspaceSetupInput,
} from "@/lib/workspaceSetup";
import { TeamMembersManager } from "@/components/settings/TeamMembersManager";
import { cn } from "@/lib/utils";

const STEP_ORDER: SetupStepId[] = ["company", "targets", "team", "systems"];

const STEP_META: Record<SetupStepId | "review", { title: string; icon: typeof Building2; description: string }> = {
  company: { title: "Company", icon: Building2, description: "Who you are and what you sell." },
  targets: { title: "Targets & brand", icon: Target, description: "Daily goals and how the workspace should feel." },
  team: { title: "Team", icon: Users, description: "Invite reps or continue with your current roster." },
  systems: { title: "Systems", icon: Plug, description: "Connect a call platform or run manually." },
  review: { title: "Review", icon: ClipboardCheck, description: "Confirm and complete setup." },
};

type WizardStep = SetupStepId | "review";

const INDUSTRY_OPTIONS = ["SaaS", "Financial services", "Real estate", "Insurance", "Healthcare", "Home services", "Other"];
const TIMEZONE_OPTIONS = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "Europe/London", "UTC"];

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { canManageTeam, profile, isLoading: authLoading } = useAuth();
  const setup = useWorkspaceSetup();

  const stepParam = params.get("step") as WizardStep | null;
  const [step, setStep] = useState<WizardStep>(stepParam && [...STEP_ORDER, "review"].includes(stepParam) ? stepParam : "company");

  // Local, editable draft mirrors current settings for company + targets steps.
  const [draft, setDraft] = useState({
    company_name: "",
    product_description: "",
    industry: "",
    target_audience: "",
    daily_calls_target: 50,
    daily_appointments_target: 3,
    monthly_revenue_target: 100000,
    timezone: "America/New_York",
    brand_color: "#0f6b3a",
    logo_url: "",
  });
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!setup.settings || hydrated) return;
    const s = setup.settings;
    setDraft({
      company_name: s.company_name ?? "",
      product_description: s.product_description ?? "",
      industry: s.industry ?? "",
      target_audience: s.target_audience ?? "",
      daily_calls_target: s.daily_calls_target ?? 50,
      daily_appointments_target: s.daily_appointments_target ?? 3,
      monthly_revenue_target: s.monthly_revenue_target ?? 100000,
      timezone: s.timezone ?? "America/New_York",
      brand_color: s.brand_color ?? "#0f6b3a",
      logo_url: s.logo_url ?? "",
    });
    setHydrated(true);
  }, [setup.settings, hydrated]);

  useEffect(() => {
    if (!authLoading && !canManageTeam) navigate("/app", { replace: true });
  }, [authLoading, canManageTeam, navigate]);

  useEffect(() => {
    if (stepParam && stepParam !== step) setStep(stepParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepParam]);

  const goToStep = (next: WizardStep) => {
    setStep(next);
    const p = new URLSearchParams(params);
    p.set("step", next);
    setParams(p, { replace: true });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentIndex = step === "review" ? STEP_ORDER.length : STEP_ORDER.indexOf(step);
  const goNext = () => goToStep(currentIndex + 1 >= STEP_ORDER.length ? "review" : STEP_ORDER[currentIndex + 1]);
  const goBack = () => {
    if (step === "review") return goToStep(STEP_ORDER[STEP_ORDER.length - 1]);
    if (currentIndex > 0) goToStep(STEP_ORDER[currentIndex - 1]);
  };

  // Live preview progress (uses draft for company + targets so bars update as user types).
  const previewInput: WorkspaceSetupInput = useMemo(() => ({
    company_name: draft.company_name,
    product_description: draft.product_description,
    industry: draft.industry,
    target_audience: draft.target_audience,
    brand_color: draft.brand_color,
    logo_url: draft.logo_url,
    timezone: draft.timezone,
    daily_calls_target: draft.daily_calls_target,
    daily_appointments_target: draft.daily_appointments_target,
    monthly_revenue_target: draft.monthly_revenue_target,
    crm_provider: setup.settings?.crm_provider ?? "none",
    crm_connected_at: setup.settings?.crm_connected_at ?? null,
    first_sync_at: setup.settings?.first_sync_at ?? null,
    setup_completed_at: setup.settings?.setup_completed_at ?? null,
    setup_state: setup.settings?.setup_state as never ?? {},
    team_member_count: setup.teamMemberCount,
    mapped_rep_count: setup.mappedRepCount,
  }), [draft, setup.settings, setup.teamMemberCount, setup.mappedRepCount]);

  const preview = useMemo(() => computeSetupProgress(previewInput), [previewInput]);

  const persistedProgress = setup.progress;

  const handleSaveCompany = async () => {
    if (!isCompanyStepValid(draft)) {
      toast.error("Add a company name and a product description of at least 20 characters.");
      return;
    }
    setSaving(true);
    try {
      await setup.save(
        {
          company_name: draft.company_name.trim(),
          product_description: draft.product_description.trim(),
          industry: draft.industry || null,
          target_audience: draft.target_audience || null,
        },
        { action: "workspace_setup_saved_company" }
      );
      toast.success("Company details saved");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save company details");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTargets = async () => {
    if (!isTargetsStepValid(draft)) {
      toast.error("All three targets must be positive numbers.");
      return;
    }
    setSaving(true);
    try {
      await setup.save(
        {
          daily_calls_target: Number(draft.daily_calls_target),
          daily_appointments_target: Number(draft.daily_appointments_target),
          monthly_revenue_target: Number(draft.monthly_revenue_target),
          timezone: draft.timezone,
          brand_color: draft.brand_color,
          logo_url: draft.logo_url.trim() || null,
        },
        { action: "workspace_setup_saved_targets" }
      );
      toast.success("Targets and brand saved");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save targets");
    } finally {
      setSaving(false);
    }
  };

  const markTeamReviewed = async (deferred: boolean) => {
    setSaving(true);
    try {
      await setup.patchState(
        deferred ? { team_deferred: true, team_reviewed: false } : { team_reviewed: true, team_deferred: false },
        { action: deferred ? "workspace_setup_team_deferred" : "workspace_setup_team_reviewed" }
      );
      toast.success(deferred ? "You can invite teammates later" : "Team step reviewed");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update team step");
    } finally {
      setSaving(false);
    }
  };

  const chooseSystem = async (provider: "aloware" | "gohighlevel" | "manual") => {
    setSaving(true);
    try {
      if (provider === "manual") {
        await setup.save({ crm_provider: "manual" }, { action: "workspace_setup_manual_operation" });
        await setup.patchState({ systems_reviewed: true, systems_deferred: false });
        toast.success("Set to manual operation");
        goNext();
      } else {
        await setup.save({ crm_provider: provider }, { action: "workspace_setup_system_selected", metadata: { provider } });
        toast.success(`Provider set to ${provider === "aloware" ? "Aloware" : "GoHighLevel"}. Complete the connection in Team Settings.`);
        // Deep-link into the correct tab so the user can actually connect.
        if (provider === "aloware") navigate("/team-settings?tab=aloware");
        else navigate("/team-settings?tab=webhook");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save selection");
    } finally {
      setSaving(false);
    }
  };

  const deferSystems = async () => {
    setSaving(true);
    try {
      await setup.patchState({ systems_deferred: true, systems_reviewed: false }, { action: "workspace_setup_systems_deferred" });
      toast.success("You can connect a system later");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't defer step");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!persistedProgress.canComplete) {
      toast.error("Company details and targets are required before completing setup.");
      return;
    }
    setCompleting(true);
    try {
      await setup.complete();
      toast.success("Workspace setup complete");
      navigate("/manager");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't complete setup");
    } finally {
      setCompleting(false);
    }
  };

  if (authLoading || setup.isLoading) {
    return (
      <AppLayout title="Workspace setup">
        <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }

  if (!canManageTeam) return null;

  return (
    <AppLayout title="Workspace setup">
      <div className="max-w-[1100px] mx-auto w-full space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs text-muted-foreground mb-1.5">Guided setup</p>
          <h1 className="text-[28px] md:text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            Configure your sales floor
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Five short steps. You can revisit any of them later from Settings.{" "}
            <button
              type="button"
              onClick={() => navigate("/sample-workspace")}
              className="text-primary font-medium hover:underline"
            >
              Explore a sample workspace
            </button>{" "}
            to see the finished experience.
          </p>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Progress value={preview.percent} className="h-1.5" />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {preview.completedCount} of {preview.totalCount} steps complete
            </span>
          </div>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Step rail */}
          <nav className="rounded-[12px] border border-border bg-card p-2 h-fit lg:sticky lg:top-6">
            <ul className="space-y-1">
              {([...STEP_ORDER, "review"] as WizardStep[]).map((id, idx) => {
                const meta = STEP_META[id];
                const Icon = meta.icon;
                const isCurrent = step === id;
                const persistedStep = id === "review" ? null : preview.steps.find((s) => s.id === id);
                const done = id === "review" ? preview.canComplete : Boolean(persistedStep?.complete);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => goToStep(id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        isCurrent ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      )}
                    >
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] tabular-nums shrink-0",
                        done ? "bg-primary/10 border-primary/30 text-primary" : "border-border bg-background"
                      )}>
                        {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{meta.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Step body */}
          <section className="rounded-[12px] border border-border bg-card shadow-sm">
            <div className="p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{STEP_META[step].title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{STEP_META[step].description}</p>
              </div>

              {step === "company" && (
                <div className="space-y-5">
                  <Field label="Company name" required>
                    <Input value={draft.company_name} onChange={(e) => setDraft((d) => ({ ...d, company_name: e.target.value }))} placeholder="Acme Sales Co." />
                  </Field>
                  <Field label="Industry">
                    <Select value={draft.industry} onValueChange={(v) => setDraft((d) => ({ ...d, industry: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Target audience" hint="Who your reps typically call.">
                    <Input value={draft.target_audience} onChange={(e) => setDraft((d) => ({ ...d, target_audience: e.target.value }))} placeholder="e.g. Independent insurance agencies with 5–50 producers" />
                  </Field>
                  <Field label="Product description" required hint="A short paragraph the AI coach and roleplay engine will use for context.">
                    <Textarea
                      value={draft.product_description}
                      onChange={(e) => setDraft((d) => ({ ...d, product_description: e.target.value }))}
                      placeholder="Describe what you sell, who it's for, and the primary outcome customers buy."
                      rows={5}
                      maxLength={1500}
                    />
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">{draft.product_description.length}/1500 · minimum 20 characters</p>
                  </Field>
                  <StepFooter onBack={undefined} onNext={handleSaveCompany} nextLabel={saving ? "Saving…" : "Save & continue"} nextDisabled={saving || !isCompanyStepValid(draft)} />
                </div>
              )}

              {step === "targets" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Calls per rep / day" required>
                      <Input type="number" min={1} value={draft.daily_calls_target} onChange={(e) => setDraft((d) => ({ ...d, daily_calls_target: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Appointments per rep / day" required>
                      <Input type="number" min={1} value={draft.daily_appointments_target} onChange={(e) => setDraft((d) => ({ ...d, daily_appointments_target: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Monthly revenue target ($)" required>
                      <Input type="number" min={1} value={draft.monthly_revenue_target} onChange={(e) => setDraft((d) => ({ ...d, monthly_revenue_target: Number(e.target.value) }))} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Timezone">
                      <Select value={draft.timezone} onValueChange={(v) => setDraft((d) => ({ ...d, timezone: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMEZONE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Brand accent color">
                      <div className="flex items-center gap-3">
                        <input aria-label="Brand color" type="color" value={draft.brand_color} onChange={(e) => setDraft((d) => ({ ...d, brand_color: e.target.value }))} className="h-10 w-14 rounded-md border border-border bg-background" />
                        <Input value={draft.brand_color} onChange={(e) => setDraft((d) => ({ ...d, brand_color: e.target.value }))} />
                      </div>
                    </Field>
                  </div>
                  <Field label="Logo URL" hint="Optional. Publicly accessible URL to your company logo.">
                    <Input value={draft.logo_url} onChange={(e) => setDraft((d) => ({ ...d, logo_url: e.target.value }))} placeholder="https://…" />
                  </Field>
                  <StepFooter onBack={goBack} onNext={handleSaveTargets} nextLabel={saving ? "Saving…" : "Save & continue"} nextDisabled={saving || !isTargetsStepValid(draft)} />
                </div>
              )}

              {step === "team" && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{setup.teamMemberCount} member{setup.teamMemberCount === 1 ? "" : "s"}</Badge>
                    {setup.mappedRepCount > 0 && <Badge variant="outline">{setup.mappedRepCount} mapped to Aloware</Badge>}
                  </div>
                  <div className="rounded-[10px] border border-border bg-background/50 p-4">
                    <TeamMembersManager />
                  </div>
                  <StepFooter
                    onBack={goBack}
                    onNext={() => markTeamReviewed(false)}
                    nextLabel={saving ? "Saving…" : "Continue with current team"}
                    nextDisabled={saving}
                    secondary={{ label: "Skip for now", onClick: () => markTeamReviewed(true), disabled: saving }}
                  />
                </div>
              )}

              {step === "systems" && (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-3">
                    <SystemChoice
                      title="Aloware"
                      description="Sync calls, SMS, and user mapping automatically."
                      status={setup.settings?.crm_provider === "aloware" && setup.settings?.crm_connected_at ? "Connected" : setup.settings?.crm_provider === "aloware" ? "Selected — connect in Team Settings" : undefined}
                      onSelect={() => chooseSystem("aloware")}
                      disabled={saving}
                    />
                    <SystemChoice
                      title="GoHighLevel"
                      description="Receive pipeline events through GHL webhooks."
                      status={setup.settings?.crm_provider === "gohighlevel" && setup.settings?.crm_connected_at ? "Connected" : setup.settings?.crm_provider === "gohighlevel" ? "Selected — configure webhook" : undefined}
                      onSelect={() => chooseSystem("gohighlevel")}
                      disabled={saving}
                    />
                    <SystemChoice
                      title="Operate manually"
                      description="Log calls and deals from within PitchViper."
                      status={setup.settings?.crm_provider === "manual" ? "Selected" : undefined}
                      onSelect={() => chooseSystem("manual")}
                      disabled={saving}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A connection isn't confirmed until we receive a successful verification or sync from the provider.
                  </p>
                  <StepFooter
                    onBack={goBack}
                    onNext={goNext}
                    nextLabel="Continue"
                    nextDisabled={false}
                    secondary={{ label: "Defer connection", onClick: deferSystems, disabled: saving }}
                  />
                </div>
              )}

              {step === "review" && (
                <div className="space-y-5">
                  <ul className="divide-y divide-border rounded-[10px] border border-border overflow-hidden">
                    {STEP_ORDER.map((id) => {
                      const s = preview.steps.find((x) => x.id === id)!;
                      const meta = STEP_META[id];
                      const badge = s.complete
                        ? <Badge variant="outline" className="border-success/30 text-success">Complete</Badge>
                        : s.deferred
                          ? <Badge variant="outline" className="text-muted-foreground">Deferred</Badge>
                          : <Badge variant="outline" className="border-destructive/30 text-destructive">Needs input</Badge>;
                      return (
                        <li key={id} className="flex items-center justify-between gap-4 p-4 bg-background/40">
                          <div>
                            <p className="text-sm font-medium text-foreground">{meta.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {badge}
                            <Button variant="ghost" size="sm" onClick={() => goToStep(id)}>Edit</Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {!persistedProgress.canComplete && (
                    <p className="text-xs text-destructive">Company details and targets are required before completing setup.</p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <Button variant="ghost" onClick={goBack} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
                    <Button onClick={handleComplete} disabled={completing || !persistedProgress.canComplete} className="gap-2">
                      {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Complete setup
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  secondary,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
      ) : <span />}
      <div className="flex items-center gap-2">
        {secondary && (
          <Button variant="outline" onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</Button>
        )}
        <Button onClick={onNext} disabled={nextDisabled} className="gap-2">
          {nextLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SystemChoice({ title, description, status, onSelect, disabled }: { title: string; description: string; status?: string; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="text-left rounded-[10px] border border-border bg-background/50 p-4 hover:border-primary/40 hover:bg-background transition-colors disabled:opacity-60"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {status && <p className="mt-3 text-[11px] uppercase tracking-wider text-primary">{status}</p>}
    </button>
  );
}
