import { useState } from "react";
import { Mic, MicOff, HelpCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ViperButton } from "@/components/ui/viper-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceCommandButtonProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function VoiceCommandButton({ enabled, onToggle }: VoiceCommandButtonProps) {
  const { user } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  
  const { 
    isSupported, 
    isListening, 
    startListening, 
    availableCommands 
  } = useVoiceCommands({ enabled });

  const handleToggle = async (newEnabled: boolean) => {
    onToggle(newEnabled);
    
    if (user) {
      try {
        await supabase
          .from("user_preferences")
          .upsert({
            user_id: user.id,
            voice_commands_enabled: newEnabled
          }, { onConflict: "user_id" });
      } catch (error) {
        console.error("Error saving preference:", error);
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      <Sheet open={showHelp} onOpenChange={setShowHelp}>
        <SheetTrigger asChild>
          <button
            onClick={() => {
              if (enabled) {
                startListening();
              } else {
                setShowHelp(true);
              }
            }}
            className={cn(
              "relative p-2 rounded-lg transition-all duration-200",
              enabled 
                ? isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-primary/10 hover:bg-primary/20 text-primary"
                : "bg-accent hover:bg-accent/80 text-muted-foreground"
            )}
            title={enabled ? "Click to use voice command" : "Voice commands disabled"}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {isListening && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Voice Commands
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-6 pb-8">
              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable Voice Commands</Label>
                  <p className="text-sm text-muted-foreground">
                    Use your voice to navigate and control the app
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggle}
                />
              </div>

              {/* Commands list */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Available Commands
                </h3>
                
                {availableCommands.map((cmd, i) => (
                  <div key={i} className="p-3 bg-card border border-border rounded-lg">
                    <p className="font-medium text-sm">{cmd.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cmd.phrases.map((phrase, j) => (
                        <span 
                          key={j}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                        >
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Usage tip */}
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500">How to use</p>
                  <p className="text-muted-foreground mt-1">
                    Tap the microphone button in the header, then speak your command clearly. 
                    The app will recognize your voice and perform the action.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
