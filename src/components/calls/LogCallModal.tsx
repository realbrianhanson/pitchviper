import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  Clock, 
  Check, 
  Voicemail, 
  PhoneOff, 
  XCircle,
  CalendarIcon,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search
} from 'lucide-react';
import { useCallLogging, CallFormData, CallDirection, CallOutcome, CallPurpose } from '@/hooks/useCallLogging';
import { ResearchButton } from '@/components/research/ResearchButton';
import { fireGoldCelebration } from '@/components/ui/gold-celebration';

export interface LogCallInitialData {
  contactName?: string;
  companyName?: string;
  phoneNumber?: string;
  direction?: CallDirection;
}

interface LogCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: LogCallInitialData;
}

const QUICK_DURATIONS = [
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min+', seconds: 1800 },
];

const DISPOSITIONS = [
  { value: 'appointment_set', label: 'Appointment Set', icon: '📅' },
  { value: 'callback_scheduled', label: 'Callback Scheduled', icon: '🔄' },
  { value: 'not_interested', label: 'Not Interested', icon: '👎' },
  { value: 'deal_closed', label: 'Deal Closed', icon: '🎉' },
  { value: 'deal_lost', label: 'Deal Lost', icon: '😔' },
  { value: 'info_sent', label: 'Info Sent', icon: '📧' },
  { value: 'no_decision', label: 'No Decision', icon: '🤔' },
];

const CALL_PURPOSES: { value: CallPurpose; label: string }[] = [
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'demo', label: 'Demo' },
  { value: 'closing', label: 'Closing Call' },
  { value: 'support', label: 'Support' },
];

export function LogCallModal({ open, onOpenChange, initialData }: LogCallModalProps) {
  const { logCall, isLogging, commonObjections } = useCallLogging();
  const [step, setStep] = useState(1);
  
  // Form state
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [direction, setDirection] = useState<CallDirection>('outbound');
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome>('connected');
  
  // Step 2
  const [callPurpose, setCallPurpose] = useState<CallPurpose>('cold_call');
  const [disposition, setDisposition] = useState('');
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [callbackDate, setCallbackDate] = useState<Date>();
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 3
  const [selfRating, setSelfRating] = useState(0);
  const [selectedObjections, setSelectedObjections] = useState<string[]>([]);
  const [improvementNotes, setImprovementNotes] = useState('');

  const resetForm = () => {
    setStep(1);
    setContactName('');
    setCompanyName('');
    setPhoneNumber('');
    setDirection('outbound');
    setDurationSeconds(300);
    setCustomMinutes('');
    setCustomSeconds('');
    setOutcome('connected');
    setCallPurpose('cold_call');
    setDisposition('');
    setAppointmentDate(undefined);
    setCallbackDate(undefined);
    setDealValue('');
    setNotes('');
    setSelfRating(0);
    setSelectedObjections([]);
    setImprovementNotes('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const formData: CallFormData = {
      contactName,
      companyName,
      phoneNumber,
      direction,
      durationSeconds: customMinutes || customSeconds 
        ? (parseInt(customMinutes || '0') * 60) + parseInt(customSeconds || '0')
        : durationSeconds,
      outcome,
      callPurpose: outcome === 'connected' ? callPurpose : undefined,
      disposition: outcome === 'connected' ? disposition : undefined,
      appointmentScheduledAt: disposition === 'appointment_set' ? appointmentDate : undefined,
      callbackScheduledAt: disposition === 'callback_scheduled' ? callbackDate : undefined,
      dealValue: disposition === 'deal_closed' ? parseFloat(dealValue) : undefined,
      notes: notes || undefined,
      selfRating: selfRating > 0 ? selfRating : undefined,
      struggledObjections: selectedObjections.length > 0 ? selectedObjections : undefined,
      improvementNotes: improvementNotes || undefined,
    };

    const isWin = disposition === 'deal_closed';
    logCall(formData, {
      onSuccess: () => {
        if (isWin) fireGoldCelebration();
        handleClose();
      }
    });
  };

  const canProceedStep1 = contactName.trim().length > 0;
  const canProceedStep2 = outcome !== 'connected' || (callPurpose && disposition);
  const totalSteps = outcome === 'connected' ? 3 : 2;

  const toggleObjection = (objection: string) => {
    setSelectedObjections(prev => 
      prev.includes(objection) 
        ? prev.filter(o => o !== objection)
        : [...prev, objection]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50 max-h-[90dvh] overflow-y-auto p-4 sm:p-6 w-[calc(100%-1.5rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Phone className="h-5 w-5 text-primary" />
            Log a Call
          </DialogTitle>
          {/* Progress indicator */}
          <div className="flex items-center gap-2 pt-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i + 1 <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="John Smith"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="bg-background/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company</Label>
                  <Input
                    id="companyName"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              </div>

              {/* Research Button */}
              {(companyName || contactName) && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <Search className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground flex-1">
                    Research this prospect before your call
                  </span>
                  <ResearchButton 
                    companyName={companyName}
                    contactName={contactName}
                    variant="default"
                    size="sm"
                  />
                </div>
              )}

              {/* Direction Toggle */}
              <div className="space-y-2">
                <Label>Call Direction</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection('outbound')}
                    className={cn(
                      "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                      direction === 'outbound'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/50 hover:border-primary/50"
                    )}
                  >
                    <PhoneOutgoing className="h-5 w-5" />
                    <span className="font-medium">Outbound</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('inbound')}
                    className={cn(
                      "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                      direction === 'inbound'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/50 hover:border-primary/50"
                    )}
                  >
                    <PhoneIncoming className="h-5 w-5" />
                    <span className="font-medium">Inbound</span>
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Call Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_DURATIONS.map((d) => (
                    <button
                      key={d.seconds}
                      type="button"
                      onClick={() => {
                        setDurationSeconds(d.seconds);
                        setCustomMinutes('');
                        setCustomSeconds('');
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all",
                        durationSeconds === d.seconds && !customMinutes && !customSeconds
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background/50 hover:border-primary/50"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Or custom:</span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-20 bg-background/50"
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    placeholder="Sec"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(e.target.value)}
                    className="w-20 bg-background/50"
                  />
                </div>
              </div>

              {/* Outcome */}
              <div className="space-y-2">
                <Label>Outcome</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'connected', label: 'Connected', icon: Check, color: 'text-success' },
                    { value: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'text-warning' },
                    { value: 'no_answer', label: 'No Answer', icon: PhoneOff, color: 'text-muted-foreground' },
                    { value: 'wrong_number', label: 'Wrong Number', icon: XCircle, color: 'text-destructive' },
                  ].map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOutcome(o.value as CallOutcome)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        outcome === o.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50 hover:border-primary/50"
                      )}
                    >
                      <o.icon className={cn("h-4 w-4", o.color)} />
                      <span className="font-medium">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Call Details (only if connected) */}
          {step === 2 && outcome === 'connected' && (
            <div className="space-y-6 animate-fade-in">
              {/* Call Purpose */}
              <div className="space-y-2">
                <Label>Call Purpose</Label>
                <div className="flex flex-wrap gap-2">
                  {CALL_PURPOSES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setCallPurpose(p.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg border transition-all",
                        callPurpose === p.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background/50 hover:border-primary/50"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Disposition */}
              <div className="space-y-2">
                <Label>Disposition</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DISPOSITIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDisposition(d.value)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left",
                        disposition === d.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50 hover:border-primary/50"
                      )}
                    >
                      <span className="text-lg">{d.icon}</span>
                      <span className="font-medium text-sm">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional fields based on disposition */}
              {disposition === 'appointment_set' && (
                <div className="space-y-2">
                  <Label>Appointment Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !appointmentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {appointmentDate ? format(appointmentDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={appointmentDate}
                        onSelect={setAppointmentDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {disposition === 'callback_scheduled' && (
                <div className="space-y-2">
                  <Label>Callback Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background/50",
                          !callbackDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {callbackDate ? format(callbackDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={callbackDate}
                        onSelect={setCallbackDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {disposition === 'deal_closed' && (
                <div className="space-y-2">
                  <Label htmlFor="dealValue">Deal Value ($)</Label>
                  <Input
                    id="dealValue"
                    type="number"
                    placeholder="10000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Key points from the call..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background/50 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 2/3: Self Assessment */}
          {((step === 2 && outcome !== 'connected') || (step === 3 && outcome === 'connected')) && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center pb-2">
                <h3 className="text-lg font-semibold">Quick Self-Assessment</h3>
                <p className="text-sm text-muted-foreground">Optional but helps track your growth</p>
              </div>

              {/* Star Rating */}
              <div className="space-y-2">
                <Label>Rate Your Performance</Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setSelfRating(rating)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          rating <= selfRating
                            ? "fill-warning text-warning"
                            : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Objections */}
              <div className="space-y-2">
                <Label>Any objections you struggled with?</Label>
                <div className="flex flex-wrap gap-2">
                  {commonObjections.map((objection) => (
                    <Badge
                      key={objection}
                      variant={selectedObjections.includes(objection) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedObjections.includes(objection)
                          ? "bg-primary hover:bg-primary/80"
                          : "hover:bg-primary/10"
                      )}
                      onClick={() => toggleObjection(objection)}
                    >
                      {objection}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Improvement Notes */}
              <div className="space-y-2">
                <Label htmlFor="improvementNotes">What would you do differently?</Label>
                <Textarea
                  id="improvementNotes"
                  placeholder="Next time I would..."
                  value={improvementNotes}
                  onChange={(e) => setImprovementNotes(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
            disabled={isLogging}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLogging || !canProceedStep1}
              className="min-w-[120px]"
            >
              {isLogging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Log Call
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
