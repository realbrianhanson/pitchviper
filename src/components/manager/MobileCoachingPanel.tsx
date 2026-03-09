import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Mic, 
  MicOff, 
  Send,
  Calendar,
  BookOpen,
  MessageCircle,
  Phone,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperCard } from "@/components/ui/viper-card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  current_level: number;
  xp_points: number;
  current_streak: number;
}

interface MobileCoachingPanelProps {
  teamMembers: TeamMember[];
  onClose?: () => void;
}

export function MobileCoachingPanel({ teamMembers, onClose }: MobileCoachingPanelProps) {
  const { user, profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [coachingNote, setCoachingNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [repStats, setRepStats] = useState<{
    callsToday: number;
    appointmentsToday: number;
    trend: "up" | "down" | "neutral";
  } | null>(null);

  const { 
    isSupported, 
    isRecording, 
    transcript, 
    startRecording, 
    stopRecording 
  } = useSpeechToText({
    onResult: (text) => {
      setCoachingNote(prev => prev + (prev ? " " : "") + text);
    }
  });

  const currentRep = teamMembers[currentIndex];

  // Fetch rep stats
  useEffect(() => {
    const fetchRepStats = async () => {
      if (!currentRep) return;

      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("daily_stats")
        .select("calls_made, appointments_set")
        .eq("user_id", currentRep.user_id)
        .eq("date", today)
        .maybeSingle();

      // Get yesterday's stats for trend
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const { data: yesterdayData } = await supabase
        .from("daily_stats")
        .select("calls_made")
        .eq("user_id", currentRep.user_id)
        .eq("date", yesterday)
        .maybeSingle();

      const todayCalls = data?.calls_made || 0;
      const yesterdayCalls = yesterdayData?.calls_made || 0;

      setRepStats({
        callsToday: todayCalls,
        appointmentsToday: data?.appointments_set || 0,
        trend: todayCalls > yesterdayCalls ? "up" : todayCalls < yesterdayCalls ? "down" : "neutral"
      });
    };

    fetchRepStats();
  }, [currentRep]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : teamMembers.length - 1));
    setCoachingNote("");
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < teamMembers.length - 1 ? prev + 1 : 0));
    setCoachingNote("");
  };

  const handleSaveNote = async () => {
    if (!coachingNote.trim() || !user || !currentRep) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("coaching_sessions")
        .insert([{
          manager_id: user.id,
          rep_id: currentRep.user_id,
          notes: coachingNote.trim(),
          focus_areas: [],
          action_items: []
        }]);

      if (error) throw error;

      // Send notification to rep
      await supabase.functions.invoke("create-notification", {
        body: {
          user_id: currentRep.user_id,
          type: "coaching_notes",
          title: "New Coaching Notes",
          body: `${profile?.full_name} left coaching notes for you`,
          action_url: "/performance"
        }
      });

      toast.success("Coaching note saved!");
      setCoachingNote("");
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAction = async (action: "encourage" | "training" | "schedule") => {
    if (!currentRep) return;

    const messages = {
      encourage: "Keep up the great work! 💪",
      training: "I've assigned new training for you to complete.",
      schedule: "Let's schedule a 1:1 coaching session."
    };

    const titles = {
      encourage: "Words of Encouragement! 🔥",
      training: "New Training Assigned",
      schedule: "1:1 Requested"
    };

    try {
      await supabase.functions.invoke("create-notification", {
        body: {
          user_id: currentRep.user_id,
          type: action === "training" ? "training_assigned" : "coaching_notes",
          title: titles[action],
          body: `${profile?.full_name}: ${messages[action]}`,
          action_url: action === "training" ? "/training" : "/performance"
        }
      });

      toast.success(`${action === "encourage" ? "Encouragement" : action === "training" ? "Training" : "Meeting request"} sent!`);
    } catch (error) {
      console.error("Error sending action:", error);
      toast.error("Failed to send");
    }
  };

  if (!currentRep) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No team members to coach</p>
      </div>
    );
  }

  const TrendIcon = repStats?.trend === "up" ? TrendingUp : repStats?.trend === "down" ? TrendingDown : Minus;
  const trendColor = repStats?.trend === "up" ? "text-green-500" : repStats?.trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="flex flex-col h-full">
      {/* Header with swipe navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={handlePrev}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-3">
          {currentRep.avatar_url ? (
            <img
              src={currentRep.avatar_url}
              alt={currentRep.full_name}
              className="h-12 w-12 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {currentRep.full_name.charAt(0)}
              </span>
            </div>
          )}
          <div className="text-center">
            <h3 className="font-semibold">{currentRep.full_name}</h3>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} of {teamMembers.length}
            </p>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <ViperCard className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{repStats?.callsToday || 0}</p>
              <p className="text-xs text-muted-foreground">Calls Today</p>
            </ViperCard>
            <ViperCard className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{repStats?.appointmentsToday || 0}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </ViperCard>
            <ViperCard className="p-3 text-center flex flex-col items-center">
              <TrendIcon className={cn("h-6 w-6", trendColor)} />
              <p className="text-xs text-muted-foreground mt-1">Trend</p>
            </ViperCard>
          </div>

          {/* Rep info */}
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="gap-1">
              Level {currentRep.current_level}
            </Badge>
            <Badge variant="outline" className="gap-1">
              🔥 {currentRep.current_streak} day streak
            </Badge>
            <Badge variant="outline" className="gap-1">
              {currentRep.xp_points.toLocaleString()} XP
            </Badge>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <ViperButton
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("encourage")}
              className="flex-col h-auto py-3 gap-1"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">Encourage</span>
            </ViperButton>
            <ViperButton
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("training")}
              className="flex-col h-auto py-3 gap-1"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-xs">Training</span>
            </ViperButton>
            <ViperButton
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("schedule")}
              className="flex-col h-auto py-3 gap-1"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Schedule</span>
            </ViperButton>
          </div>

          {/* Voice Notes */}
          <ViperCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Coaching Notes</h4>
              {isSupported && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-accent hover:bg-accent/80"
                  )}
                >
                  {isRecording ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>

            {isRecording && (
              <p className="text-sm text-muted-foreground mb-2 animate-pulse">
                🎤 Recording... Tap to stop
              </p>
            )}

            <Textarea
              value={coachingNote}
              onChange={(e) => setCoachingNote(e.target.value)}
              placeholder="Type or speak your coaching notes..."
              rows={4}
              className="resize-none mb-3"
            />

            <ViperButton
              onClick={handleSaveNote}
              disabled={!coachingNote.trim() || isSaving}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Note"}
            </ViperButton>
          </ViperCard>
        </div>
      </ScrollArea>
    </div>
  );
}
