import { useEffect, useState } from "react";
import { Radio, Phone, Calendar, DollarSign, Clock } from "lucide-react";
import { useAnimatedCounter, formatCurrency } from "@/hooks/useAnimatedCounter";

interface LiveStatsBannerProps {
  totalCalls: number;
  totalAppointments: number;
  totalRevenue: number;
  totalDeals: number;
}

export function LiveStatsBanner({
  totalCalls,
  totalAppointments,
  totalRevenue,
  totalDeals,
}: LiveStatsBannerProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const animatedCalls = useAnimatedCounter(totalCalls, { duration: 800 });
  const animatedAppointments = useAnimatedCounter(totalAppointments, { duration: 800 });
  const animatedDeals = useAnimatedCounter(totalDeals, { duration: 800 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="bg-gradient-to-r from-background via-card to-background border-b border-border/50 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <span className="text-destructive font-bold uppercase tracking-wider text-sm">
              LIVE
            </span>
          </div>
          <Radio className="h-5 w-5 text-primary animate-pulse" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 px-4 py-2 bg-card/50 rounded-lg border border-border/30">
            <Phone className="h-5 w-5 text-primary" />
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {animatedCalls}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Calls Today
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-card/50 rounded-lg border border-border/30">
            <Calendar className="h-5 w-5 text-secondary" />
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {animatedAppointments}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Appointments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-card/50 rounded-lg border border-border/30">
            <DollarSign className="h-5 w-5 text-success" />
            <div className="text-right">
              <p className="text-2xl font-bold text-success tabular-nums">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Revenue Closed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-card/50 rounded-lg border border-border/30">
            <div className="h-5 w-5 flex items-center justify-center text-warning font-bold">
              {animatedDeals}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Deals Closed
              </p>
            </div>
          </div>
        </div>

        {/* Current Time */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono text-lg tabular-nums">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
