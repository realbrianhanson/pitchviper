import { useState, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { RoleplayScenario } from "@/hooks/useRoleplayData";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface VoiceRoleplayProps {
  scenario: RoleplayScenario;
  prospectName: string;
  prospectTitle: string;
  prospectCompany: string;
  onTranscriptUpdate: (userText: string, agentText: string) => void;
  onSessionEnd: () => void;
}

interface CompanySettings {
  company_name: string;
  product_description: string;
  value_propositions: string[];
  common_use_cases: string[];
  industry: string | null;
  target_audience: string | null;
}

export function VoiceRoleplay({
  scenario,
  prospectName,
  prospectTitle,
  prospectCompany,
  onTranscriptUpdate,
  onSessionEnd,
}: VoiceRoleplayProps) {
  const { profile } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [agentNotConfigured, setAgentNotConfigured] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      toast.success("Voice session started!");
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
    },
    onMessage: (message: any) => {
      console.log("Message from agent:", message);
      
      // Handle transcripts for logging
      if (message?.type === "user_transcript") {
        const userTranscript = message?.user_transcription_event?.user_transcript;
        if (userTranscript) {
          onTranscriptUpdate(userTranscript, "");
        }
      } else if (message?.type === "agent_response") {
        const agentResponse = message?.agent_response_event?.agent_response;
        if (agentResponse) {
          onTranscriptUpdate("", agentResponse);
        }
      }
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast.error("Voice connection error. Please try again.");
    },
  });

  // Check microphone permission on mount
  useEffect(() => {
    navigator.permissions?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        setMicPermission(result.state === "granted" ? "granted" : "pending");
      })
      .catch(() => {
        // Permissions API not supported, will check when starting
        setMicPermission("pending");
      });
  }, []);

  // Fetch company settings for product context
  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!profile?.team_id) return;

      try {
        const { data, error } = await supabase
          .from("company_settings")
          .select("company_name, product_description, value_propositions, common_use_cases, industry, target_audience")
          .eq("team_id", profile.team_id)
          .maybeSingle();

        if (error) throw error;
        if (data) setCompanySettings(data);
      } catch (error) {
        console.error("Error fetching company settings:", error);
      }
    };

    fetchCompanySettings();
  }, [profile?.team_id]);

  const requestMicrophoneAccess = async (): Promise<boolean> => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      return true;
    } catch (error) {
      console.error("Microphone access denied:", error);
      setMicPermission("denied");
      toast.error("Microphone access is required for voice roleplay");
      return false;
    }
  };

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Request microphone permission first
      const hasPermission = await requestMicrophoneAccess();
      if (!hasPermission) {
        setIsConnecting(false);
        return;
      }

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke("elevenlabs-roleplay-token", {
        body: { scenario_id: scenario.id },
      });

      if (error) throw error;

      if (data.error === "no_agent") {
        setAgentNotConfigured(true);
        toast.error("Voice agent not configured. Please contact support.");
        setIsConnecting(false);
        return;
      }

      if (!data.signed_url) {
        throw new Error("No signed URL received");
      }

      // Build the system prompt for overrides
      let productContext = "";
      if (companySettings && companySettings.company_name) {
        productContext = `
THE SALESPERSON'S COMPANY & PRODUCT:
Company: ${companySettings.company_name}
${companySettings.industry ? `Industry: ${companySettings.industry}` : ""}
${companySettings.product_description ? `What they sell: ${companySettings.product_description}` : ""}
${companySettings.value_propositions.length > 0 ? `Key value props: ${companySettings.value_propositions.join(", ")}` : ""}
${companySettings.target_audience ? `Their typical customers: ${companySettings.target_audience}` : ""}

React realistically to their pitch based on your persona. You can show interest if they address your real concerns, or push back if they're not addressing your needs.
`;
      }

      const systemPrompt = `You are playing the role of a sales prospect named ${prospectName}, ${prospectTitle} at ${prospectCompany}.

SCENARIO: ${scenario.name}
YOUR PERSONA: ${scenario.prospect_persona}
YOUR SITUATION: ${scenario.prospect_situation}
${productContext}
BEHAVIOR GUIDELINES:
1. Stay 100% in character as the prospect - never break character
2. Be realistic but fair - you have real concerns but can be convinced
3. Naturally raise these objections during conversation:
${scenario.objections_to_include.map(obj => `   - "${obj}"`).join("\n")}

4. Respond conversationally in 2-4 sentences
5. Show positive signals when the salesperson addresses your concerns well
6. If they're doing really well, show buying signals
7. Be professional but human

The salesperson is trying to achieve: ${scenario.win_conditions.join(", ")}

Start by greeting the caller briefly, stating your name and that you're a bit busy.`;

      // Start the conversation with dynamic overrides
      await conversation.startSession({
        signedUrl: data.signed_url,
        overrides: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
            firstMessage: `Hi, this is ${prospectName}. I've only got a few minutes - what can I do for you?`,
            language: "en",
          },
        },
      });
    } catch (error) {
      console.error("Failed to start voice conversation:", error);
      toast.error("Failed to start voice session. Please try text mode.");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, scenario, prospectName, prospectTitle, prospectCompany, companySettings, profile?.team_id]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    onSessionEnd();
  }, [conversation, onSessionEnd]);

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  if (agentNotConfigured) {
    return (
      <ViperCard variant="glass" className="p-6">
        <div className="text-center">
          <MicOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Voice Mode Not Available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Voice roleplay requires an ElevenLabs agent to be configured. 
            Please use text mode for now.
          </p>
        </div>
      </ViperCard>
    );
  }

  if (micPermission === "denied") {
    return (
      <ViperCard variant="glass" className="p-6">
        <div className="text-center">
          <MicOff className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Microphone Access Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Voice roleplay needs microphone access. Please enable it in your browser settings.
          </p>
          <ViperButton onClick={() => setMicPermission("pending")}>
            Try Again
          </ViperButton>
        </div>
      </ViperCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voice Status Card */}
      <ViperCard variant="glass" className="p-6">
        <div className="flex flex-col items-center">
          {/* Prospect Avatar with speaking indicator */}
          <div className="relative mb-4">
            <Avatar className={cn(
              "h-24 w-24 ring-4 transition-all duration-300",
              isSpeaking ? "ring-primary animate-pulse" : isConnected ? "ring-success/50" : "ring-muted"
            )}>
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {prospectName.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            {/* Speaking indicator */}
            {isConnected && (
              <div className={cn(
                "absolute -bottom-1 -right-1 p-2 rounded-full",
                isSpeaking ? "bg-primary" : "bg-success"
              )}>
                {isSpeaking ? (
                  <Volume2 className="h-4 w-4 text-primary-foreground animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4 text-success-foreground" />
                )}
              </div>
            )}
          </div>

          <h3 className="font-semibold text-lg">{prospectName}</h3>
          <p className="text-sm text-muted-foreground">{prospectTitle}</p>
          <p className="text-xs text-primary mb-4">{prospectCompany}</p>

          {/* Status text */}
          <p className={cn(
            "text-sm mb-6 transition-colors",
            isSpeaking ? "text-primary" : isConnected ? "text-success" : "text-muted-foreground"
          )}>
            {isConnecting ? "Connecting..." : 
             isSpeaking ? "Prospect is speaking..." : 
             isConnected ? "Listening to you..." : 
             "Ready to start voice call"}
          </p>

          {/* Call controls */}
          <div className="flex gap-4">
            {!isConnected ? (
              <ViperButton
                size="lg"
                onClick={startConversation}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="h-5 w-5" />
                    Start Voice Call
                  </>
                )}
              </ViperButton>
            ) : (
              <ViperButton
                size="lg"
                variant="destructive"
                onClick={stopConversation}
                className="gap-2"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </ViperButton>
            )}
          </div>
        </div>
      </ViperCard>

      {/* Tips */}
      {!isConnected && (
        <ViperCard variant="glass" className="p-4">
          <h4 className="font-medium mb-2 text-sm">Voice Roleplay Tips</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Speak clearly and at a natural pace</li>
            <li>• Wait for the prospect to finish speaking before responding</li>
            <li>• Use pauses to think - the AI will wait for you</li>
            <li>• End the call when you've achieved your goals or want feedback</li>
          </ul>
        </ViperCard>
      )}
    </div>
  );
}
