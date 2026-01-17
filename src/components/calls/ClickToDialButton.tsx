import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useClickToDial } from '@/hooks/useClickToDial';
import { cn } from '@/lib/utils';

interface ClickToDialButtonProps {
  phoneNumber: string;
  contactName?: string;
  companyName?: string;
  dealId?: string;
  variant?: 'icon' | 'button' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ClickToDialButton({
  phoneNumber,
  contactName,
  companyName,
  dealId,
  variant = 'icon',
  size = 'md',
  className,
}: ClickToDialButtonProps) {
  const { openDialModal } = useClickToDial();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDialModal({
      phoneNumber,
      contactName,
      companyName,
      dealId,
    });
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors",
          className
        )}
      >
        <Phone className={iconSizes[size]} />
        <span className="underline">{phoneNumber}</span>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size={size === 'lg' ? 'default' : 'sm'}
        className={cn("gap-2", className)}
      >
        <Phone className={iconSizes[size]} />
        Call
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleClick}
          variant="ghost"
          size="icon"
          className={cn(
            sizeClasses[size],
            "text-primary hover:text-primary/80 hover:bg-primary/10",
            className
          )}
        >
          <Phone className={iconSizes[size]} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Call {contactName || phoneNumber}</p>
      </TooltipContent>
    </Tooltip>
  );
}
