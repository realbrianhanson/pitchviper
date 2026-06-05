import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useObjections } from "@/hooks/useObjections";
import { ObjectionFilters } from "@/components/objections/ObjectionFilters";
import { ObjectionCard } from "@/components/objections/ObjectionCard";
import { AddObjectionModal } from "@/components/objections/AddObjectionModal";
import { AddResponseModal } from "@/components/objections/AddResponseModal";
import { AudioFlashcards } from "@/components/objections/AudioFlashcards";
import { AudioLeaderboard } from "@/components/objections/AudioLeaderboard";
import { Shield, Search, Plus, Loader2, Sparkles, Volume2, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ObjectionVault() {
  const navigate = useNavigate();
  const {
    objections,
    allObjections,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    selectedDifficulties,
    setSelectedDifficulties,
    sortBy,
    setSortBy,
    addObjection,
    addResponse,
    voteResponse,
    incrementUsage
  } = useObjections();

  const [isAddObjectionOpen, setIsAddObjectionOpen] = useState(false);
  const [addResponseObjectionId, setAddResponseObjectionId] = useState<string | null>(null);
  const [isAudioFlashcardsOpen, setIsAudioFlashcardsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const selectedObjection = addResponseObjectionId 
    ? allObjections.find(o => o.id === addResponseObjectionId)
    : null;

  const handleCopy = (text: string) => {
    // Could track analytics here
  };

  const handlePractice = (objectionId: string) => {
    // Navigate to roleplay with this objection
    navigate(`/roleplay?objection=${objectionId}`);
  };

  const handleAddResponse = async (data: { response_text: string; approach: any }) => {
    if (!addResponseObjectionId) return false;
    return addResponse(addResponseObjectionId, data);
  };

  return (
    <AppLayout title="Objection Vault">
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground font-outfit">
                Objection Vault
              </h1>
            </div>
            <p className="text-muted-foreground">
              Every objection conquered. Every response battle-tested.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsLeaderboardOpen(true)}
              className="shrink-0"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setIsAudioFlashcardsOpen(true)}
              className="shrink-0"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Practice with Audio
            </Button>
            <Button onClick={() => setIsAddObjectionOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Objection
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search objections, responses, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 text-lg bg-card border-border"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <ObjectionFilters
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              selectedDifficulties={selectedDifficulties}
              setSelectedDifficulties={setSelectedDifficulties}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          </div>

          {/* Objection Cards */}
          <div className="lg:col-span-3 space-y-4">
            {isLoading ? (
              <EditorialLoading label="Loading Objections" />
            ) : objections.length === 0 ? (
              <EditorialEmpty
                eyebrow="The Vault"
                icon={<Sparkles className="h-10 w-10" strokeWidth={1.2} />}
                title={
                  searchQuery || selectedCategories.length > 0 || selectedDifficulties.length > 0
                    ? "Nothing matches your filters."
                    : "The vault is empty."
                }
                description={
                  searchQuery || selectedCategories.length > 0 || selectedDifficulties.length > 0
                    ? "Loosen the filters or change the search terms."
                    : "Add the first objection and build the playbook."
                }
                action={
                  !searchQuery && selectedCategories.length === 0 && selectedDifficulties.length === 0 ? (
                    <Button onClick={() => setIsAddObjectionOpen(true)} className="rounded-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Objection
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Showing {objections.length} of {allObjections.length} objections
                </p>
                {objections.map(objection => (
                  <ObjectionCard
                    key={objection.id}
                    objection={objection}
                    onVote={voteResponse}
                    onCopy={handleCopy}
                    onPractice={handlePractice}
                    onAddResponse={(id) => setAddResponseObjectionId(id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddObjectionModal
        isOpen={isAddObjectionOpen}
        onClose={() => setIsAddObjectionOpen(false)}
        onAdd={addObjection}
      />

      <AddResponseModal
        isOpen={!!addResponseObjectionId}
        onClose={() => setAddResponseObjectionId(null)}
        objectionText={selectedObjection?.objection_text}
        onAdd={handleAddResponse}
      />

      <AudioFlashcards
        isOpen={isAudioFlashcardsOpen}
        onClose={() => setIsAudioFlashcardsOpen(false)}
        objections={allObjections}
      />

      <AudioLeaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </AppLayout>
  );
}
