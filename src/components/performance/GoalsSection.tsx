import { useState } from "react";
import { Target, Edit2, Check, X } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserGoals, GoalProgress } from "@/hooks/usePerformanceData";

interface GoalsSectionProps {
  goals: UserGoals;
  progress: GoalProgress | null;
  onUpdateGoals: (goals: Partial<UserGoals>) => void;
}

export function GoalsSection({ goals, progress, onUpdateGoals }: GoalsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState(goals);

  const handleSave = () => {
    onUpdateGoals(editedGoals);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedGoals(goals);
    setIsEditing(false);
  };

  const getProgressStatus = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return { label: "Completed!", color: "text-success" };
    if (percentage >= 75) return { label: "Almost there!", color: "text-success" };
    if (percentage >= 50) return { label: "On pace", color: "text-primary" };
    if (percentage >= 25) return { label: "Keep pushing", color: "text-warning" };
    return { label: "Behind", color: "text-destructive" };
  };

  const dailyCallsProgress = progress ? (progress.todayCalls / goals.dailyCallsTarget) * 100 : 0;
  const dailyApptsProgress = progress ? (progress.todayAppointments / goals.dailyAppointmentsTarget) * 100 : 0;
  const weeklyRevenueProgress = progress ? (progress.weekRevenue / goals.weeklyRevenueTarget) * 100 : 0;

  const dailyCallsStatus = getProgressStatus(progress?.todayCalls || 0, goals.dailyCallsTarget);
  const dailyApptsStatus = getProgressStatus(progress?.todayAppointments || 0, goals.dailyAppointmentsTarget);
  const weeklyRevenueStatus = getProgressStatus(progress?.weekRevenue || 0, goals.weeklyRevenueTarget);

  return (
    <ViperCard variant="glass">
      <ViperCardHeader className="flex flex-row items-center justify-between">
        <ViperCardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          My Goals
        </ViperCardTitle>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* Daily Calls Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Daily Calls</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedGoals.dailyCallsTarget}
                onChange={(e) => setEditedGoals({ ...editedGoals, dailyCallsTarget: parseInt(e.target.value) || 0 })}
                className="w-20 h-7 text-right"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {progress?.todayCalls || 0} / {goals.dailyCallsTarget}
                </span>
                <span className={`text-xs font-medium ${dailyCallsStatus.color}`}>
                  {dailyCallsStatus.label}
                </span>
              </div>
            )}
          </div>
          <Progress value={Math.min(dailyCallsProgress, 100)} className="h-2" />
        </div>

        {/* Daily Appointments Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Daily Appointments</p>
            {isEditing ? (
              <Input
                type="number"
                value={editedGoals.dailyAppointmentsTarget}
                onChange={(e) => setEditedGoals({ ...editedGoals, dailyAppointmentsTarget: parseInt(e.target.value) || 0 })}
                className="w-20 h-7 text-right"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {progress?.todayAppointments || 0} / {goals.dailyAppointmentsTarget}
                </span>
                <span className={`text-xs font-medium ${dailyApptsStatus.color}`}>
                  {dailyApptsStatus.label}
                </span>
              </div>
            )}
          </div>
          <Progress value={Math.min(dailyApptsProgress, 100)} className="h-2" />
        </div>

        {/* Weekly Revenue Goal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Weekly Revenue</p>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={editedGoals.weeklyRevenueTarget}
                  onChange={(e) => setEditedGoals({ ...editedGoals, weeklyRevenueTarget: parseInt(e.target.value) || 0 })}
                  className="w-24 h-7 text-right"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  ${(progress?.weekRevenue || 0).toLocaleString()} / ${goals.weeklyRevenueTarget.toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${weeklyRevenueStatus.color}`}>
                  {weeklyRevenueStatus.label}
                </span>
              </div>
            )}
          </div>
          <Progress value={Math.min(weeklyRevenueProgress, 100)} className="h-2" />
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
