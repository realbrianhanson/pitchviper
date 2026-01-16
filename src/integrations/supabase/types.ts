export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          id: string
          metadata: Json | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          appointment_scheduled_at: string | null
          call_purpose: Database["public"]["Enums"]["call_purpose"] | null
          callback_scheduled_at: string | null
          company_name: string | null
          contact_name: string
          created_at: string
          deal_value: number | null
          direction: Database["public"]["Enums"]["call_direction"]
          disposition: string | null
          duration_seconds: number
          id: string
          improvement_notes: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          phone_number: string | null
          self_rating: number | null
          struggled_objections: string[] | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          appointment_scheduled_at?: string | null
          call_purpose?: Database["public"]["Enums"]["call_purpose"] | null
          callback_scheduled_at?: string | null
          company_name?: string | null
          contact_name: string
          created_at?: string
          deal_value?: number | null
          direction: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number
          id?: string
          improvement_notes?: string | null
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          phone_number?: string | null
          self_rating?: number | null
          struggled_objections?: string[] | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          appointment_scheduled_at?: string | null
          call_purpose?: Database["public"]["Enums"]["call_purpose"] | null
          callback_scheduled_at?: string | null
          company_name?: string | null
          contact_name?: string
          created_at?: string
          deal_value?: number | null
          direction?: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number
          id?: string
          improvement_notes?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
          phone_number?: string | null
          self_rating?: number | null
          struggled_objections?: string[] | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at: string
          description: string
          id: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          challenge_date?: string
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          description: string
          id?: string
          target_value: number
          title: string
          xp_reward?: number
        }
        Update: {
          challenge_date?: string
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          description?: string
          id?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          appointments_set: number
          calls_made: number
          calls_received: number
          created_at: string
          date: string
          deals_closed: number
          deals_lost: number
          id: string
          revenue_closed: number
          talk_time_minutes: number
          user_id: string
        }
        Insert: {
          appointments_set?: number
          calls_made?: number
          calls_received?: number
          created_at?: string
          date?: string
          deals_closed?: number
          deals_lost?: number
          id?: string
          revenue_closed?: number
          talk_time_minutes?: number
          user_id: string
        }
        Update: {
          appointments_set?: number
          calls_made?: number
          calls_received?: number
          created_at?: string
          date?: string
          deals_closed?: number
          deals_lost?: number
          id?: string
          revenue_closed?: number
          talk_time_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_level: number
          current_streak: number
          full_name: string
          hire_date: string | null
          id: string
          longest_streak: number
          onboarding_completed: boolean
          phone_extension: string | null
          team_code: string | null
          team_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          xp_points: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          full_name: string
          hire_date?: string | null
          id?: string
          longest_streak?: number
          onboarding_completed?: boolean
          phone_extension?: string | null
          team_code?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          xp_points?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          full_name?: string
          hire_date?: string | null
          id?: string
          longest_streak?: number
          onboarding_completed?: boolean
          phone_extension?: string | null
          team_code?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          xp_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roleplay_scenarios: {
        Row: {
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["roleplay_difficulty"]
          estimated_minutes: number
          id: string
          is_active: boolean
          name: string
          objections_to_include: string[]
          prospect_persona: string
          prospect_situation: string
          sort_order: number
          win_conditions: string[]
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: Database["public"]["Enums"]["roleplay_difficulty"]
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          objections_to_include: string[]
          prospect_persona: string
          prospect_situation: string
          sort_order?: number
          win_conditions: string[]
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["roleplay_difficulty"]
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          objections_to_include?: string[]
          prospect_persona?: string
          prospect_situation?: string
          sort_order?: number
          win_conditions?: string[]
          xp_reward?: number
        }
        Relationships: []
      }
      roleplay_sessions: {
        Row: {
          completed_at: string | null
          duration_seconds: number | null
          feedback: string | null
          id: string
          scenario_id: string
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["roleplay_session_status"]
          transcript: Json
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_seconds?: number | null
          feedback?: string | null
          id?: string
          scenario_id: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["roleplay_session_status"]
          transcript?: Json
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_seconds?: number | null
          feedback?: string | null
          id?: string
          scenario_id?: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["roleplay_session_status"]
          transcript?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleplay_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "roleplay_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          note: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["sos_alert_status"]
          team_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sos_alert_status"]
          team_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["sos_alert_status"]
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          team_code: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          team_code: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          team_code?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          celebration_sounds_enabled: boolean
          created_at: string
          id: string
          notification_sounds_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          celebration_sounds_enabled?: boolean
          created_at?: string
          id?: string
          notification_sounds_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          celebration_sounds_enabled?: boolean
          created_at?: string
          id?: string
          notification_sounds_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          current_call_started_at: string | null
          id: string
          last_activity_at: string
          status: Database["public"]["Enums"]["user_status_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_call_started_at?: string | null
          id?: string
          last_activity_at?: string
          status?: Database["public"]["Enums"]["user_status_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_call_started_at?: string | null
          id?: string
          last_activity_at?: string
          status?: Database["public"]["Enums"]["user_status_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_streak: { Args: { p_user_id: string }; Returns: number }
      generate_team_code: { Args: never; Returns: string }
      get_or_create_daily_stats: {
        Args: { p_user_id: string }
        Returns: {
          appointments_set: number
          calls_made: number
          calls_received: number
          created_at: string
          date: string
          deals_closed: number
          deals_lost: number
          id: string
          revenue_closed: number
          talk_time_minutes: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_stats"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_user_status: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          current_call_started_at: string | null
          id: string
          last_activity_at: string
          status: Database["public"]["Enums"]["user_status_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_status"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_activity_type: Database["public"]["Enums"]["activity_type"]
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          id: string
          metadata: Json | null
          team_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "activities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_user_status: {
        Args: {
          p_call_started_at?: string
          p_status: Database["public"]["Enums"]["user_status_type"]
          p_user_id: string
        }
        Returns: {
          created_at: string
          current_call_started_at: string | null
          id: string
          last_activity_at: string
          status: Database["public"]["Enums"]["user_status_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_status"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      activity_type:
        | "call_made"
        | "call_received"
        | "appointment_set"
        | "deal_closed"
        | "deal_lost"
        | "roleplay_completed"
        | "badge_earned"
        | "level_up"
        | "training_completed"
      app_role: "rep" | "manager"
      call_direction: "inbound" | "outbound"
      call_outcome: "connected" | "voicemail" | "no_answer" | "wrong_number"
      call_purpose:
        | "cold_call"
        | "follow_up"
        | "appointment"
        | "demo"
        | "closing"
        | "support"
      challenge_type:
        | "calls"
        | "appointments"
        | "roleplay"
        | "objection_practice"
        | "custom"
      roleplay_difficulty: "rookie" | "pro" | "expert" | "nightmare"
      roleplay_session_status: "in_progress" | "completed" | "abandoned"
      sos_alert_status: "pending" | "acknowledged" | "resolved"
      user_status_type:
        | "available"
        | "on_call"
        | "in_meeting"
        | "away"
        | "offline"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "call_made",
        "call_received",
        "appointment_set",
        "deal_closed",
        "deal_lost",
        "roleplay_completed",
        "badge_earned",
        "level_up",
        "training_completed",
      ],
      app_role: ["rep", "manager"],
      call_direction: ["inbound", "outbound"],
      call_outcome: ["connected", "voicemail", "no_answer", "wrong_number"],
      call_purpose: [
        "cold_call",
        "follow_up",
        "appointment",
        "demo",
        "closing",
        "support",
      ],
      challenge_type: [
        "calls",
        "appointments",
        "roleplay",
        "objection_practice",
        "custom",
      ],
      roleplay_difficulty: ["rookie", "pro", "expert", "nightmare"],
      roleplay_session_status: ["in_progress", "completed", "abandoned"],
      sos_alert_status: ["pending", "acknowledged", "resolved"],
      user_status_type: [
        "available",
        "on_call",
        "in_meeting",
        "away",
        "offline",
      ],
    },
  },
} as const
