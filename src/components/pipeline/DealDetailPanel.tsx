import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  Building2,
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Edit,
  Trash2,
  X,
  Search,
  History,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STAGE_CONFIG, type Deal, type DealStageHistoryEntry } from '@/hooks/useDealPipeline';
import { ResearchButton } from '@/components/research/ResearchButton';
import { DealCoachPanel } from '@/components/pipeline/DealCoachPanel';
import { ClickToDialButton } from '@/components/calls/ClickToDialButton';
import { SendSMSButton } from '@/components/calls/SendSMSButton';
// Legacy Aloware push retired — deals stay in PitchViper's pipeline.
import { cn } from '@/lib/utils';

interface DealDetailPanelProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
  fetchHistory: (dealId: string) => Promise<DealStageHistoryEntry[]>;
}

export function DealDetailPanel({
  deal,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  fetchHistory,
}: DealDetailPanelProps) {
  const [history, setHistory] = useState<DealStageHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Push-to-Aloware retired: keep deal data inside PitchViper.


  useEffect(() => {
    if (deal && open) {
      setIsLoadingHistory(true);
      fetchHistory(deal.id)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setIsLoadingHistory(false));
    }
  }, [deal?.id, open, fetchHistory]);

  if (!deal) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));

  const getMomentumDisplay = () => {
    if (deal.momentum_score >= 70) {
      return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: TrendingUp, label: 'High Momentum' };
    } else if (deal.momentum_score >= 40) {
      return { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Minus, label: 'Medium Momentum' };
    } else {
      return { color: 'text-red-400', bg: 'bg-red-500/20', icon: TrendingDown, label: 'Low Momentum' };
    }
  };

  const momentum = getMomentumDisplay();
  const MomentumIcon = momentum.icon;

  const stageConfig = STAGE_CONFIG[deal.stage];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {deal.company_name}
              </SheetTitle>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-6">
              {/* Deal Value and Stage */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Deal Value</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatCurrency(Number(deal.deal_value))}</p>
                </div>
                <Badge className={cn('px-3 py-1', stageConfig.color, 'text-white')}>
                  {stageConfig.label}
                </Badge>
              </div>

              {/* Momentum Score */}
              <div className={cn('flex items-center gap-3 p-3 rounded-lg', momentum.bg)}>
                <MomentumIcon className={cn('h-5 w-5', momentum.color)} />
                <div>
                  <p className={cn('font-medium', momentum.color)}>{momentum.label}</p>
                  <p className="text-xs text-muted-foreground">Score: {deal.momentum_score}/100</p>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.contact_name}</span>
                  </div>
                  {deal.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{deal.contact_email}</span>
                    </div>
                  )}
                  {deal.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{deal.contact_phone}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <ClickToDialButton
                          phoneNumber={deal.contact_phone}
                          contactName={deal.contact_name}
                          companyName={deal.company_name}
                          dealId={deal.id}
                          size="sm"
                        />
                        <SendSMSButton
                          phoneNumber={deal.contact_phone}
                          contactName={deal.contact_name}
                          companyName={deal.company_name}
                          dealId={deal.id}
                          size="sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Deal Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Probability</p>
                    <p className="font-medium">{deal.probability}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Days in Stage</p>
                    <p className={cn('font-medium', daysInStage > 14 ? 'text-red-400' : daysInStage > 7 ? 'text-amber-400' : '')}>
                      {daysInStage} days
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected Close</p>
                    <p className="font-medium">
                      {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'MMM d, yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deal Type</p>
                    <p className="font-medium capitalize">{deal.deal_type.replace('_', ' ')}</p>
                  </div>
                  {deal.source && (
                    <div>
                      <p className="text-muted-foreground">Source</p>
                      <p className="font-medium">{deal.source}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(deal.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>

              {deal.notes && (
                <>
              <Separator />

              {/* AI Deal Coach */}
              <DealCoachPanel dealId={deal.id} />

              <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h4>
                    <p className="text-sm">{deal.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Stage History */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Stage History
                </h4>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">
                            {entry.from_stage ? (
                              <>
                                {STAGE_CONFIG[entry.from_stage as keyof typeof STAGE_CONFIG]?.label || entry.from_stage}
                                {' → '}
                              </>
                            ) : 'Created in '}
                          </span>
                          <span className="font-medium">
                            {STAGE_CONFIG[entry.to_stage as keyof typeof STAGE_CONFIG]?.label || entry.to_stage}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.changed_at), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 py-2">— No history —</p>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(deal)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Deal
              </Button>
              <ResearchButton
                companyName={deal.company_name}
                contactName={deal.contact_name}
                variant="outline"
              />
            </div>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Deal
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(deal.id);
                setShowDeleteDialog(false);
                onOpenChange(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
