import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  Clock,
  User
} from "lucide-react";
import { ViperCard } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SOSAlert {
  id: string;
  user_id: string;
  alert_type: string;
  note: string | null;
  status: "pending" | "acknowledged" | "resolved";
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    phone_extension: string | null;
  };
}

interface MobileSOSAlertsProps {
  teamId: string | null;
}

export function MobileSOSAlerts({ teamId }: MobileSOSAlertsProps) {
  const { user, isManager } = useAuth();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!teamId) return;

    const { data, error } = await supabase
      .from("sos_alerts")
      .select("*")
      .eq("team_id", teamId)
      .in("status", ["pending", "acknowledged"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching SOS alerts:", error);
      return;
    }

    // Fetch profiles for each alert
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone_extension")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const alertsWithProfiles = data.map(alert => ({
        ...alert,
        status: alert.status as "pending" | "acknowledged" | "resolved",
        profile: profilesMap.get(alert.user_id)
      }));

      setAlerts(alertsWithProfiles);
    } else {
      setAlerts([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time updates
    if (!teamId) return;

    const channel = supabase
      .channel("sos-alerts-mobile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sos_alerts",
          filter: `team_id=eq.${teamId}`
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const handleAcknowledge = async (alertId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("sos_alerts")
        .update({ 
          status: "acknowledged",
          acknowledged_by: user.id 
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alert acknowledged - help is on the way!");
      fetchAlerts();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast.error("Failed to acknowledge alert");
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("sos_alerts")
        .update({ 
          status: "resolved",
          resolved_at: new Date().toISOString()
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alert resolved!");
      fetchAlerts();
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  };

  if (!isManager || alerts.length === 0) return null;

  const pendingAlerts = alerts.filter(a => a.status === "pending");

  return (
    <div className="space-y-3">
      {/* Urgent banner for pending alerts */}
      {pendingAlerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">
              {pendingAlerts.length} Rep{pendingAlerts.length > 1 ? "s" : ""} Need Help!
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Team members are requesting assistance
          </p>
        </div>
      )}

      {/* Alert cards */}
      {alerts.map((alert) => (
        <ViperCard
          key={alert.id}
          className={cn(
            "p-4",
            alert.status === "pending" && "border-red-500/50 bg-red-500/5"
          )}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {alert.profile?.avatar_url ? (
              <img
                src={alert.profile.avatar_url}
                alt={alert.profile.full_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">
                  {alert.profile?.full_name || "Team member"}
                </span>
                <Badge 
                  variant={alert.status === "pending" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {alert.status === "pending" ? "Needs Help" : "Being Helped"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-1">
                {alert.alert_type}
              </p>

              {alert.note && (
                <p className="text-sm bg-accent rounded p-2 mb-2">
                  "{alert.note}"
                </p>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {alert.profile?.phone_extension && (
              <ViperButton
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => {
                  toast.info(`Calling ext. ${alert.profile?.phone_extension}...`);
                }}
              >
                <Phone className="h-4 w-4" />
                Call
              </ViperButton>
            )}

            <ViperButton
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                toast.info("Opening chat...");
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </ViperButton>

            {alert.status === "pending" ? (
              <ViperButton
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleAcknowledge(alert.id)}
              >
                <CheckCircle className="h-4 w-4" />
                I'm Helping
              </ViperButton>
            ) : (
              <ViperButton
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleResolve(alert.id)}
              >
                <CheckCircle className="h-4 w-4" />
                Resolved
              </ViperButton>
            )}
          </div>
        </ViperCard>
      ))}
    </div>
  );
}
