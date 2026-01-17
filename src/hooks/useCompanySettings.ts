import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CompanySettings {
  id: string;
  team_id: string | null;
  company_name: string;
  product_description: string;
  value_propositions: string[];
  common_use_cases: string[];
  industry: string | null;
  target_audience: string | null;
}

export function useCompanySettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!profile?.team_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .eq("team_id", profile.team_id)
          .maybeSingle();

        if (error) throw error;
        setSettings(data);
      } catch (error) {
        console.error("Error fetching company settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [profile?.team_id]);

  const saveSettings = async (updates: Partial<CompanySettings>) => {
    if (!profile?.team_id) {
      toast.error("You must be part of a team to save company settings");
      return;
    }

    setIsSaving(true);
    try {
      const settingsData = {
        team_id: profile.team_id,
        company_name: updates.company_name || "",
        product_description: updates.product_description || "",
        value_propositions: updates.value_propositions || [],
        common_use_cases: updates.common_use_cases || [],
        industry: updates.industry || null,
        target_audience: updates.target_audience || null,
      };

      if (settings?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("company_settings")
          .update(settingsData)
          .eq("id", settings.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("company_settings")
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      toast.success("Company profile saved!");
    } catch (error) {
      console.error("Error saving company settings:", error);
      toast.error("Failed to save company profile");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    saveSettings,
  };
}
