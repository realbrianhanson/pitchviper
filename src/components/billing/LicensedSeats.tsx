import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const MIN = 5;
const MAX = 500;

export function LicensedSeats() {
  const { data: ent, refetch } = useEntitlement();
  const { canManageTeam } = useAuth();
  const qc = useQueryClient();
  const initial = ent?.seat_limit && ent.seat_limit > 0 ? ent.seat_limit : Math.max(MIN, ent?.used_seats ?? MIN);
  const [seats, setSeats] = useState<number>(initial);
  const [pending, setPending] = useState(false);

  if (!ent) return null;
  const used = ent.used_seats;

  if (ent.reason === "trial") {
    return (
      <section className="editorial-tile p-6 md:p-8">
        <div className="eyebrow mb-2">Licensed seats</div>
        <p className="text-muted-foreground">
          Up to <span className="text-foreground">25 teammates</span> during trial. Choose a plan below to
          lock in permanent seats.
        </p>
        <p className="mt-2 text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
          {used} / 25 seats used
        </p>
      </section>
    );
  }

  if (!ent.access || ent.seat_limit === 0) return null;

  const disabled = !canManageTeam || pending || seats === ent.seat_limit;
  const clamped = Math.max(Math.max(MIN, used), Math.min(MAX, seats));

  const submit = async () => {
    if (!canManageTeam) return;
    setPending(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-stripe-seats", {
        body: { seats: clamped },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success(`Seats updated to ${(data as { seats: number }).seats}`);
      await refetch();
      qc.invalidateQueries({ queryKey: ["billing"] });
    } catch (err) {
      const msg = (err as Error).message ?? "Unable to update seats";
      const nice =
        msg === "seats_below_used"
          ? "You can't reduce below current team size."
          : msg === "no_subscription"
          ? "No active subscription."
          : msg === "forbidden"
          ? "Only managers can update seats."
          : "Unable to update seats.";
      toast.error(nice);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="editorial-tile p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">Licensed seats</div>
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-mono">{used}</span> used of{" "}
            <span className="text-foreground font-mono">{ent.seat_limit}</span> licensed.
            {" "}Add licenses before inviting new teammates. Reductions can't go below current members.
          </p>
        </div>
        {canManageTeam ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={Math.max(MIN, used)}
              max={MAX}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value) || 0)}
              className="w-24 h-10 border border-border bg-background px-3 font-mono text-sm text-right"
              aria-label="Licensed seats"
            />
            <Button onClick={submit} disabled={disabled} size="sm">
              {pending ? "Updating…" : "Update seats"}
            </Button>
          </div>
        ) : (
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Ask a manager to add seats
          </p>
        )}
      </div>
    </section>
  );
}
