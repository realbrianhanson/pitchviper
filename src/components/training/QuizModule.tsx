import { useState } from "react";
import { HelpCircle, CheckCircle, XCircle, RotateCcw, Trophy } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Progress } from "@/components/ui/progress";
import { TrainingModule } from "@/hooks/useTraining";

interface QuizModuleProps {
  module: TrainingModule;
  onComplete: (score: number) => void;
  onBack: () => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

export function QuizModule({ module, onComplete, onBack }: QuizModuleProps) {
  const content = module.content || {};
  const questions: Question[] = content.questions || [];
  const passingScore = content.passing_score || 80;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(module.progress?.status === 'completed');

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleSelectAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: answerIndex
    }));
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    setShowResults(true);
  };

  const getScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setShowFeedback(false);
  };

  const handleComplete = () => {
    const score = getScore();
    if (score >= passingScore) {
      setIsCompleted(true);
      onComplete(score);
    }
  };

  const score = getScore();
  const passed = score >= passingScore;

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <ViperButton variant="ghost" onClick={onBack}>← Back</ViperButton>
        <ViperCard>
          <ViperCardContent className="p-8 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No quiz questions available.</p>
          </ViperCardContent>
        </ViperCard>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <ViperButton variant="ghost" onClick={onBack}>← Back</ViperButton>
          <h2 className="text-xl font-bold">{module.title}</h2>
        </div>

        {/* Results Card */}
        <ViperCard variant="glass">
          <ViperCardContent className="p-8 text-center">
            <div className={`p-6 rounded-full w-fit mx-auto mb-6 ${passed ? 'bg-success/20' : 'bg-destructive/20'}`}>
              {passed ? (
                <Trophy className="h-16 w-16 text-success" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>

            <h3 className="text-2xl font-bold mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h3>

            <p className="text-muted-foreground mb-6">
              {passed 
                ? 'You passed the quiz!' 
                : `You need ${passingScore}% to pass. Keep trying!`
              }
            </p>

            <div className="text-5xl font-bold mb-6">
              <span className={passed ? 'text-success' : 'text-destructive'}>{score}%</span>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8 text-sm text-muted-foreground">
              <span>Correct: {questions.filter(q => selectedAnswers[q.id] === q.correct).length}</span>
              <span>•</span>
              <span>Wrong: {questions.filter(q => selectedAnswers[q.id] !== q.correct).length}</span>
              <span>•</span>
              <span>Passing: {passingScore}%</span>
            </div>

            {/* Review Answers */}
            <div className="text-left space-y-4 mb-8">
              <h4 className="font-semibold">Review Your Answers:</h4>
              {questions.map((q, idx) => {
                const userAnswer = selectedAnswers[q.id];
                const isCorrect = userAnswer === q.correct;

                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium mb-2">Q{idx + 1}: {q.question}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={isCorrect ? 'text-success' : 'text-destructive'}>
                            {q.options[userAnswer]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-success">{q.options[q.correct]}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-3">
              {!passed && (
                <ViperButton variant="outline" onClick={handleRetry}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </ViperButton>
              )}
              {passed && !isCompleted && (
                <ViperButton onClick={handleComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Module
                </ViperButton>
              )}
              <ViperButton variant="outline" onClick={onBack}>
                Exit
              </ViperButton>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ViperButton variant="ghost" onClick={onBack}>← Back</ViperButton>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{module.title}</h2>
          <p className="text-sm text-muted-foreground">Score {passingScore}% or higher to pass</p>
        </div>
        {isCompleted && (
          <ViperBadge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </ViperBadge>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="text-lg">{currentQ.question}</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === idx;
              const isCorrect = idx === currentQ.correct;
              const showCorrectness = showFeedback && isSelected;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={showFeedback}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    showFeedback
                      ? isCorrect
                        ? 'border-success bg-success/10'
                        : isSelected
                          ? 'border-destructive bg-destructive/10'
                          : 'border-border opacity-50'
                      : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      showFeedback && isCorrect
                        ? 'bg-success text-success-foreground'
                        : showFeedback && isSelected && !isCorrect
                          ? 'bg-destructive text-destructive-foreground'
                          : isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                    }`}>
                      {showFeedback && isCorrect ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : showFeedback && isSelected && !isCorrect ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </div>
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`mt-4 p-3 rounded-lg ${
              selectedAnswers[currentQ.id] === currentQ.correct 
                ? 'bg-success/10 border border-success/30' 
                : 'bg-destructive/10 border border-destructive/30'
            }`}>
              <p className={`text-sm font-medium ${
                selectedAnswers[currentQ.id] === currentQ.correct ? 'text-success' : 'text-destructive'
              }`}>
                {selectedAnswers[currentQ.id] === currentQ.correct 
                  ? '✓ Correct!' 
                  : `✗ Incorrect. The correct answer is: ${currentQ.options[currentQ.correct]}`
                }
              </p>
            </div>
          )}
        </ViperCardContent>
      </ViperCard>

      {/* Navigation */}
      <div className="flex justify-end">
        <ViperButton onClick={handleNext} disabled={!showFeedback}>
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
        </ViperButton>
      </div>
    </div>
  );
}
