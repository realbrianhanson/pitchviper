import { LogCallModal } from '@/components/calls/LogCallModal';
import { useClickToDialContext } from '@/contexts/ClickToDialContext';

/**
 * Global LogCallModal instance driven by ClickToDialContext.
 *
 * Mounted once at app root so any component (e.g. the DialModal handoff)
 * can request the manual-log form without owning modal state locally.
 */
export function GlobalLogCallModal() {
  const { isManualLogOpen, manualLogInitial, closeManualLog } = useClickToDialContext();
  return (
    <LogCallModal
      open={isManualLogOpen}
      onOpenChange={(open) => {
        if (!open) closeManualLog();
      }}
      initialData={manualLogInitial ?? undefined}
    />
  );
}
