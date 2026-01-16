import { useState } from "react";
import { TeamMember } from "@/hooks/useManagerDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViperBadge } from "@/components/ui/viper-badge";
import { ViperButton } from "@/components/ui/viper-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MessageSquare, BarChart2, UserCog, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamTableProps {
  members: TeamMember[];
  isLoading: boolean;
}

type SortField = 'name' | 'today_calls' | 'today_appointments' | 'today_revenue' | 'current_streak' | 'current_level';
type SortDirection = 'asc' | 'desc';
type PerformanceFilter = 'all' | 'above' | 'below';
type StatusFilter = 'all' | 'available' | 'on_call' | 'in_meeting' | 'away' | 'offline';

const statusColors: Record<TeamMember['status'], { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-success', text: 'text-success', label: 'Available' },
  on_call: { bg: 'bg-warning', text: 'text-warning', label: 'On Call' },
  in_meeting: { bg: 'bg-primary', text: 'text-primary', label: 'In Meeting' },
  away: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Away' },
  offline: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Offline' },
};

export function TeamTable({ members, isLoading }: TeamTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [performanceFilter, setPerformanceFilter] = useState<PerformanceFilter>('all');
  const [sortField, setSortField] = useState<SortField>('today_calls');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const callTarget = 50;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredMembers = members
    .filter(m => {
      if (search && !m.full_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }
      if (performanceFilter === 'above' && m.today_calls < callTarget) {
        return false;
      }
      if (performanceFilter === 'below' && m.today_calls >= callTarget) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'name':
          aVal = a.full_name;
          bVal = b.full_name;
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="on_call">On Call</SelectItem>
            <SelectItem value="in_meeting">In Meeting</SelectItem>
            <SelectItem value="away">Away</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        <Select value={performanceFilter} onValueChange={(v) => setPerformanceFilter(v as PerformanceFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Performance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Performance</SelectItem>
            <SelectItem value="above">Above Target</SelectItem>
            <SelectItem value="below">Below Target</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[200px]">
                <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                  Team Member
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead className="text-center">
                <button onClick={() => handleSort('today_calls')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                  Calls
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button onClick={() => handleSort('today_appointments')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                  Appts
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button onClick={() => handleSort('today_revenue')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                  Revenue
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button onClick={() => handleSort('current_streak')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                  Streak
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.user_id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      {member.title && (
                        <p className="text-xs text-muted-foreground">{member.title}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <ViperBadge variant="default" size="sm">
                    Lvl {member.current_level}
                  </ViperBadge>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    "font-semibold",
                    member.today_calls >= callTarget ? "text-success" : 
                    member.today_calls >= callTarget * 0.5 ? "text-warning" : "text-destructive"
                  )}>
                    {member.today_calls}
                  </span>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {member.today_appointments}
                </TableCell>
                <TableCell className="text-center font-medium text-success">
                  ${member.today_revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-warning font-medium">🔥 {member.current_streak}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", statusColors[member.status].bg)} />
                    <span className={cn("text-sm", statusColors[member.status].text)}>
                      {statusColors[member.status].label}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ViperButton size="sm" variant="ghost" title="Quick Coach">
                      <MessageSquare className="h-4 w-4" />
                    </ViperButton>
                    <ViperButton size="sm" variant="ghost" title="View Stats">
                      <BarChart2 className="h-4 w-4" />
                    </ViperButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No team members match your filters.
          </div>
        )}
      </div>
    </div>
  );
}