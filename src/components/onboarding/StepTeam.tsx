import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { cn } from "@/lib/utils";
import { Users, Plus, ArrowRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type TeamOption = "join" | "create" | "skip" | null;

interface TeamData {
  teamId: string | null;
  teamName: string | null;
  teamCode: string | null;
}

interface StepTeamProps {
  isManager: boolean;
  onComplete: (data: TeamData) => void;
  onBack: () => void;
}

export function StepTeam({ isManager, onComplete, onBack }: StepTeamProps) {
  const { user } = useAuth();
  const [option, setOption] = useState<TeamOption>(null);
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Find team by code
      const { data: team, error: findError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("team_code", teamCode.toUpperCase())
        .single();

      if (findError || !team) {
        setError("Team not found. Check the code and try again.");
        return;
      }

      setSuccess(`Found team: ${team.name}`);
      setTimeout(() => {
        onComplete({ teamId: team.id, teamName: team.name, teamCode: teamCode.toUpperCase() });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !user) return;
    setLoading(true);
    setError(null);

    try {
      // Generate unique team code
      const { data: generatedCode, error: codeError } = await supabase
        .rpc("generate_team_code");

      if (codeError) throw codeError;

      // Create team
      const { data: team, error: createError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          team_code: generatedCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      setSuccess(`Team created! Code: ${team.team_code}`);
      setTimeout(() => {
        onComplete({ teamId: team.id, teamName: team.name, teamCode: team.team_code });
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          Join or Create a Team
        </h2>
        <p className="text-muted-foreground">
          Teams compete together and share insights. Join your squad!
        </p>
      </div>

      {/* Option Selection */}
      {option === null && (
        <div className="grid gap-4">
          <ViperCard
            variant="glass"
            hover="glow"
            className="cursor-pointer"
            onClick={() => setOption("join")}
          >
            <ViperCardContent className="p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">Join Existing Team</h3>
                <p className="text-sm text-muted-foreground">I have a team code</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </ViperCardContent>
          </ViperCard>

          {isManager && (
            <ViperCard
              variant="glass"
              hover="glow"
              className="cursor-pointer"
              onClick={() => setOption("create")}
            >
              <ViperCardContent className="p-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground">Create New Team</h3>
                  <p className="text-sm text-muted-foreground">Start your own squad</p>
                </div>
                <ViperBadge variant="success" className="text-xs">Manager</ViperBadge>
              </ViperCardContent>
            </ViperCard>
          )}

          <button
            onClick={() => onComplete({ teamId: null, teamName: null, teamCode: null })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Skip for now — I'll go solo
          </button>
        </div>
      )}

      {/* Join Team Form */}
      {option === "join" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Team Code</label>
            <ViperInput
              type="text"
              placeholder="Enter 6-character code"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest uppercase"
              variant="glow"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-success">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <ViperButton variant="ghost" onClick={() => setOption(null)} className="flex-1">
              Back
            </ViperButton>
            <ViperButton onClick={handleJoinTeam} disabled={teamCode.length !== 6 || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Team"}
            </ViperButton>
          </div>
        </div>
      )}

      {/* Create Team Form */}
      {option === "create" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Team Name</label>
            <ViperInput
              type="text"
              placeholder="e.g., The Closers, Alpha Squad"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              variant="glow"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm text-success">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <ViperButton variant="ghost" onClick={() => setOption(null)} className="flex-1">
              Back
            </ViperButton>
            <ViperButton onClick={handleCreateTeam} disabled={!teamName.trim() || loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Team"}
            </ViperButton>
          </div>
        </div>
      )}

      {option === null && (
        <div className="flex gap-3 pt-4 mt-4">
          <ViperButton variant="ghost" onClick={onBack} className="flex-1">
            Back
          </ViperButton>
        </div>
      )}
    </div>
  );
}