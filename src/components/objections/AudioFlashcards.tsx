import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ViperCard, ViperCardContent } from '@/components/ui/viper-card';
import { useAudioTraining, TrainingMode } from '@/hooks/useAudioTraining';
import { Objection } from '@/hooks/useObjections';
import { 
  Volume2, 
  Mic, 
  Square, 
  Play, 
  Pause,
  SkipForward,
  Trophy,
  Timer,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioFlashcardsProps {
  isOpen: boolean;
  onClose: () => void;
  objections: Objection[];
}

type SessionState = 'mode_select' | 'ready' | 'playing' | 'listening' | 'recording' | 'scoring' | 'feedback' | 'complete';

interface SessionScore {
  objection: Objection;
  userResponse: string;
  score: number;
  feedback: string;
  suggestedResponse?: string;
}

export function AudioFlashcards({ isOpen, onClose, objections }: AudioFlashcardsProps) {
  const {
    isPlaying,
    isRecording,
    isTranscribing,
    isScoring,
    speakObjection,
    stopAudio,
    startRecording,
    stopRecording,
    transcribeAudio,
    scoreResponse,
    saveTrainingScore,
  } = useAudioTraining();

  const [mode, setMode] = useState<TrainingMode | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('mode_select');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledObjections, setShuffledObjections] = useState<Objection[]>([]);
  const [scores, setScores] = useState<SessionScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState<{ score: number; feedback: string; suggestedResponse?: string } | null>(null);

  const currentObjection = shuffledObjections[currentIndex];
  const isLastObjection = currentIndex >= shuffledObjections.length - 1;

  // Shuffle objections when mode is selected
  useEffect(() => {
    if (mode && objections.length > 0) {
      const shuffled = [...objections].sort(() => Math.random() - 0.5);
      // For random fire, take more objections
      const count = mode === 'random_fire' ? Math.min(10, shuffled.length) : Math.min(5, shuffled.length);
      setShuffledObjections(shuffled.slice(0, count));
      setCurrentIndex(0);
      setScores([]);
      setSessionState('ready');
      setSessionStartTime(Date.now());
    }
  }, [mode, objections]);

  // Timer for challenge/random_fire modes
  useEffect(() => {
    if ((mode === 'challenge' || mode === 'random_fire') && sessionState === 'recording') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleStopRecording();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, sessionState]);

  const handleSelectMode = (selectedMode: TrainingMode) => {
    setMode(selectedMode);
  };

  const handlePlayObjection = async () => {
    if (!currentObjection) return;
    setSessionState('playing');
    await speakObjection(currentObjection.objection_text, currentObjection.category);
    setSessionState('listening');
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setSessionState('recording');
      setTimeLeft(30);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = useCallback(async () => {
    try {
      const audioBlob = await stopRecording();
      setSessionState('scoring');
      
      // Transcribe
      const transcript = await transcribeAudio(audioBlob);
      setCurrentTranscript(transcript);
      
      // Score
      if (transcript && currentObjection) {
        const evaluation = await scoreResponse(currentObjection, transcript);
        setCurrentEvaluation(evaluation);
        
        setScores(prev => [...prev, {
          objection: currentObjection,
          userResponse: transcript,
          score: evaluation.score,
          feedback: evaluation.feedback,
          suggestedResponse: evaluation.suggestedResponse,
        }]);
      }
      
      setSessionState('feedback');
    } catch (error) {
      console.error('Error processing recording:', error);
      setSessionState('listening');
    }
  }, [stopRecording, transcribeAudio, scoreResponse, currentObjection]);

  const handleNext = () => {
    if (isLastObjection) {
      handleComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
      setSessionState('ready');
      setCurrentTranscript('');
      setCurrentEvaluation(null);
    }
  };

  const handleComplete = async () => {
    setSessionState('complete');
    
    if (mode && sessionStartTime) {
      const durationSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      const correctResponses = scores.filter(s => s.score >= 70).length;
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      
      await saveTrainingScore(
        mode,
        scores.length,
        correctResponses,
        totalScore,
        durationSeconds
      );
    }
  };

  const handleReset = () => {
    setMode(null);
    setSessionState('mode_select');
    setCurrentIndex(0);
    setShuffledObjections([]);
    setScores([]);
    setCurrentTranscript('');
    setCurrentEvaluation(null);
  };

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => { stopAudio(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Audio Flashcards
          </DialogTitle>
        </DialogHeader>

        {/* Mode Selection */}
        {sessionState === 'mode_select' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">Choose your training mode:</p>
            
            <div className="grid gap-4">
              <ViperCard 
                variant="glass" 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectMode('practice')}
              >
                <ViperCardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <Play className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Practice Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Unlimited time, see suggested responses after each answer
                    </p>
                  </div>
                </ViperCardContent>
              </ViperCard>

              <ViperCard 
                variant="glass" 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectMode('challenge')}
              >
                <ViperCardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-lg bg-yellow-500/20">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Challenge Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      30 seconds per objection, no hints, compete for high scores
                    </p>
                  </div>
                </ViperCardContent>
              </ViperCard>

              <ViperCard 
                variant="glass" 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelectMode('random_fire')}
              >
                <ViperCardContent className="flex items-center gap-4 p-4">
                  <div className="p-3 rounded-lg bg-red-500/20">
                    <Zap className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Random Fire</h3>
                    <p className="text-sm text-muted-foreground">
                      Rapid fire objections, 10 in a row, test your quick thinking
                    </p>
                  </div>
                </ViperCardContent>
              </ViperCard>
            </div>
          </div>
        )}

        {/* Active Session */}
        {sessionState !== 'mode_select' && sessionState !== 'complete' && currentObjection && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Objection {currentIndex + 1} of {shuffledObjections.length}</span>
                {(mode === 'challenge' || mode === 'random_fire') && sessionState === 'recording' && (
                  <span className={cn("flex items-center gap-1", timeLeft <= 10 && "text-red-500")}>
                    <Timer className="h-4 w-4" />
                    {timeLeft}s
                  </span>
                )}
              </div>
              <Progress value={((currentIndex) / shuffledObjections.length) * 100} />
            </div>

            {/* Objection Card */}
            <ViperCard variant="glass">
              <ViperCardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <Badge variant="outline" className="capitalize">
                    {currentObjection.category}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={cn(
                      currentObjection.difficulty === 'easy' && 'text-green-500 border-green-500/30',
                      currentObjection.difficulty === 'medium' && 'text-yellow-500 border-yellow-500/30',
                      currentObjection.difficulty === 'hard' && 'text-red-500 border-red-500/30'
                    )}
                  >
                    {currentObjection.difficulty}
                  </Badge>
                </div>
                
                <p className="text-lg font-medium mb-4">
                  "{currentObjection.objection_text}"
                </p>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {sessionState === 'ready' && (
                    <Button onClick={handlePlayObjection} className="gap-2">
                      <Volume2 className="h-4 w-4" />
                      Hear It
                    </Button>
                  )}

                  {sessionState === 'playing' && (
                    <Button variant="outline" disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Playing...
                    </Button>
                  )}

                  {sessionState === 'listening' && (
                    <>
                      <Button onClick={handlePlayObjection} variant="outline" className="gap-2">
                        <Volume2 className="h-4 w-4" />
                        Replay
                      </Button>
                      <Button onClick={handleStartRecording} className="gap-2">
                        <Mic className="h-4 w-4" />
                        Record Response
                      </Button>
                    </>
                  )}

                  {sessionState === 'recording' && (
                    <Button 
                      onClick={handleStopRecording} 
                      variant="destructive"
                      className="gap-2 animate-pulse"
                    >
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  )}

                  {sessionState === 'scoring' && (
                    <Button disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isTranscribing ? 'Transcribing...' : 'Scoring...'}
                    </Button>
                  )}
                </div>
              </ViperCardContent>
            </ViperCard>

            {/* Feedback */}
            {sessionState === 'feedback' && currentEvaluation && (
              <ViperCard variant="glass">
                <ViperCardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Your Response</h3>
                    <div className="flex items-center gap-2">
                      {currentEvaluation.score >= 70 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={cn(
                        "text-2xl font-bold",
                        currentEvaluation.score >= 70 ? "text-green-500" : "text-red-500"
                      )}>
                        {currentEvaluation.score}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm italic">"{currentTranscript}"</p>
                  </div>

                  <p className="text-muted-foreground">{currentEvaluation.feedback}</p>

                  {mode === 'practice' && currentEvaluation.suggestedResponse && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium text-primary mb-1">Suggested Response:</p>
                      <p className="text-sm">{currentEvaluation.suggestedResponse}</p>
                    </div>
                  )}

                  <Button onClick={handleNext} className="w-full gap-2">
                    {isLastObjection ? 'View Results' : 'Next Objection'}
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </ViperCardContent>
              </ViperCard>
            )}
          </div>
        )}

        {/* Complete */}
        {sessionState === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="py-6">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
              <p className="text-muted-foreground">
                You handled {scores.length} objections
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <ViperCard variant="glass">
                <ViperCardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </ViperCardContent>
              </ViperCard>
              
              <ViperCard variant="glass">
                <ViperCardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {scores.filter(s => s.score >= 70).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </ViperCardContent>
              </ViperCard>
              
              <ViperCard variant="glass">
                <ViperCardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{scores.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </ViperCardContent>
              </ViperCard>
            </div>

            {/* Individual Scores */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scores.map((score, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <span className="text-sm truncate max-w-[70%]">
                    {score.objection.objection_text}
                  </span>
                  <span className={cn(
                    "font-semibold",
                    score.score >= 70 ? "text-green-500" : "text-red-500"
                  )}>
                    {score.score}%
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Try Another Mode
              </Button>
              <Button onClick={onClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
