import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FollowUp {
  id: string;
  company: string;
  contact: string;
  time: string;
  type: string;
  deal_id?: string;
}

export function useUpcomingFollowUps() {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFollowUps([]);
      setIsLoading(false);
      return;
    }

    const fetchFollowUps = async () => {
      setIsLoading(true);
      try {
        // Get deals that need follow-up (not closed, updated in last 7 days, or with expected close date)
        const { data: deals, error } = await supabase
          .from('deals')
          .select('id, company_name, contact_name, expected_close_date, stage, updated_at')
          .eq('user_id', user.id)
          .not('stage', 'in', '("closed_won","closed_lost")')
          .order('expected_close_date', { ascending: true, nullsFirst: false })
          .limit(10);

        if (error) throw error;

        // Transform deals into follow-ups
        const now = new Date();
        const transformedFollowUps: FollowUp[] = (deals || [])
          .filter(deal => {
            // Include if has expected close date within next 7 days or no date
            if (!deal.expected_close_date) return true;
            const closeDate = new Date(deal.expected_close_date);
            const daysUntilClose = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilClose <= 7 && daysUntilClose >= -3; // Include slightly overdue
          })
          .slice(0, 5)
          .map((deal, index) => {
            // Generate follow-up times throughout the day
            const hour = 9 + (index * 2); // 9am, 11am, 1pm, 3pm, 5pm
            const timeStr = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
            
            // Determine follow-up type based on stage
            let followUpType = 'Follow-up';
            if (deal.stage === 'demo') followUpType = 'Demo Prep';
            else if (deal.stage === 'proposal') followUpType = 'Proposal Review';
            else if (deal.stage === 'negotiation') followUpType = 'Negotiation';
            else if (deal.stage === 'discovery') followUpType = 'Discovery Call';
            
            return {
              id: deal.id,
              company: deal.company_name,
              contact: deal.contact_name,
              time: timeStr,
              type: followUpType,
              deal_id: deal.id,
            };
          });

        setFollowUps(transformedFollowUps);
      } catch (error) {
        console.error('Error fetching follow-ups:', error);
        setFollowUps([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowUps();
  }, [user]);

  return { followUps, isLoading };
}
