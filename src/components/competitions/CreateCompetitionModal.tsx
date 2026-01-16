import { useState } from "react";
import { Trophy, Calendar, Users, Gift, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateCompetitionData, MetricType } from "@/hooks/useCompetitions";
import { format, addDays, endOfDay, endOfWeek, endOfMonth } from "date-fns";

interface CreateCompetitionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompetitionData) => Promise<void>;
}

type Step = 1 | 2 | 3 | 4;

const metricOptions: { value: MetricType; label: string; description: string }[] = [
  { value: 'calls', label: 'Calls Made', description: 'Total outbound and inbound calls' },
  { value: 'appointments', label: 'Appointments Set', description: 'Number of appointments scheduled' },
  { value: 'revenue', label: 'Revenue Closed', description: 'Total revenue from closed deals' },
  { value: 'deals', label: 'Deals Closed', description: 'Number of deals closed' },
  { value: 'roleplay', label: 'Roleplay Score', description: 'Average roleplay session score' },
];

const durationPresets = [
  { label: 'End of Today', getValue: () => endOfDay(new Date()).toISOString() },
  { label: 'End of Week', getValue: () => endOfWeek(new Date()).toISOString() },
  { label: 'End of Month', getValue: () => endOfMonth(new Date()).toISOString() },
  { label: 'Custom', getValue: () => '' },
];

export function CreateCompetitionModal({ open, onClose, onSubmit }: CreateCompetitionModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(endOfWeek(new Date()).toISOString().slice(0, 16));
  const [durationPreset, setDurationPreset] = useState('End of Week');

  const [metricType, setMetricType] = useState<MetricType>('calls');
  const [qualifyingThreshold, setQualifyingThreshold] = useState('');
  const [isTeamWide, setIsTeamWide] = useState(true);

  const [prizeDescription, setPrizeDescription] = useState('');
  const [prizeValue, setPrizeValue] = useState('');
  const [numberOfWinners, setNumberOfWinners] = useState('1');

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setStartDate(new Date().toISOString().slice(0, 16));
    setEndDate(endOfWeek(new Date()).toISOString().slice(0, 16));
    setDurationPreset('End of Week');
    setMetricType('calls');
    setQualifyingThreshold('');
    setIsTeamWide(true);
    setPrizeDescription('');
    setPrizeValue('');
    setNumberOfWinners('1');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDurationPreset = (preset: string) => {
    setDurationPreset(preset);
    const presetOption = durationPresets.find(p => p.label === preset);
    if (presetOption && preset !== 'Custom') {
      setEndDate(presetOption.getValue().slice(0, 16));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        metric_type: metricType,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        prize_description: prizeDescription || undefined,
        prize_value: prizeValue ? parseFloat(prizeValue) : undefined,
        number_of_winners: parseInt(numberOfWinners),
        qualifying_threshold: qualifyingThreshold ? parseInt(qualifyingThreshold) : undefined,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim() && description.trim() && startDate && endDate;
      case 2: return metricType;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Create Competition
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  s < step 
                    ? 'bg-success text-success-foreground' 
                    : s === step 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-0.5 mx-1 ${s < step ? 'bg-success' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              Step 1: Basic Information
            </div>

            <div className="space-y-2">
              <Label>Competition Name</Label>
              <Input
                placeholder="e.g., January Sprint, Friday Frenzy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the competition and its goals..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {durationPresets.map((preset) => (
                  <ViperButton
                    key={preset.label}
                    variant={durationPreset === preset.label ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDurationPreset(preset.label)}
                  >
                    {preset.label}
                  </ViperButton>
                ))}
              </div>
              {durationPreset === 'Custom' && (
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              )}
              {durationPreset !== 'Custom' && (
                <p className="text-sm text-muted-foreground">
                  Ends: {format(new Date(endDate), 'PPP p')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Rules */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Trophy className="h-4 w-4" />
              Step 2: Competition Rules
            </div>

            <div className="space-y-2">
              <Label>Metric Type</Label>
              <div className="grid gap-2">
                {metricOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      metricType === option.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setMetricType(option.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {metricType === option.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Qualifying Threshold (Optional)</Label>
              <Input
                type="number"
                placeholder={`e.g., Must have at least X ${metricType}`}
                value={qualifyingThreshold}
                onChange={(e) => setQualifyingThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Participants must reach this minimum to qualify for prizes
              </p>
            </div>

            <div className="space-y-2">
              <Label>Participation</Label>
              <div className="flex gap-2">
                <ViperButton
                  variant={isTeamWide ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setIsTeamWide(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Whole Team
                </ViperButton>
                <ViperButton
                  variant={!isTeamWide ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setIsTeamWide(false)}
                  disabled
                >
                  Select Members
                </ViperButton>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Prize */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Gift className="h-4 w-4" />
              Step 3: Prize Information
            </div>

            <div className="space-y-2">
              <Label>Prize Description (Optional)</Label>
              <Textarea
                placeholder="e.g., Extra day off + $500 bonus, Dinner at a fancy restaurant"
                rows={3}
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prize Value (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder="e.g., 500"
                  value={prizeValue}
                  onChange={(e) => setPrizeValue(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Number of Winners</Label>
              <Select value={numberOfWinners} onValueChange={setNumberOfWinners}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Place Only</SelectItem>
                  <SelectItem value="3">Top 3</SelectItem>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Check className="h-4 w-4" />
              Step 4: Review & Launch
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{name}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ViperBadge variant="default">Preview</ViperBadge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Metric</p>
                  <p className="font-medium">{metricOptions.find(m => m.value === metricType)?.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Winners</p>
                  <p className="font-medium">Top {numberOfWinners}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Threshold</p>
                  <p className="font-medium">{qualifyingThreshold || 'None'}</p>
                </div>
              </div>

              {prizeDescription && (
                <div className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20">
                  <Gift className="h-4 w-4 text-success" />
                  <span className="text-sm text-success">{prizeDescription}</span>
                  {prizeValue && (
                    <ViperBadge variant="success" size="sm">${prizeValue}</ViperBadge>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              All team members will be notified when this competition launches.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <ViperButton variant="outline" onClick={() => setStep((step - 1) as Step)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </ViperButton>
          ) : (
            <ViperButton variant="outline" onClick={handleClose}>
              Cancel
            </ViperButton>
          )}

          {step < 4 ? (
            <ViperButton onClick={() => setStep((step + 1) as Step)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </ViperButton>
          ) : (
            <ViperButton onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Launch Competition
                </>
              )}
            </ViperButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
