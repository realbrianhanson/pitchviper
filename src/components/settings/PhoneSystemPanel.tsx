import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Phone, ClipboardList, Check, Lock } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardDescription, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceSetup } from "@/hooks/useWorkspaceSetup";
import { toast } from "sonner";
import {
  SALES_SYSTEM_REGISTRY,
  type SalesSystemId,
  normalizeSalesSystem,
  toCrmProviderValue,
  getSalesSystem,
} from "@/lib/salesSystem";
import { cn } from "@/lib/utils";

const SELECTABLE_ORDER: SalesSystemId[] = ["dialer_io", "manual"];

export function PhoneSystemPanel() {
  const { canManageTeam } = useAuth();
  const setup = useWorkspaceSetup();

  const current = useMemo(
    () => normalizeSalesSystem(setup.settings?.crm_provider),
    [setup.settings?.crm_provider],
  );
  const currentMeta = getSalesSystem(setup.settings?.crm_provider);
  const isLegacy = current === "legacy_aloware";

  const handleSelect = async (id: SalesSystemId) => {
    if (!canManageTeam) return;
    try {
      await setup.save(
        { crm_provider: toCrmProviderValue(id) },
        { action: "phone_system_selected", metadata: { provider: id } },
      );
      await setup.patchState({ systems_reviewed: true, systems_deferred: false });
      toast.success(`${SALES_SYSTEM_REGISTRY[id].label} selected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save selection");
    }
  };

  const openDialerIo = () => {
    window.open("https://app.dialer.io", "_blank", "noopener,noreferrer");
  };

  if (setup.isLoading) {
    return (
      <ViperCard>
        <ViperCardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <div className="space-y-6">
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Phone system
          </ViperCardTitle>
          <ViperCardDescription>
            Pick where your reps make calls. PitchViper handles coaching, deals and
            analytics — your phone system handles the dialing.
          </ViperCardDescription>
        </ViperCardHeader>
        <ViperCardContent className="space-y-6">
          {/* Current status strip */}
          <div className="flex items-start justify-between gap-4 border border-border bg-background/40 p-4">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Currently selected
              </p>
              <p className="font-display text-xl">{currentMeta.label}</p>
              <p className="text-sm text-muted-foreground">{currentMeta.selectedStatus}</p>
            </div>
            {!canManageTeam && (
              <Badge variant="outline" className="gap-1 shrink-0">
                <Lock className="h-3 w-3" /> Manager only
              </Badge>
            )}
          </div>

          {isLegacy && (
            <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
              Your workspace was previously wired to an external call sync that has been
              retired. Historical data is preserved. Choose Dialer.io or manual below to
              keep operating.
            </div>
          )}

          {/* Selectable systems */}
          <div className="grid gap-3 md:grid-cols-2">
            {SELECTABLE_ORDER.map((id) => {
              const meta = SALES_SYSTEM_REGISTRY[id];
              const isSelected = current === id;
              return (
                <motion.button
                  type="button"
                  key={id}
                  whileHover={canManageTeam ? { y: -1 } : undefined}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  disabled={!canManageTeam || setup.isSaving}
                  onClick={() => handleSelect(id)}
                  className={cn(
                    "text-left border p-5 space-y-3 transition-colors",
                    isSelected
                      ? "border-primary bg-primary/[0.04]"
                      : "border-border hover:border-primary/40",
                    (!canManageTeam || setup.isSaving) && "opacity-70 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-display text-lg leading-tight">{meta.label}</p>
                      {meta.recommended && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-sm bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{meta.tagline}</p>
                  {!meta.hasNativeAdapter && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
                      Native sync requires an integration handoff
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={openDialerIo}
            >
              <ExternalLink className="h-4 w-4" />
              Open Dialer.io
            </Button>
            {canManageTeam && current !== "manual" && (
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground"
                onClick={() => handleSelect("manual")}
                disabled={setup.isSaving}
              >
                <ClipboardList className="h-4 w-4" />
                Use manual logging for now
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            PitchViper does not store any credentials for your phone system. When a native
            adapter is available we will surface an explicit connect step here.
          </p>
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}
