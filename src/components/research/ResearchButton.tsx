import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProspectResearchPanel } from './ProspectResearchPanel';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchData } from '@/hooks/useProspectResearch';

interface ResearchButtonProps {
  companyName?: string;
  companyUrl?: string;
  contactName?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSaveToContact?: (research: ResearchData) => void;
}

export function ResearchButton({
  companyName = '',
  companyUrl = '',
  contactName = '',
  variant = 'outline',
  size = 'sm',
  className,
  onSaveToContact,
}: ResearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <Search className="h-4 w-4" />
        Research
      </Button>

      <ProspectResearchPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialCompanyName={companyName}
        initialCompanyUrl={companyUrl}
        initialContactName={contactName}
        onSaveToContact={onSaveToContact}
      />
    </>
  );
}
