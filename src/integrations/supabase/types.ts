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
      aloware_sync_log: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
      audio_training_scores: {
        Row: {
          correct_responses: number
          created_at: string
          duration_seconds: number
          id: string
          mode: string
          objections_handled: number
          total_score: number
          user_id: string
        }
        Insert: {
          correct_responses?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode: string
          objections_handled?: number
          total_score?: number
          user_id: string
        }
        Update: {
          correct_responses?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: string
          objections_handled?: number
          total_score?: number
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at: string
          description: string
          icon: string
          id: string
          is_secret: boolean
          name: string
          rarity: Database["public"]["Enums"]["badge_rarity"]
          requirement_description: string
          requirement_type: Database["public"]["Enums"]["badge_requirement_type"]
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at?: string
          description: string
          icon: string
          id?: string
          is_secret?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["badge_rarity"]
          requirement_description: string
          requirement_type: Database["public"]["Enums"]["badge_requirement_type"]
          requirement_value?: number
          xp_reward?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["badge_category"]
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_secret?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["badge_rarity"]
          requirement_description?: string
          requirement_type?: Database["public"]["Enums"]["badge_requirement_type"]
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      calls: {
        Row: {
          aloware_call_id: string | null
          aloware_recording_url: string | null
          aloware_summary: string | null
          aloware_transcription: string | null
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
          is_synced_from_aloware: boolean | null
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          phone_number: string | null
          self_rating: number | null
          struggled_objections: string[] | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          aloware_call_id?: string | null
          aloware_recording_url?: string | null
          aloware_summary?: string | null
          aloware_transcription?: string | null
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
          is_synced_from_aloware?: boolean | null
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
          phone_number?: string | null
          self_rating?: number | null
          struggled_objections?: string[] | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          aloware_call_id?: string | null
          aloware_recording_url?: string | null
          aloware_summary?: string | null
          aloware_transcription?: string | null
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
          is_synced_from_aloware?: boolean | null
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
      certifications: {
        Row: {
          badge_id: string | null
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          path_id: string
        }
        Insert: {
          badge_id?: string | null
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          path_id: string
        }
        Update: {
          badge_id?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          team_id: string
        }
        Insert: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          team_id: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json | null
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          action_items: string[] | null
          created_at: string
          focus_areas: string[] | null
          id: string
          manager_id: string
          next_session_date: string | null
          notes: string
          rep_id: string
        }
        Insert: {
          action_items?: string[] | null
          created_at?: string
          focus_areas?: string[] | null
          id?: string
          manager_id: string
          next_session_date?: string | null
          notes: string
          rep_id: string
        }
        Update: {
          action_items?: string[] | null
          created_at?: string
          focus_areas?: string[] | null
          id?: string
          manager_id?: string
          next_session_date?: string | null
          notes?: string
          rep_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          common_use_cases: string[]
          company_name: string
          created_at: string
          id: string
          industry: string | null
          product_description: string
          target_audience: string | null
          team_id: string | null
          updated_at: string
          value_propositions: string[]
        }
        Insert: {
          common_use_cases?: string[]
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          product_description?: string
          target_audience?: string | null
          team_id?: string | null
          updated_at?: string
          value_propositions?: string[]
        }
        Update: {
          common_use_cases?: string[]
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          product_description?: string
          target_audience?: string | null
          team_id?: string | null
          updated_at?: string
          value_propositions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_activity: {
        Row: {
          activity_type: string
          competition_id: string
          created_at: string
          id: string
          new_rank: number | null
          previous_rank: number | null
          user_id: string
          value_change: number | null
        }
        Insert: {
          activity_type: string
          competition_id: string
          created_at?: string
          id?: string
          new_rank?: number | null
          previous_rank?: number | null
          user_id: string
          value_change?: number | null
        }
        Update: {
          activity_type?: string
          competition_id?: string
          created_at?: string
          id?: string
          new_rank?: number | null
          previous_rank?: number | null
          user_id?: string
          value_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_activity_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_participants: {
        Row: {
          competition_id: string
          current_value: number
          id: string
          joined_at: string
          rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          current_value?: number
          id?: string
          joined_at?: string
          rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          current_value?: number
          id?: string
          joined_at?: string
          rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string
          description: string
          end_date: string
          id: string
          metric_type: Database["public"]["Enums"]["competition_metric_type"]
          name: string
          number_of_winners: number
          prize_description: string | null
          prize_value: number | null
          qualifying_threshold: number | null
          start_date: string
          status: Database["public"]["Enums"]["competition_status"]
          team_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          end_date: string
          id?: string
          metric_type: Database["public"]["Enums"]["competition_metric_type"]
          name: string
          number_of_winners?: number
          prize_description?: string | null
          prize_value?: number | null
          qualifying_threshold?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["competition_status"]
          team_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string
          id?: string
          metric_type?: Database["public"]["Enums"]["competition_metric_type"]
          name?: string
          number_of_winners?: number
          prize_description?: string | null
          prize_value?: number | null
          qualifying_threshold?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["competition_status"]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_team_id_fkey"
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
      data_access_log: {
        Row: {
          accessed_at: string
          action: string
          id: string
          ip_address: string | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          id?: string
          ip_address?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string
          deal_id: string
          from_stage: string | null
          id: string
          to_stage: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          deal_id: string
          from_stage?: string | null
          id?: string
          to_stage: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          deal_id?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          company_name: string
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          deal_type: string
          deal_value: number
          expected_close_date: string | null
          id: string
          momentum_score: number | null
          notes: string | null
          probability: number | null
          source: string | null
          stage: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          company_name: string
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          deal_type?: string
          deal_value?: number
          expected_close_date?: string | null
          id?: string
          momentum_score?: number | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          deal_type?: string
          deal_value?: number
          expected_close_date?: string | null
          id?: string
          momentum_score?: number | null
          notes?: string | null
          probability?: number | null
          source?: string | null
          stage?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      gauntlet_challenges: {
        Row: {
          challenge_date: string
          challenge_type: Database["public"]["Enums"]["gauntlet_challenge_type"]
          content: Json
          created_at: string
          description: string
          id: string
          time_limit_seconds: number | null
          title: string
          xp_reward: number
        }
        Insert: {
          challenge_date: string
          challenge_type: Database["public"]["Enums"]["gauntlet_challenge_type"]
          content?: Json
          created_at?: string
          description: string
          id?: string
          time_limit_seconds?: number | null
          title: string
          xp_reward?: number
        }
        Update: {
          challenge_date?: string
          challenge_type?: Database["public"]["Enums"]["gauntlet_challenge_type"]
          content?: Json
          created_at?: string
          description?: string
          id?: string
          time_limit_seconds?: number | null
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      ghl_activities: {
        Row: {
          assigned_email: string | null
          created_at: string
          event_type: string
          ghl_user_id: string | null
          id: string
          is_demo: boolean
          match_method: string | null
          matched_user_id: string | null
          occurred_at: string
          payload: Json
          unassigned: boolean
          value: number | null
        }
        Insert: {
          assigned_email?: string | null
          created_at?: string
          event_type: string
          ghl_user_id?: string | null
          id?: string
          is_demo?: boolean
          match_method?: string | null
          matched_user_id?: string | null
          occurred_at?: string
          payload?: Json
          unassigned?: boolean
          value?: number | null
        }
        Update: {
          assigned_email?: string | null
          created_at?: string
          event_type?: string
          ghl_user_id?: string | null
          id?: string
          is_demo?: boolean
          match_method?: string | null
          matched_user_id?: string | null
          occurred_at?: string
          payload?: Json
          unassigned?: boolean
          value?: number | null
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          created_at: string
          description: string
          estimated_hours: number
          icon: string
          id: string
          is_required: boolean
          name: string
          sort_order: number
          team_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          estimated_hours?: number
          icon?: string
          id?: string
          is_required?: boolean
          name: string
          sort_order?: number
          team_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          estimated_hours?: number
          icon?: string
          id?: string
          is_required?: boolean
          name?: string
          sort_order?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          badge_icon: string
          created_at: string
          id: string
          level_number: number
          perks: string[] | null
          title: string
          xp_required: number
        }
        Insert: {
          badge_icon: string
          created_at?: string
          id?: string
          level_number: number
          perks?: string[] | null
          title: string
          xp_required: number
        }
        Update: {
          badge_icon?: string
          created_at?: string
          id?: string
          level_number?: number
          perks?: string[] | null
          title?: string
          xp_required?: number
        }
        Relationships: []
      }
      manager_audio_examples: {
        Row: {
          audio_url: string
          created_at: string
          duration_seconds: number
          id: string
          recorded_by: string
          response_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_seconds?: number
          id?: string
          recorded_by: string
          response_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          recorded_by?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_audio_examples_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "objection_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      objection_responses: {
        Row: {
          approach: Database["public"]["Enums"]["response_approach"]
          created_at: string
          created_by: string | null
          downvotes: number
          id: string
          objection_id: string
          response_text: string
          times_successful: number
          times_used: number
          upvotes: number
        }
        Insert: {
          approach: Database["public"]["Enums"]["response_approach"]
          created_at?: string
          created_by?: string | null
          downvotes?: number
          id?: string
          objection_id: string
          response_text: string
          times_successful?: number
          times_used?: number
          upvotes?: number
        }
        Update: {
          approach?: Database["public"]["Enums"]["response_approach"]
          created_at?: string
          created_by?: string | null
          downvotes?: number
          id?: string
          objection_id?: string
          response_text?: string
          times_successful?: number
          times_used?: number
          upvotes?: number
        }
        Relationships: [
          {
            foreignKeyName: "objection_responses_objection_id_fkey"
            columns: ["objection_id"]
            isOneToOne: false
            referencedRelation: "objections"
            referencedColumns: ["id"]
          },
        ]
      }
      objections: {
        Row: {
          category: Database["public"]["Enums"]["objection_category"]
          context: string | null
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["objection_difficulty"]
          id: string
          is_approved: boolean
          objection_text: string
          team_id: string | null
          usage_count: number
        }
        Insert: {
          category: Database["public"]["Enums"]["objection_category"]
          context?: string | null
          created_at?: string
          created_by?: string | null
          difficulty: Database["public"]["Enums"]["objection_difficulty"]
          id?: string
          is_approved?: boolean
          objection_text: string
          team_id?: string | null
          usage_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["objection_category"]
          context?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["objection_difficulty"]
          id?: string
          is_approved?: boolean
          objection_text?: string
          team_id?: string | null
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "objections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      perplexity_cache: {
        Row: {
          citations: Json
          created_at: string
          expires_at: string
          id: string
          query_key: string
          query_type: string
          research_data: Json
          user_id: string
        }
        Insert: {
          citations?: Json
          created_at?: string
          expires_at?: string
          id?: string
          query_key: string
          query_type: string
          research_data?: Json
          user_id: string
        }
        Update: {
          citations?: Json
          created_at?: string
          expires_at?: string
          id?: string
          query_key?: string
          query_type?: string
          research_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aloware_user_id: string | null
          avatar_url: string | null
          created_at: string
          current_level: number
          current_streak: number
          default_aloware_line: string | null
          full_name: string
          ghl_user_id: string | null
          hire_date: string | null
          id: string
          last_coached_at: string | null
          longest_streak: number
          onboarding_completed: boolean
          phone_extension: string | null
          promo_validated: boolean
          team_code: string | null
          team_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          xp_points: number
        }
        Insert: {
          aloware_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          default_aloware_line?: string | null
          full_name: string
          ghl_user_id?: string | null
          hire_date?: string | null
          id?: string
          last_coached_at?: string | null
          longest_streak?: number
          onboarding_completed?: boolean
          phone_extension?: string | null
          promo_validated?: boolean
          team_code?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          xp_points?: number
        }
        Update: {
          aloware_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_level?: number
          current_streak?: number
          default_aloware_line?: string | null
          full_name?: string
          ghl_user_id?: string | null
          hire_date?: string | null
          id?: string
          last_coached_at?: string | null
          longest_streak?: number
          onboarding_completed?: boolean
          phone_extension?: string | null
          promo_validated?: boolean
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
      prospect_research: {
        Row: {
          company_name: string
          company_url: string | null
          contact_linkedin_url: string | null
          contact_name: string | null
          created_at: string
          expires_at: string
          id: string
          research_data: Json
          user_id: string
        }
        Insert: {
          company_name: string
          company_url?: string | null
          contact_linkedin_url?: string | null
          contact_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          research_data?: Json
          user_id: string
        }
        Update: {
          company_name?: string
          company_url?: string | null
          contact_linkedin_url?: string | null
          contact_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          research_data?: Json
          user_id?: string
        }
        Relationships: []
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
      sms_messages: {
        Row: {
          aloware_message_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          deal_id: string | null
          direction: string
          id: string
          message: string
          status: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          aloware_message_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          deal_id?: string | null
          direction?: string
          id?: string
          message: string
          status?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          aloware_message_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          deal_id?: string | null
          direction?: string
          id?: string
          message?: string
          status?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      team_broadcasts: {
        Row: {
          broadcast_type: string
          created_at: string
          id: string
          message: string
          sender_id: string
          team_id: string
        }
        Insert: {
          broadcast_type?: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          team_id: string
        }
        Update: {
          broadcast_type?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_broadcasts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      toolkit_items: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["toolkit_item_type"]
          metadata: Json | null
          sort_order: number
          team_id: string | null
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_type: Database["public"]["Enums"]["toolkit_item_type"]
          metadata?: Json | null
          sort_order?: number
          team_id?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["toolkit_item_type"]
          metadata?: Json | null
          sort_order?: number
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolkit_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      toolkit_usage: {
        Row: {
          id: string
          item_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolkit_usage_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "toolkit_items"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          content: Json
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_active: boolean
          module_type: Database["public"]["Enums"]["module_type"]
          path_id: string
          sort_order: number
          title: string
          xp_reward: number
        }
        Insert: {
          content?: Json
          created_at?: string
          description: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          module_type: Database["public"]["Enums"]["module_type"]
          path_id: string
          sort_order?: number
          title: string
          xp_reward?: number
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          module_type?: Database["public"]["Enums"]["module_type"]
          path_id?: string
          sort_order?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certifications: {
        Row: {
          certification_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          certification_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          certification_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
        ]
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
      user_gauntlet_completions: {
        Row: {
          attempts: number
          challenge_id: string
          completed_at: string
          feedback: Json | null
          id: string
          passed: boolean
          responses: Json | null
          score: number
          user_id: string
        }
        Insert: {
          attempts?: number
          challenge_id: string
          completed_at?: string
          feedback?: Json | null
          id?: string
          passed?: boolean
          responses?: Json | null
          score?: number
          user_id: string
        }
        Update: {
          attempts?: number
          challenge_id?: string
          completed_at?: string
          feedback?: Json | null
          id?: string
          passed?: boolean
          responses?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gauntlet_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "gauntlet_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          progress_data: Json | null
          score: number | null
          status: Database["public"]["Enums"]["module_status"]
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          progress_data?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["module_status"]
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          progress_data?: Json | null
          score?: number | null
          status?: Database["public"]["Enums"]["module_status"]
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: string
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          celebration_sounds_enabled: boolean
          created_at: string
          id: string
          notification_sounds_enabled: boolean
          updated_at: string
          user_id: string
          voice_commands_enabled: boolean
        }
        Insert: {
          celebration_sounds_enabled?: boolean
          created_at?: string
          id?: string
          notification_sounds_enabled?: boolean
          updated_at?: string
          user_id: string
          voice_commands_enabled?: boolean
        }
        Update: {
          celebration_sounds_enabled?: boolean
          created_at?: string
          id?: string
          notification_sounds_enabled?: boolean
          updated_at?: string
          user_id?: string
          voice_commands_enabled?: boolean
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
      team_profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          current_level: number | null
          current_streak: number | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          longest_streak: number | null
          onboarding_completed: boolean | null
          phone_extension: string | null
          team_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          xp_points: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          longest_streak?: number | null
          onboarding_completed?: boolean | null
          phone_extension?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp_points?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          current_level?: number | null
          current_streak?: number | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          longest_streak?: number | null
          onboarding_completed?: boolean | null
          phone_extension?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          xp_points?: number | null
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
      get_user_team_id: { Args: { p_user_id: string }; Returns: string }
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
      match_ghl_user: {
        Args: { _email: string; _ghl_user_id: string }
        Returns: string
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
      badge_category:
        | "calls"
        | "closes"
        | "streaks"
        | "roleplay"
        | "training"
        | "team"
        | "special"
      badge_rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
      badge_requirement_type: "count" | "streak" | "score" | "custom"
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
      channel_type: "general" | "wins" | "help" | "custom"
      competition_metric_type:
        | "calls"
        | "appointments"
        | "revenue"
        | "deals"
        | "roleplay"
        | "custom"
      competition_status: "upcoming" | "active" | "completed" | "cancelled"
      gauntlet_challenge_type:
        | "objection_blast"
        | "pitch_perfect"
        | "discovery_questions"
        | "spot_the_mistake"
        | "quick_math"
        | "competitor_quiz"
        | "scenario_response"
      message_type: "text" | "kudos" | "system"
      module_status: "not_started" | "in_progress" | "completed"
      module_type: "video" | "reading" | "quiz" | "roleplay"
      notification_type:
        | "badge_earned"
        | "level_up"
        | "streak_milestone"
        | "deal_closed"
        | "sos_alert"
        | "mentioned"
        | "coaching_notes"
        | "training_assigned"
        | "roleplay_feedback"
        | "followup_due"
        | "challenge_reminder"
        | "deal_cold"
        | "competition_starting"
        | "competition_ending"
        | "leaderboard_overtaken"
        | "leaderboard_leading"
      objection_category:
        | "price"
        | "timing"
        | "competition"
        | "authority"
        | "need"
        | "trust"
        | "stall"
      objection_difficulty: "easy" | "medium" | "hard"
      response_approach:
        | "empathy"
        | "logic"
        | "redirect"
        | "question"
        | "social_proof"
      roleplay_difficulty: "rookie" | "pro" | "expert" | "nightmare"
      roleplay_session_status: "in_progress" | "completed" | "abandoned"
      sos_alert_status: "pending" | "acknowledged" | "resolved"
      toolkit_item_type: "quick_win" | "battlecard" | "proof_point" | "script"
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
      badge_category: [
        "calls",
        "closes",
        "streaks",
        "roleplay",
        "training",
        "team",
        "special",
      ],
      badge_rarity: ["common", "uncommon", "rare", "epic", "legendary"],
      badge_requirement_type: ["count", "streak", "score", "custom"],
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
      channel_type: ["general", "wins", "help", "custom"],
      competition_metric_type: [
        "calls",
        "appointments",
        "revenue",
        "deals",
        "roleplay",
        "custom",
      ],
      competition_status: ["upcoming", "active", "completed", "cancelled"],
      gauntlet_challenge_type: [
        "objection_blast",
        "pitch_perfect",
        "discovery_questions",
        "spot_the_mistake",
        "quick_math",
        "competitor_quiz",
        "scenario_response",
      ],
      message_type: ["text", "kudos", "system"],
      module_status: ["not_started", "in_progress", "completed"],
      module_type: ["video", "reading", "quiz", "roleplay"],
      notification_type: [
        "badge_earned",
        "level_up",
        "streak_milestone",
        "deal_closed",
        "sos_alert",
        "mentioned",
        "coaching_notes",
        "training_assigned",
        "roleplay_feedback",
        "followup_due",
        "challenge_reminder",
        "deal_cold",
        "competition_starting",
        "competition_ending",
        "leaderboard_overtaken",
        "leaderboard_leading",
      ],
      objection_category: [
        "price",
        "timing",
        "competition",
        "authority",
        "need",
        "trust",
        "stall",
      ],
      objection_difficulty: ["easy", "medium", "hard"],
      response_approach: [
        "empathy",
        "logic",
        "redirect",
        "question",
        "social_proof",
      ],
      roleplay_difficulty: ["rookie", "pro", "expert", "nightmare"],
      roleplay_session_status: ["in_progress", "completed", "abandoned"],
      sos_alert_status: ["pending", "acknowledged", "resolved"],
      toolkit_item_type: ["quick_win", "battlecard", "proof_point", "script"],
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
