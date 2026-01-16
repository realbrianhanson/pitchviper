import { useState } from 'react';
import { Filter, Users, Calendar, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PipelineFiltersProps {
  showTeamDeals: boolean;
  setShowTeamDeals: (show: boolean) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  valueRange: { min: number | null; max: number | null };
  setValueRange: (range: { min: number | null; max: number | null }) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export function PipelineFilters({
  showTeamDeals,
  setShowTeamDeals,
  dateRange,
  setDateRange,
  valueRange,
  setValueRange,
  activeFiltersCount,
  onClearFilters,
}: PipelineFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 mr-4">
        <Switch
          id="team-deals"
          checked={showTeamDeals}
          onCheckedChange={setShowTeamDeals}
        />
        <Label htmlFor="team-deals" className="text-sm cursor-pointer flex items-center gap-1">
          <Users className="h-4 w-4" />
          Team Deals
        </Label>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filters</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearFilters();
                    setIsOpen(false);
                  }}
                  className="text-xs h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expected Close Date
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Deal Value Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={valueRange.min ?? ''}
                    onChange={(e) => setValueRange({ ...valueRange, min: e.target.value ? Number(e.target.value) : null })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max</Label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={valueRange.max ?? ''}
                    onChange={(e) => setValueRange({ ...valueRange, max: e.target.value ? Number(e.target.value) : null })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
