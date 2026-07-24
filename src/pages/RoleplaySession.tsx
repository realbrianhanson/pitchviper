import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RoleplayScenario } from "@/hooks/useRoleplayData";
import { RoleplayResults } from "@/components/roleplay/RoleplayResults";
import { VoiceRoleplay } from "@/components/roleplay/VoiceRoleplay";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DifficultyBadge } from "@/components/roleplay/DifficultyBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  ArrowLeft,
  Send,
  Mic,
  MessageSquare,
  Loader2,
  Clock,
  Lightbulb,
  CheckCircle2,
  Circle,
  User,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatAnalysisResult {
  addressed_objection: boolean;
  attempted_close: boolean;
  positive_momentum: boolean;
  win_conditions_achieved: string[];
}

interface SessionAnalysisResult {
  outcome: "won" | "lost" | "progress";
  overall_score: number;
  categories: Array<{ name: string; score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  key_moment: { type: "highlight" | "missed_opportunity"; description: string };
  xp_earned: number;
  is_new_best: boolean;
  is_first_completion: boolean;
  previous_best: number | null;
}

const PROSPECT_NAMES: Record<string, { name: string; title: string; company: string }> = {
  "The Hot Lead": { name: "Alex Chen", title: "Marketing Manager", company: "ShopWave Commerce" },
  "The Price Objector": { name: "Morgan Williams", title: "Operations Director", company: "Precision Manufacturing Co." },
  "The Tire Kicker": { name: "Jordan Smith", title: "Small Business Owner", company: "Smith & Associates" },
  "The Gatekeeper": { name: "Taylor Martinez", title: "Executive Assistant", company: "Vertex Solutions" },
  "The Feature Demander": { name: "Casey Johnson", title: "Tech Lead", company: "CloudScale SaaS" },
  "The Skeptical CFO": { name: "Robin Anderson", title: "Chief Financial Officer", company: "Apex Industries" },
  "The Competitor Loyal": { name: "Sam Thompson", title: "Director of Customer Success", company: "ServicePro Inc." },
  "The Ghosted Follow-up": { name: "Jamie Roberts", title: "VP of Marketing", company: "GrowthFirst Media" },
};

export default function RoleplaySession() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeSessionId = searchParams.get("resume");
  const { user, session } = useAuth();
  
  const [scenario, setScenario] = useState<RoleplayScenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [achievedConditions, setAchievedConditions] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [sessionState, setSessionState] = useState<"active" | "analyzing" | "results">("active");
  const [analysisResult, setAnalysisResult] = useState<SessionAnalysisResult | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [voiceTranscript, setVoiceTranscript] = useState<{ user: string[]; agent: string[] }>({ user: [], agent: [] });
  const [voiceMomentum, setVoiceMomentum] = useState<{ addressed_objection: boolean; attempted_close: boolean }>({ addressed_objection: false, attempted_close: false });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Live voice analysis pairing: hold the latest user line until an agent line arrives
  const pendingUserRef = useRef<string | null>(null);
  // Guard so the init effect runs at most once per scenarioId. Without this,
  // useAuth re-emitting a new user/session reference on window-focus would re-run
  // init, create a brand-new DB session, and wipe `messages` back to just the opening line.
  const initializedRef = useRef<string | null>(null);

  // Initialize session — runs exactly once per scenarioId
  useEffect(() => {
    const initSession = async () => {
      if (!scenarioId || !user) return;
      if (initializedRef.current === scenarioId) return;
      initializedRef.current = scenarioId;

      try {
        // Fetch scenario
        const { data: scenarioData, error: scenarioError } = await supabase
          .from("roleplay_scenarios")
          .select("*")
          .eq("id", scenarioId)
          .maybeSingle();

        if (scenarioError || !scenarioData) {
          toast.error("Scenario not found");
          navigate("/roleplay");
          return;
        }

        setScenario(scenarioData as RoleplayScenario);

        // Resume existing session if requested and valid; otherwise create a new one
        let sessionRow: { id: string; transcript: unknown } | null = null;
        if (resumeSessionId) {
          const { data: existing } = await supabase
            .from("roleplay_sessions")
            .select("id, transcript, user_id, scenario_id, status, started_at")
            .eq("id", resumeSessionId)
            .maybeSingle();
          const startedMs = existing?.started_at ? new Date(existing.started_at).getTime() : 0;
          const isFresh = Date.now() - startedMs < 24 * 60 * 60 * 1000;
          if (
            existing &&
            existing.user_id === user.id &&
            existing.scenario_id === scenarioId &&
            existing.status === "in_progress" &&
            isFresh
          ) {
            sessionRow = { id: existing.id, transcript: existing.transcript };
          }
        }

        if (!sessionRow) {
          const { data: sessionData, error: sessionError } = await supabase
            .from("roleplay_sessions")
            .insert({
              user_id: user.id,
              scenario_id: scenarioId,
              status: "in_progress",
              transcript: [],
            })
            .select()
            .single();
          if (sessionError) throw sessionError;
          sessionRow = { id: sessionData.id, transcript: sessionData.transcript };
        }

        setSessionId(sessionRow.id);

        const prospect = PROSPECT_NAMES[scenarioData.name] || { name: "Prospect", title: "Business Professional", company: "ABC Corp" };
        const persistedTranscript = Array.isArray(sessionRow.transcript)
          ? (sessionRow.transcript as Message[])
          : [];

        if (persistedTranscript.length > 0) {
          setMessages(persistedTranscript);
        } else {
          const openingMessage: Message = {
            role: "assistant",
            content: getOpeningMessage(scenarioData.name, prospect.name),
            timestamp: new Date().toISOString(),
          };
          setMessages([openingMessage]);
          // Route the opening line through the authenticated append endpoint —
          // clients no longer have direct UPDATE on roleplay_sessions.
          await supabase.functions.invoke("roleplay-append-transcript", {
            body: { session_id: sessionRow.id, messages: [openingMessage] },
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing session:", error);
        toast.error("Failed to start session");
        initializedRef.current = null;
        navigate("/roleplay");
      }
    };

    initSession();
  }, [scenarioId, user, navigate, resumeSessionId]);

  // Timer
  useEffect(() => {
    if (!isLoading && sessionId) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !session?.access_token || !scenario || !sessionId) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // Add user message immediately
    const userMsg: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roleplay-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scenario_id: scenarioId,
            session_id: sessionId,
            user_message: userMessage,
            conversation_history: messages,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a moment.");
        } else if (response.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          throw new Error(errorData.error || "Failed to get response");
        }
        return;
      }

      const data = await response.json();

      // Add assistant message
      const assistantMsg: Message = {
        role: "assistant",
        content: data.message,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Process analysis
      if (data.analysis) {
        const analysis = data.analysis as ChatAnalysisResult;
        
        // Update achieved conditions
        if (analysis.win_conditions_achieved?.length > 0) {
          setAchievedConditions((prev) => {
            const next = new Set(prev);
            analysis.win_conditions_achieved.forEach((wc) => next.add(wc));
            return next;
          });
          
          // Show celebration for each new condition
          analysis.win_conditions_achieved.forEach((condition) => {
            toast.success(`✅ Win condition achieved: ${condition}`);
          });
        }

        if (analysis.positive_momentum) {
          // Could show a subtle indicator
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const endSession = async () => {
    if (!sessionId || !session?.access_token || !scenarioId) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Guard: analyzer rejects transcripts with no user turn. If the rep never
    // spoke/typed, abandon the session instead of triggering a 400.
    const hasUserTurn = messages.some((m) => m.role === "user" && m.content.trim().length > 0);
    if (!hasUserTurn) {
      toast.info("No conversation recorded — session ended.");
      await abandonSession();
      return;
    }

    setSessionState("analyzing");

    try {
      const { data, error } = await supabase.functions.invoke("roleplay-analyze", {
        body: {
          session_id: sessionId,
          scenario_id: scenarioId,
          transcript: messages,
          duration_seconds: elapsedSeconds,
          hints_used: hintsUsed,
        },
      });

      if (error) {
        const code = (error as { context?: { status?: number } })?.context?.status;
        if (code === 429) toast.error("Rate limit exceeded. Please wait a moment.");
        else if (code === 402) toast.error("AI credits exhausted. Please add credits.");
        else if (code === 409) toast.error("Analysis already in progress — please wait.");
        else if (code === 400) {
          toast.error("Not enough conversation to analyze — please try again.");
          await abandonSession();
          return;
        }
        else toast.error("Failed to analyze session");
        setSessionState("active");
        return;
      }

      setAnalysisResult(data);
      setSessionState("results");
    } catch (error) {
      console.error("Error analyzing session:", error);
      toast.error("Failed to analyze session");
      setSessionState("active");
    }
  };

  const abandonSession = async () => {
    if (!sessionId) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      await supabase.functions.invoke("roleplay-abandon-session", {
        body: { session_id: sessionId, duration_seconds: elapsedSeconds },
      });

      navigate("/roleplay");
    } catch (error) {
      console.error("Error abandoning session:", error);
    }
  };

  const revealHint = () => {
    setShowHint(true);
    setHintsUsed((prev) => prev + 1);
    toast.info("Hint revealed! This will cost 10 XP from your final score.");
  };

  // Atomically append voice transcript lines via the edge function (uses
  // append_roleplay_messages RPC under the hood). Sending only the new lines
  // avoids any read-then-overwrite race; the JWT/ownership check lives server-side.
  const persistVoiceLines = async (newLines: Message[]) => {
    if (!sessionId || newLines.length === 0) return;
    try {
      const { error } = await supabase.functions.invoke("roleplay-append-transcript", {
        body: { session_id: sessionId, messages: newLines },
      });
      if (error) console.error("Failed to append voice transcript:", error);
    } catch (err) {
      console.error("Failed to append voice transcript:", err);
    }
  };

  // Live voice analysis — pair the most recent user line with the next agent line
  // and check for addressed objections, attempted closes, and achieved win conditions.
  const analyzeVoiceTurn = async (userText: string, agentText: string) => {
    if (!sessionId || !scenarioId || !session?.access_token) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roleplay-voice-analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scenario_id: scenarioId,
            session_id: sessionId,
            user_message: userText,
            agent_message: agentText,
          }),
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      const analysis = data.analysis as ChatAnalysisResult | undefined;
      if (!analysis) return;

      if (analysis.addressed_objection || analysis.attempted_close) {
        setVoiceMomentum((prev) => ({
          addressed_objection: prev.addressed_objection || analysis.addressed_objection,
          attempted_close: prev.attempted_close || analysis.attempted_close,
        }));
      }

      if (analysis.win_conditions_achieved?.length > 0) {
        setAchievedConditions((prev) => {
          const next = new Set(prev);
          analysis.win_conditions_achieved.forEach((wc) => {
            if (!prev.has(wc)) {
              toast.success(`✅ Win condition achieved: ${wc}`);
            }
            next.add(wc);
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Voice turn analysis failed:", err);
    }
  };

  const handleVoiceTranscriptUpdate = (userText: string, agentText: string) => {
    const newLines: Message[] = [];
    const now = new Date().toISOString();
    if (userText) newLines.push({ role: "user", content: userText, timestamp: now });
    if (agentText) newLines.push({ role: "assistant", content: agentText, timestamp: now });
    if (newLines.length === 0) return;

    setMessages((prev) => [...prev, ...newLines]);
    // Atomically append only the new lines to the DB transcript.
    void persistVoiceLines(newLines);

    // Pair user→agent turns for live analysis
    if (userText) {
      pendingUserRef.current = userText;
    }
    if (agentText && pendingUserRef.current) {
      const pairedUser = pendingUserRef.current;
      pendingUserRef.current = null;
      void analyzeVoiceTurn(pairedUser, agentText);
    }
  };

  const handleVoiceSessionEnd = () => {
    // Give the last transcript line(s) a moment to arrive & persist before analysis.
    // The analyzer also falls back to the DB-persisted transcript, so this is belt-and-suspenders.
    setTimeout(() => { void endSession(); }, 800);
  };

  // Show analyzing screen
  if (sessionState === "analyzing") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            — The Debrief
          </p>
          <h2 className="font-display italic text-3xl md:text-4xl text-foreground mb-8">
            Analyzing Your Performance
          </h2>
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Reviewing Conversation
            </p>
          </div>
          <p className="font-body text-sm text-muted-foreground/80 mt-6">
            Our AI coach is reviewing your conversation
          </p>
        </div>
      </div>
    );
  }

  // Show results screen
  if (sessionState === "results" && analysisResult && scenario) {
    return (
      <RoleplayResults
        analysis={analysisResult}
        scenarioId={scenarioId!}
        scenarioName={scenario.name}
        transcript={messages}
      />
    );
  }

  if (isLoading || !scenario) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <EditorialLoading label="Loading Scenario" />
      </div>
    );
  }

  const prospect = PROSPECT_NAMES[scenario.name] || { name: "Prospect", title: "Business Professional", company: "ABC Corp" };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex-none border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave Session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your progress will be lost. Are you sure you want to leave?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continue Session</AlertDialogCancel>
                  <AlertDialogAction onClick={abandonSession} className="bg-destructive text-destructive-foreground">
                    Leave
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-foreground">{scenario.name}</h1>
                <DifficultyBadge difficulty={scenario.difficulty} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Input Mode Toggle */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "voice")}>
              <TabsList className="h-8">
                <TabsTrigger value="text" className="h-7 text-xs gap-1 px-2">
                  <MessageSquare className="h-3 w-3" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="voice" className="h-7 text-xs gap-1 px-2">
                  <Mic className="h-3 w-3" />
                  Voice
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-sm">{formatTime(elapsedSeconds)}</span>
            </div>

            <Button variant="outline" size="sm" onClick={endSession}>
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Prospect Info */}
        <div className="w-80 border-r border-border/50 bg-card/30 flex flex-col overflow-hidden">
          {/* Prospect Card */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold text-lg">
                  {prospect.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{prospect.name}</h3>
                <p className="text-xs text-muted-foreground">{prospect.title}</p>
                <p className="text-xs text-primary">{prospect.company}</p>
              </div>
            </div>

            <div className="bg-background/50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                What you know
              </h4>
              <p className="text-sm text-foreground/80">{scenario.prospect_situation}</p>
            </div>
          </div>

          {/* Win Conditions */}
          <div className="flex-1 p-4 overflow-auto">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Win Conditions
            </h4>
            {inputMode === "voice" && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border transition-colors",
                    voiceMomentum.addressed_objection
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-background/50 text-muted-foreground border-border/50"
                  )}
                >
                  {voiceMomentum.addressed_objection ? "✓" : "○"} Objection handled
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border transition-colors",
                    voiceMomentum.attempted_close
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-background/50 text-muted-foreground border-border/50"
                  )}
                >
                  {voiceMomentum.attempted_close ? "✓" : "○"} Close attempted
                </span>
              </div>
            )}
            <div className="space-y-2">
              {scenario.win_conditions.map((condition, idx) => {
                const isAchieved = achievedConditions.has(condition);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg transition-colors",
                      isAchieved ? "bg-success/10" : "bg-background/50"
                    )}
                  >
                    {isAchieved ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm", isAchieved ? "text-success" : "text-foreground/80")}>
                      {condition}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hint Button */}
          <div className="p-4 border-t border-border/50">
            {!showHint ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={revealHint}
              >
                <Lightbulb className="h-4 w-4" />
                Need a tip? (-10 XP)
              </Button>
            ) : (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase">Coaching Tip</span>
                </div>
                <p className="text-sm text-foreground/80">
                  {getHintForScenario(scenario.name)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Panel */}
        <div className="flex-1 flex flex-col">
          {inputMode === "voice" ? (
            /* Voice Mode */
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <VoiceRoleplay
                scenario={scenario}
                prospectName={prospect.name}
                prospectTitle={prospect.title}
                prospectCompany={prospect.company}
                onTranscriptUpdate={handleVoiceTranscriptUpdate}
                onSessionEnd={handleVoiceSessionEnd}
              />
              
              {/* Voice transcript preview */}
              {messages.length > 1 && (
                <div className="w-full max-w-md mt-6">
                  <ScrollArea className="h-40 rounded-lg border border-border/50 bg-card/30 p-3">
                    <div className="space-y-2">
                      {messages.slice(-6).map((message, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "text-xs p-2 rounded",
                            message.role === "user" 
                              ? "bg-primary/10 text-primary ml-4" 
                              : "bg-muted/50 text-muted-foreground mr-4"
                          )}
                        >
                          <span className="font-medium">
                            {message.role === "user" ? "You: " : `${prospect.name}: `}
                          </span>
                          {message.content.substring(0, 100)}
                          {message.content.length > 100 && "..."}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            /* Text Mode */
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className={cn(
                        "h-8 w-8 flex-shrink-0",
                        message.role === "user" ? "bg-primary/20" : "bg-muted"
                      )}>
                        <AvatarFallback>
                          {message.role === "user" ? (
                            <User className="h-4 w-4 text-primary" />
                          ) : (
                            <Bot className="h-4 w-4 text-muted-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-3",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted rounded-tl-sm"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8 bg-muted">
                        <AvatarFallback>
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-border/50 p-4 bg-card/30">
                <div className="max-w-3xl mx-auto flex gap-3">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="What do you say next?"
                    disabled={isSending}
                    className="flex-1 bg-background/50"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isSending}
                    className="gap-2"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getOpeningMessage(scenarioName: string, prospectName: string): string {
  const openings: Record<string, string> = {
    "The Hot Lead": `Hi! Thanks for getting back to me so quickly. I've been doing a lot of research on your solution and I'm really excited about what I've seen. My boss already approved the budget, so I think we're ready to move forward. I just have a few quick questions before we finalize everything.`,
    "The Price Objector": `Hey, thanks for the follow-up call. Look, I'll be straight with you — I really like what you've shown us, but your pricing is... well, it's higher than I expected. My CFO is going to have questions. Can we talk about what we can do here?`,
    "The Tire Kicker": `Oh, hi there! Yeah, I remember downloading your whitepaper a while back. Interesting stuff. I'm still just gathering information at this point, you know? We're not really in a rush to make any changes right now.`,
    "The Gatekeeper": `Hello, ${prospectName.split(" ")[0]} speaking. How can I help you?`,
    "The Feature Demander": `Thanks for reaching out. I've been looking at your platform, and I have to say, there are some capabilities I need that I'm not seeing. Can we talk about your feature roadmap?`,
    "The Skeptical CFO": `Alright, you've got 15 minutes. The department wants this, but I've seen a lot of these "transformational" tools come and go. What makes you any different? And please, skip the marketing fluff — show me the numbers.`,
    "The Competitor Loyal": `Look, I agreed to this call as a favor to your mutual connection, but I'll be honest — we've been with [Competitor] for three years now and it's been working fine. I'm not sure what you could show me that would change that.`,
    "The Ghosted Follow-up": `Oh... hey. Yeah, sorry about going dark on you. Things got crazy around here. Honestly, I'm not sure where we left off. Can you remind me what we were discussing?`,
  };
  return openings[scenarioName] || `Hello, this is ${prospectName}. What can I do for you?`;
}

function getHintForScenario(scenarioName: string): string {
  const hints: Record<string, string> = {
    "The Hot Lead": "Don't overcomplicate it! Confirm their enthusiasm, answer their questions confidently, and guide them to sign. Sometimes the best close is a simple 'Let's get you started today.'",
    "The Price Objector": "Focus on ROI and value, not price. Ask what the cost of NOT solving their problem is. Consider offering payment terms or phased implementation instead of discounts.",
    "The Tire Kicker": "Create urgency by quantifying the cost of delay. Ask 'What would need to change for this to become a priority?' Find the real decision timeline.",
    "The Gatekeeper": "Be respectful and make them your ally. Offer to help them look good by solving a problem their boss cares about. Ask 'What would be the best way to get a few minutes with [Boss Name]?'",
    "The Feature Demander": "Acknowledge their needs, then pivot to understanding WHY they need that feature. Often there's a different way to solve the underlying problem with what you have.",
    "The Skeptical CFO": "Lead with data and case studies. Calculate specific ROI for their situation. Show implementation timeline and when they'd start seeing returns.",
    "The Competitor Loyal": "Don't bash the competitor. Ask about their experience — satisfaction often hides frustrations. Look for gaps: 'What's one thing you wish [Competitor] did better?'",
    "The Ghosted Follow-up": "Acknowledge the silence without guilt-tripping. Offer a quick recap and new value — maybe an update or relevant insight. Make re-engaging feel easy and worthwhile.",
  };
  return hints[scenarioName] || "Listen carefully to their objections and address the underlying concern, not just the surface-level complaint.";
}
