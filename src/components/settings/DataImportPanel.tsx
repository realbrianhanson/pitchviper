import { Upload, ClipboardList } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardDescription, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";

/**
 * Data import panel.
 *
 * PitchViper does not currently ship a generic CSV importer or a
 * public inbound-webhook contract, so this tab intentionally shows a
 * refined manual-workflow explanation rather than a fake feature.
 * Add real capabilities here only when they exist server-side.
 */
export function DataImportPanel() {
  return (
    <ViperCard>
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Data import
        </ViperCardTitle>
        <ViperCardDescription>
          How call activity and pipeline data reach PitchViper.
        </ViperCardDescription>
      </ViperCardHeader>
      <ViperCardContent className="space-y-5">
        <div className="border border-border bg-background/40 p-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Current capability
          </p>
          <p className="font-display text-lg">Manual workflow</p>
          <p className="text-sm text-muted-foreground">
            Reps log calls, dispositions and deal movement directly inside PitchViper.
            All coaching, gamification and pipeline analytics work on that data today.
          </p>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <ClipboardList className="h-4 w-4 mt-[3px] text-primary shrink-0" />
            <span>
              <span className="text-foreground">Log a call</span> from the top-nav Log call
              action or from the dial handoff — contact, company and number are
              pre-filled. Dispositions feed daily stats and streaks.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <ClipboardList className="h-4 w-4 mt-[3px] text-primary shrink-0" />
            <span>
              <span className="text-foreground">Deals + coaching</span> continue to work
              independently of any external phone system.
            </span>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground">
          A native Dialer.io sync will appear here once an official integration contract
          is available. Until then, keep operating in Dialer.io directly and PitchViper
          picks up the pipeline outcomes you log.
        </p>
      </ViperCardContent>
    </ViperCard>
  );
}
