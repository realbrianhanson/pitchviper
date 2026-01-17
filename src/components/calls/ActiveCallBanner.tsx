import { useState, useEffect } from 'react';
import { Phone, X, MessageSquare, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClickToDial } from '@/hooks/useClickToDial';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ActiveCallBanner() {
  const { callState, endCall, updateCallNotes } = useClickToDial();
  const [elapsed, setElapsed] = useState('00:00');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (!callState.isActive || !callState.startTime) return;

    const interval = setInterval(() => {
      const diff = Date.now() - callState.startTime!.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState.isActive, callState.startTime]);

  if (!callState.isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white shadow-lg"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Call Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Phone className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full animate-pulse" />
                </div>
                <span className="font-semibold">On Call</span>
              </div>
              
              <div className="hidden sm:block h-6 w-px bg-white/30" />
              
              <div className="hidden sm:block">
                <p className="font-medium">{callState.contactName}</p>
                <p className="text-xs text-white/80">{callState.phoneNumber}</p>
              </div>
              
              <div className="h-6 w-px bg-white/30" />
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{elapsed}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setShowNotes(!showNotes)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Notes</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  // Quick objection log - could open a modal
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Objection</span>
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={endCall}
              >
                <X className="h-4 w-4 mr-1" />
                End Call
              </Button>
            </div>
          </div>

          {/* Notes Field */}
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 mt-3 border-t border-white/20">
                  <Input
                    placeholder="Type call notes here..."
                    value={callState.notes}
                    onChange={(e) => updateCallNotes(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
