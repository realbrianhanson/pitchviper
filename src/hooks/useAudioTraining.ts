import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Objection } from './useObjections';
import { toast } from 'sonner';

export type TrainingMode = 'practice' | 'challenge' | 'random_fire';

interface AudioTrainingScore {
  id: string;
  user_id: string;
  mode: TrainingMode;
  objections_handled: number;
  correct_responses: number;
  total_score: number;
  duration_seconds: number;
  created_at: string;
}

interface ResponseEvaluation {
  score: number;
  feedback: string;
  suggestedResponse?: string;
}

export function useAudioTraining() {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Generate speech for an objection
  const speakObjection = useCallback(async (text: string, category: string): Promise<void> => {
    try {
      setIsPlaying(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-objection-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, category }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        toast.error('Failed to play audio');
      };

      await audio.play();
    } catch (error) {
      console.error('Error speaking objection:', error);
      setIsPlaying(false);
      toast.error('Failed to generate speech');
    }
  }, []);

  // Stop current audio
  const stopAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  }, [currentAudio]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
      throw error;
    }
  }, []);

  // Stop recording and get audio blob
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, []);

  // Transcribe audio
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      setIsTranscribing(true);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-voice-response`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to transcribe audio');
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Score response
  const scoreResponse = useCallback(async (
    objection: Objection,
    userResponse: string
  ): Promise<ResponseEvaluation> => {
    try {
      setIsScoring(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-objection-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            objection_text: objection.objection_text,
            user_response: userResponse,
            category: objection.category,
            difficulty: objection.difficulty,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to score response');
      }

      return await response.json();
    } catch (error) {
      console.error('Error scoring response:', error);
      toast.error('Failed to score response');
      return { score: 0, feedback: 'Error scoring response' };
    } finally {
      setIsScoring(false);
    }
  }, []);

  // Save training score
  const saveTrainingScore = useCallback(async (
    mode: TrainingMode,
    objections_handled: number,
    correct_responses: number,
    total_score: number,
    duration_seconds: number
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('audio_training_scores' as any)
        .insert({
          user_id: user.id,
          mode,
          objections_handled,
          correct_responses,
          total_score,
          duration_seconds,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving training score:', error);
    }
  }, [user]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (mode?: TrainingMode) => {
    try {
      let query = supabase
        .from('audio_training_scores' as any)
        .select('*')
        .order('total_score', { ascending: false })
        .limit(20);

      if (mode) {
        query = query.eq('mode', mode);
      }

      const { data, error } = await query as any;
      if (error) throw error;

      return data as AudioTrainingScore[];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }, []);

  return {
    // State
    isPlaying,
    isRecording,
    isTranscribing,
    isScoring,
    
    // Actions
    speakObjection,
    stopAudio,
    startRecording,
    stopRecording,
    transcribeAudio,
    scoreResponse,
    saveTrainingScore,
    fetchLeaderboard,
  };
}
