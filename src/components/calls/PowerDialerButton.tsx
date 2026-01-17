import { Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClickToDial } from '@/hooks/useClickToDial';
import { cn } from '@/lib/utils';

interface Contact {
  phoneNumber: string;
  name?: string;
  companyName?: string;
  email?: string;
}

interface PowerDialerButtonProps {
  contacts: Contact | Contact[];
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md';
  className?: string;
}

export function PowerDialerButton({
  contacts,
  variant = 'button',
  size = 'md',
  className,
}: PowerDialerButtonProps) {
  const { addToPowerDialer } = useClickToDial();
  const [isLoading, setIsLoading] = useState(false);

  const contactArray = Array.isArray(contacts) ? contacts : [contacts];
  const count = contactArray.length;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await addToPowerDialer(contactArray);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            variant="ghost"
            size="icon"
            disabled={isLoading}
            className={cn(
              size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
              "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10",
              className
            )}
          >
            {isLoading ? (
              <Loader2 className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'animate-spin')} />
            ) : (
              <Zap className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add to Power Dialer</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      disabled={isLoading}
      className={cn("gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10", className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Zap className="h-4 w-4" />
      )}
      {count > 1 ? `Add ${count} to Power Dialer` : 'Power Dialer'}
    </Button>
  );
}
