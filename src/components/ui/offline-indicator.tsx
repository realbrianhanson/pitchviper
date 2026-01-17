import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnecting, setShowReconnecting] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnecting(true);
        setTimeout(() => setShowReconnecting(false), 3000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            You're offline. Some features may be unavailable.
          </span>
        </motion.div>
      )}

      {showReconnecting && isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white py-2 px-4 flex items-center justify-center gap-2"
        >
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">
            Back online! Reconnecting...
          </span>
          <RefreshCw className="h-4 w-4 animate-spin" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
