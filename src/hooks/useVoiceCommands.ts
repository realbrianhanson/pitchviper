import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface VoiceCommand {
  phrases: string[];
  action: () => void;
  description: string;
}

interface UseVoiceCommandsProps {
  enabled: boolean;
  commands?: VoiceCommand[];
}

// Web Speech API types
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventCustom {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventCustom {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventCustom) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventCustom) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceCommands({ enabled, commands = [] }: UseVoiceCommandsProps) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Default commands
  const defaultCommands: VoiceCommand[] = [
    {
      phrases: ["show me today's numbers", "show today's numbers", "today's numbers"],
      action: () => navigate("/"),
      description: "Navigate to dashboard"
    },
    {
      phrases: ["who's on fire today", "who is on fire", "top performers"],
      action: () => navigate("/leaderboards"),
      description: "Show leaderboards"
    },
    {
      phrases: ["start roleplay", "practice roleplay", "roleplay"],
      action: () => navigate("/roleplay"),
      description: "Start roleplay practice"
    },
    {
      phrases: ["team status", "team pulse", "how's the team"],
      action: () => navigate("/war-room"),
      description: "Show war room"
    },
    {
      phrases: ["coaching", "coach team", "coaching console"],
      action: () => navigate("/coaching"),
      description: "Open coaching console"
    },
    {
      phrases: ["pipeline", "show deals", "my deals"],
      action: () => navigate("/pipeline"),
      description: "Show deal pipeline"
    },
  ];

  const allCommands = [...defaultCommands, ...commands];

  const startListening = useCallback(() => {
    if (!isSupported || !enabled) return;

    const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) return;
    
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening...", { duration: 2000 });
    };

    recognition.onresult = (event: SpeechRecognitionEventCustom) => {
      const result = event.results[0][0].transcript.toLowerCase();
      setTranscript(result);

      // Find matching command
      const matchedCommand = allCommands.find(cmd =>
        cmd.phrases.some(phrase => result.includes(phrase.toLowerCase()))
      );

      if (matchedCommand) {
        toast.success(`Executing: ${matchedCommand.description}`);
        matchedCommand.action();
      } else {
        toast.error(`Command not recognized: "${result}"`);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventCustom) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error !== "no-speech") {
        toast.error("Voice command failed. Please try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [isSupported, enabled, allCommands]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    availableCommands: allCommands.map(c => ({
      phrases: c.phrases,
      description: c.description
    }))
  };
}
