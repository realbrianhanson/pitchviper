import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ObjectionCategory, ObjectionDifficulty, SortOption } from "@/hooks/useObjections";
import { Filter, SlidersHorizontal } from "lucide-react";

interface ObjectionFiltersProps {
  selectedCategories: ObjectionCategory[];
  setSelectedCategories: (categories: ObjectionCategory[]) => void;
  selectedDifficulties: ObjectionDifficulty[];
  setSelectedDifficulties: (difficulties: ObjectionDifficulty[]) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
}

const categories: { value: ObjectionCategory; label: string }[] = [
  { value: 'price', label: 'Price/Budget' },
  { value: 'timing', label: 'Timing' },
  { value: 'competition', label: 'Competition' },
  { value: 'authority', label: 'Authority/Decision Maker' },
  { value: 'need', label: 'Need/Interest' },
  { value: 'trust', label: 'Trust/Credibility' },
  { value: 'stall', label: 'Stalls/Put-offs' }
];

const difficulties: { value: ObjectionDifficulty; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: 'text-success' },
  { value: 'medium', label: 'Medium', color: 'text-warning' },
  { value: 'hard', label: 'Hard', color: 'text-destructive' }
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'most_used', label: 'Most Used' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'recently_added', label: 'Recently Added' }
];

export function ObjectionFilters({
  selectedCategories,
  setSelectedCategories,
  selectedDifficulties,
  setSelectedDifficulties,
  sortBy,
  setSortBy
}: ObjectionFiltersProps) {
  const toggleCategory = (category: ObjectionCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const toggleDifficulty = (difficulty: ObjectionDifficulty) => {
    if (selectedDifficulties.includes(difficulty)) {
      setSelectedDifficulties(selectedDifficulties.filter(d => d !== difficulty));
    } else {
      setSelectedDifficulties([...selectedDifficulties, difficulty]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <ViperCard variant="glass" className="sticky top-4">
        <ViperCardHeader className="pb-3">
          <ViperCardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-primary" />
            Categories
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="space-y-2">
          {categories.map(category => (
            <div key={category.value} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.value}`}
                checked={selectedCategories.includes(category.value)}
                onCheckedChange={() => toggleCategory(category.value)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor={`category-${category.value}`}
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                {category.label}
              </Label>
            </div>
          ))}
        </ViperCardContent>
      </ViperCard>

      {/* Difficulty Filter */}
      <ViperCard variant="glass">
        <ViperCardHeader className="pb-3">
          <ViperCardTitle className="flex items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Difficulty
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="space-y-2">
          {difficulties.map(difficulty => (
            <div key={difficulty.value} className="flex items-center space-x-2">
              <Checkbox
                id={`difficulty-${difficulty.value}`}
                checked={selectedDifficulties.includes(difficulty.value)}
                onCheckedChange={() => toggleDifficulty(difficulty.value)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor={`difficulty-${difficulty.value}`}
                className={`text-sm cursor-pointer hover:text-foreground transition-colors ${difficulty.color}`}
              >
                {difficulty.label}
              </Label>
            </div>
          ))}
        </ViperCardContent>
      </ViperCard>

      {/* Sort Options */}
      <ViperCard variant="glass">
        <ViperCardHeader className="pb-3">
          <ViperCardTitle className="text-sm">Sort By</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <RadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            {sortOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={`sort-${option.value}`}
                  className="border-border text-primary"
                />
                <Label
                  htmlFor={`sort-${option.value}`}
                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}
