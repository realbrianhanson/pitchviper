import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOSModal } from "./SOSModal";

export function SOSButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-destructive hover:bg-destructive/90",
          "animate-pulse hover:animate-none",
          "transition-all duration-200 hover:scale-110"
        )}
        size="icon"
      >
        <AlertTriangle className="h-6 w-6" />
        <span className="sr-only">SOS - Request Help</span>
      </Button>

      <SOSModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
