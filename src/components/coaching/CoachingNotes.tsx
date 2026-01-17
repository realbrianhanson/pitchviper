import { useState } from "react";
import { CoachingSession } from "@/hooks/useCoaching";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Plus, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  CheckCircle,
  Target
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface CoachingNotesProps {
  sessions: CoachingSession[];
  isLoading: boolean;
  onSave: (session: {
    notes: string;
    focus_areas: string[];
    action_items: string[];
    next_session_date?: string;
  }) => void;
  isSaving: boolean;
}

export function CoachingNotes({ sessions, isLoading, onSave, isSaving }: CoachingNotesProps) {
  const [notes, setNotes] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [newFocusArea, setNewFocusArea] = useState('');
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  const [nextSessionDate, setNextSessionDate] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const handleAddFocusArea = () => {
    if (newFocusArea.trim()) {
      setFocusAreas(prev => [...prev, newFocusArea.trim()]);
      setNewFocusArea('');
    }
  };

  const handleRemoveFocusArea = (index: number) => {
    setFocusAreas(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems(prev => [...prev, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!notes.trim()) return;
    onSave({
      notes: notes.trim(),
      focus_areas: focusAreas,
      action_items: actionItems,
      next_session_date: nextSessionDate || undefined,
    });
    // Reset form
    setNotes('');
    setFocusAreas([]);
    setActionItems([]);
    setNextSessionDate('');
  };

  if (isLoading) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Coaching Notes
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Coaching Notes
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
        {/* New Coaching Session Form */}
        <div className="space-y-3 md:space-y-4 p-3 md:p-4 rounded-lg bg-muted/30 border border-border">
          <div>
            <Label htmlFor="notes">Session Notes</Label>
            <Textarea
              id="notes"
              placeholder="Write your coaching notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] mt-1"
            />
          </div>

          {/* Focus Areas */}
          <div>
            <Label>Focus Areas</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Add focus area..."
                value={newFocusArea}
                onChange={(e) => setNewFocusArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocusArea())}
              />
              <ViperButton 
                type="button" 
                size="icon" 
                variant="outline"
                onClick={handleAddFocusArea}
              >
                <Plus className="h-4 w-4" />
              </ViperButton>
            </div>
            {focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {focusAreas.map((area, i) => (
                  <ViperBadge key={i} variant="secondary" className="pr-1">
                    {area}
                    <button
                      onClick={() => handleRemoveFocusArea(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </ViperBadge>
                ))}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div>
            <Label>Action Items</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Add action item..."
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActionItem())}
              />
              <ViperButton 
                type="button" 
                size="icon" 
                variant="outline"
                onClick={handleAddActionItem}
              >
                <Plus className="h-4 w-4" />
              </ViperButton>
            </div>
            {actionItems.length > 0 && (
              <div className="space-y-1 mt-2">
                {actionItems.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border"
                  >
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{item}</span>
                    <button
                      onClick={() => handleRemoveActionItem(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Session Date */}
          <div>
            <Label htmlFor="nextSession">Next Session Date (Optional)</Label>
            <Input
              id="nextSession"
              type="date"
              value={nextSessionDate}
              onChange={(e) => setNextSessionDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <ViperButton
            onClick={handleSave}
            disabled={!notes.trim() || isSaving}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Coaching Session'}
          </ViperButton>
        </div>

        {/* Previous Sessions */}
        <div>
          <h4 className="font-medium mb-3 text-sm md:text-base">Previous Sessions</h4>
          <ScrollArea className="h-[250px] md:h-[300px] pr-2 md:pr-3">
            {sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => setExpandedSessionId(
                        expandedSessionId === session.id ? null : session.id
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {format(parseISO(session.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {expandedSessionId === session.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {expandedSessionId === session.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                        </div>

                        {session.focus_areas?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Focus Areas:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {session.focus_areas.map((area, i) => (
                                <ViperBadge key={i} variant="secondary" size="sm">
                                  {area}
                                </ViperBadge>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.action_items?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Action Items:
                            </p>
                            <div className="space-y-1">
                              {session.action_items.map((item, i) => (
                                <div 
                                  key={i}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="text-muted-foreground">•</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {session.next_session_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Next session: {format(parseISO(session.next_session_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                No previous coaching sessions
              </p>
            )}
          </ScrollArea>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
