import { useState } from "react";
import { Plus, Trophy, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperButton } from "@/components/ui/viper-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveCompetitions } from "@/components/competitions/ActiveCompetitions";
import { CreateCompetitionModal } from "@/components/competitions/CreateCompetitionModal";
import { CompetitionDetailModal } from "@/components/competitions/CompetitionDetailModal";
import { PastCompetitions } from "@/components/competitions/PastCompetitions";
import { useCompetitions, Competition, CreateCompetitionData } from "@/hooks/useCompetitions";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CompetitionsManager() {
  const { isManager } = useAuth();
  const { 
    activeCompetitions, 
    pastCompetitions, 
    isLoading, 
    createCompetition, 
    endCompetition,
    refetch 
  } = useCompetitions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [competitionToEnd, setCompetitionToEnd] = useState<string | null>(null);

  const handleCreateCompetition = async (data: CreateCompetitionData) => {
    await createCompetition(data);
  };

  const handleViewDetails = (competition: Competition) => {
    setSelectedCompetition(competition);
    setShowDetailModal(true);
  };

  const handleEndCompetition = (competitionId: string) => {
    setCompetitionToEnd(competitionId);
  };

  const confirmEndCompetition = async () => {
    if (competitionToEnd) {
      await endCompetition(competitionToEnd);
      setCompetitionToEnd(null);
    }
  };

  if (!isManager) {
    return (
      <AppLayout title="Competitions">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only managers can access the competition management console.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Competitions"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Competition Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViperButton variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </ViperButton>
            <ViperButton onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Competition
            </ViperButton>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Active & Upcoming ({activeCompetitions.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Past ({pastCompetitions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ActiveCompetitions 
              competitions={activeCompetitions}
              onViewDetails={handleViewDetails}
              onEndCompetition={handleEndCompetition}
            />
          </TabsContent>

          <TabsContent value="past">
            <PastCompetitions 
              competitions={pastCompetitions}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateCompetitionModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCompetition}
      />

      <CompetitionDetailModal
        competition={selectedCompetition}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCompetition(null);
        }}
        onEndCompetition={handleEndCompetition}
      />

      {/* End Competition Confirmation */}
      <AlertDialog open={!!competitionToEnd} onOpenChange={() => setCompetitionToEnd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Competition Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end the competition and finalize the current standings. 
              Winners will be determined based on current rankings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndCompetition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              End Competition
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
