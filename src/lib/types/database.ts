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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_assignments: {
        Row: {
          assessment_id: string
          assigned_at: string
          assigned_by: string
          class_id: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          assessment_id: string
          assigned_at?: string
          assigned_by: string
          class_id?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          assessment_id?: string
          assigned_at?: string
          assigned_by?: string
          class_id?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "assessment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "assessment_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          categories: Json
          created_at: string
          created_by: string
          description: string | null
          grade: string
          id: string
          settings: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          categories: Json
          created_at?: string
          created_by: string
          description?: string | null
          grade: string
          id?: string
          settings?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          categories?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          grade?: string
          id?: string
          settings?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          notes: string | null
          period_number: number | null
          room: string | null
          start_time: string
          subject: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          notes?: string | null
          period_number?: number | null
          room?: string | null
          start_time: string
          subject?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          notes?: string | null
          period_number?: number | null
          room?: string | null
          start_time?: string
          subject?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "class_schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          join_code: string
          name: string
          school_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          join_code: string
          name: string
          school_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          join_code?: string
          name?: string
          school_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          class_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          last_message_id: string | null
          last_message_preview: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          last_message_preview?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_last_message"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          friendship_type: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          friendship_type: string
          id?: string
          requester_id: string
          status: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          friendship_type?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          element: string | null
          gidouilles_reward: number
          icon_url: string
          id: string
          name: string
          prestige_reward: number
          requirement_type: string
          requirement_value: number
          slug: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          element?: string | null
          gidouilles_reward?: number
          icon_url: string
          id?: string
          name: string
          prestige_reward?: number
          requirement_type: string
          requirement_value: number
          slug: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          element?: string | null
          gidouilles_reward?: number
          icon_url?: string
          id?: string
          name?: string
          prestige_reward?: number
          requirement_type?: string
          requirement_value?: number
          slug?: string
        }
        Relationships: []
      }
      game_challenge_attempts: {
        Row: {
          answer_given: Json
          attempted_at: string
          challenge_id: string
          challenge_instance: Json
          combat_id: string | null
          correct_answer: Json
          id: string
          success: boolean
          time_taken: number
          user_id: string
        }
        Insert: {
          answer_given: Json
          attempted_at?: string
          challenge_id: string
          challenge_instance: Json
          combat_id?: string | null
          correct_answer: Json
          id?: string
          success: boolean
          time_taken: number
          user_id: string
        }
        Update: {
          answer_given?: Json
          attempted_at?: string
          challenge_id?: string
          challenge_instance?: Json
          combat_id?: string | null
          correct_answer?: Json
          id?: string
          success?: boolean
          time_taken?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_challenge_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "game_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenge_attempts_combat_id_fkey"
            columns: ["combat_id"]
            isOneToOne: false
            referencedRelation: "game_combats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenge_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_challenge_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_challenges: {
        Row: {
          answer: Json
          avg_time_taken: number | null
          category: string
          challenge_type: number
          created_at: string
          created_by: string | null
          difficulty: number
          element: string
          hint: string | null
          id: string
          is_active: boolean
          question: string
          show_answer: Json | null
          slug: string
          timer: number
          times_attempted: number
          times_succeeded: number
          updated_at: string
          variables: Json
          view_config: Json
        }
        Insert: {
          answer: Json
          avg_time_taken?: number | null
          category: string
          challenge_type: number
          created_at?: string
          created_by?: string | null
          difficulty: number
          element: string
          hint?: string | null
          id?: string
          is_active?: boolean
          question: string
          show_answer?: Json | null
          slug: string
          timer: number
          times_attempted?: number
          times_succeeded?: number
          updated_at?: string
          variables?: Json
          view_config?: Json
        }
        Update: {
          answer?: Json
          avg_time_taken?: number | null
          category?: string
          challenge_type?: number
          created_at?: string
          created_by?: string | null
          difficulty?: number
          element?: string
          hint?: string | null
          id?: string
          is_active?: boolean
          question?: string
          show_answer?: Json | null
          slug?: string
          timer?: number
          times_attempted?: number
          times_succeeded?: number
          updated_at?: string
          variables?: Json
          view_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "game_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_class_settings: {
        Row: {
          base_difficulty: number
          challenge_timer_multiplier: number
          class_id: string
          created_at: string
          gidouilles_multiplier: number
          id: string
          leaderboard_enabled: boolean
          multiplayer_enabled: boolean
          updated_at: string
          xp_multiplier: number
        }
        Insert: {
          base_difficulty?: number
          challenge_timer_multiplier?: number
          class_id: string
          created_at?: string
          gidouilles_multiplier?: number
          id?: string
          leaderboard_enabled?: boolean
          multiplayer_enabled?: boolean
          updated_at?: string
          xp_multiplier?: number
        }
        Update: {
          base_difficulty?: number
          challenge_timer_multiplier?: number
          class_id?: string
          created_at?: string
          gidouilles_multiplier?: number
          id?: string
          leaderboard_enabled?: boolean
          multiplayer_enabled?: boolean
          updated_at?: string
          xp_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_class_settings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_combats: {
        Row: {
          combat_flow: Json
          completed_at: string | null
          created_at: string
          current_round: number
          current_turn: number
          id: string
          invited_player_ids: string[]
          monster_endurance_remaining: number | null
          monster_id: string
          monster_snapshot: Json
          organizer_id: string
          outcome: string | null
          player_snapshots: Json
          prestige_gained: number | null
          pyrs_gained: Json | null
          ready_player_ids: string[]
          started_at: string | null
          status: string
          turn_order: Json
          updated_at: string
          xp_gained: number | null
        }
        Insert: {
          combat_flow?: Json
          completed_at?: string | null
          created_at?: string
          current_round?: number
          current_turn?: number
          id?: string
          invited_player_ids?: string[]
          monster_endurance_remaining?: number | null
          monster_id: string
          monster_snapshot?: Json
          organizer_id: string
          outcome?: string | null
          player_snapshots?: Json
          prestige_gained?: number | null
          pyrs_gained?: Json | null
          ready_player_ids?: string[]
          started_at?: string | null
          status?: string
          turn_order?: Json
          updated_at?: string
          xp_gained?: number | null
        }
        Update: {
          combat_flow?: Json
          completed_at?: string | null
          created_at?: string
          current_round?: number
          current_turn?: number
          id?: string
          invited_player_ids?: string[]
          monster_endurance_remaining?: number | null
          monster_id?: string
          monster_snapshot?: Json
          organizer_id?: string
          outcome?: string | null
          player_snapshots?: Json
          prestige_gained?: number | null
          pyrs_gained?: Json | null
          ready_player_ids?: string[]
          started_at?: string | null
          status?: string
          turn_order?: Json
          updated_at?: string
          xp_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_combats_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "game_monsters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_combats_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_combats_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_leaderboards: {
        Row: {
          challenges_completed: number
          combats_won: number
          created_at: string
          id: string
          prestige_earned: number
          rank: number | null
          season_identifier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_completed?: number
          combats_won?: number
          created_at?: string
          id?: string
          prestige_earned?: number
          rank?: number | null
          season_identifier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_completed?: number
          combats_won?: number
          created_at?: string
          id?: string
          prestige_earned?: number
          rank?: number | null
          season_identifier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_monsters: {
        Row: {
          attack_coefficient: number
          category: string
          created_at: string
          defeated_at: string | null
          defeated_by: string | null
          element: string
          id: string
          img_head_url: string
          img_url: string
          is_dead: boolean
          level: number
          max_endurance: number
          name: string
          position: string | null
          spawned_at: string
          spawned_by: string | null
          updated_at: string
        }
        Insert: {
          attack_coefficient: number
          category: string
          created_at?: string
          defeated_at?: string | null
          defeated_by?: string | null
          element: string
          id?: string
          img_head_url: string
          img_url: string
          is_dead?: boolean
          level: number
          max_endurance: number
          name: string
          position?: string | null
          spawned_at?: string
          spawned_by?: string | null
          updated_at?: string
        }
        Update: {
          attack_coefficient?: number
          category?: string
          created_at?: string
          defeated_at?: string | null
          defeated_by?: string | null
          element?: string
          id?: string
          img_head_url?: string
          img_url?: string
          is_dead?: boolean
          level?: number
          max_endurance?: number
          name?: string
          position?: string | null
          spawned_at?: string
          spawned_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_monsters_defeated_by_fkey"
            columns: ["defeated_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_monsters_defeated_by_fkey"
            columns: ["defeated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_monsters_spawned_by_fkey"
            columns: ["spawned_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_monsters_spawned_by_fkey"
            columns: ["spawned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_player_achievements: {
        Row: {
          achievement_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "game_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_player_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          combats_lost: number
          combats_won: number
          created_at: string
          help_bubbles_enabled: boolean
          help_bubbles_seen: string[]
          id: string
          last_played_at: string | null
          level: number
          music_settings: Json
          prestige: number
          pyrs_earth: number
          pyrs_earth_spent: number
          pyrs_fire: number
          pyrs_fire_spent: number
          pyrs_water: number
          pyrs_water_spent: number
          pyrs_wind: number
          pyrs_wind_spent: number
          total_combats: number
          tutorial_completed_at: string | null
          tutorial_stage: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          combats_lost?: number
          combats_won?: number
          created_at?: string
          help_bubbles_enabled?: boolean
          help_bubbles_seen?: string[]
          id?: string
          last_played_at?: string | null
          level?: number
          music_settings?: Json
          prestige?: number
          pyrs_earth?: number
          pyrs_earth_spent?: number
          pyrs_fire?: number
          pyrs_fire_spent?: number
          pyrs_water?: number
          pyrs_water_spent?: number
          pyrs_wind?: number
          pyrs_wind_spent?: number
          total_combats?: number
          tutorial_completed_at?: string | null
          tutorial_stage?: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          combats_lost?: number
          combats_won?: number
          created_at?: string
          help_bubbles_enabled?: boolean
          help_bubbles_seen?: string[]
          id?: string
          last_played_at?: string | null
          level?: number
          music_settings?: Json
          prestige?: number
          pyrs_earth?: number
          pyrs_earth_spent?: number
          pyrs_fire?: number
          pyrs_fire_spent?: number
          pyrs_water?: number
          pyrs_water_spent?: number
          pyrs_wind?: number
          pyrs_wind_spent?: number
          total_combats?: number
          tutorial_completed_at?: string | null
          tutorial_stage?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_spell_decks: {
        Row: {
          created_at: string
          deck_name: string
          id: string
          is_active: boolean
          spell_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_name: string
          id?: string
          is_active?: boolean
          spell_ids: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_name?: string
          id?: string
          is_active?: boolean
          spell_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_spell_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_spell_decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_spells: {
        Row: {
          created_at: string
          element: string
          id: string
          last_upgraded_at: string | null
          level: number
          power: number
          spell_num: number
          type: string
          unlocked_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          element: string
          id?: string
          last_upgraded_at?: string | null
          level?: number
          power: number
          spell_num: number
          type: string
          unlocked_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          element?: string
          id?: string
          last_upgraded_at?: string | null
          level?: number
          power?: number
          spell_num?: number
          type?: string
          unlocked_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_spells_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_spells_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_timeslots: {
        Row: {
          challenge_ids: string[]
          class_id: string
          created_at: string
          difficulty: number
          ends_at: string
          id: string
          is_active: boolean
          name: string
          starts_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          challenge_ids: string[]
          class_id: string
          created_at?: string
          difficulty: number
          ends_at: string
          id?: string
          is_active?: boolean
          name: string
          starts_at: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          challenge_ids?: string[]
          class_id?: string
          created_at?: string
          difficulty?: number
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          starts_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_timeslots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_timeslots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "game_timeslots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_assignments: {
        Row: {
          allow_late_submission: boolean
          assigned_at: string
          assigned_by: string
          assigned_to_class: string | null
          assigned_to_student: string | null
          available_from: string | null
          available_until: string | null
          due_date: string | null
          exercise_id: string
          id: string
          is_active: boolean
          max_attempts: number | null
          show_correct_answer_after_submission: boolean
        }
        Insert: {
          allow_late_submission?: boolean
          assigned_at?: string
          assigned_by: string
          assigned_to_class?: string | null
          assigned_to_student?: string | null
          available_from?: string | null
          available_until?: string | null
          due_date?: string | null
          exercise_id: string
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          show_correct_answer_after_submission?: boolean
        }
        Update: {
          allow_late_submission?: boolean
          assigned_at?: string
          assigned_by?: string
          assigned_to_class?: string | null
          assigned_to_student?: string | null
          available_from?: string | null
          available_until?: string | null
          due_date?: string | null
          exercise_id?: string
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          show_correct_answer_after_submission?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "geometry_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_assignments_assigned_to_class_fkey"
            columns: ["assigned_to_class"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_assignments_assigned_to_student_fkey"
            columns: ["assigned_to_student"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_assignments_assigned_to_student_fkey"
            columns: ["assigned_to_student"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_assignments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "geometry_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_exercise_attempts: {
        Row: {
          active_time_seconds: number
          attempt_number: number
          completed_steps: number[] | null
          current_figure_state: string | null
          current_step: number | null
          exercise_id: string
          exercise_version_snapshot: Json | null
          figure_history: Json | null
          final_score: number | null
          graded_at: string | null
          graded_by: string | null
          hint_penalties: number
          hints_used: Json | null
          id: string
          last_saved_at: string
          randomization_seed: number | null
          raw_score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          teacher_feedback: string | null
          time_penalties: number
          time_spent_seconds: number
          validation_results: Json | null
        }
        Insert: {
          active_time_seconds?: number
          attempt_number?: number
          completed_steps?: number[] | null
          current_figure_state?: string | null
          current_step?: number | null
          exercise_id: string
          exercise_version_snapshot?: Json | null
          figure_history?: Json | null
          final_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          hint_penalties?: number
          hints_used?: Json | null
          id?: string
          last_saved_at?: string
          randomization_seed?: number | null
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          teacher_feedback?: string | null
          time_penalties?: number
          time_spent_seconds?: number
          validation_results?: Json | null
        }
        Update: {
          active_time_seconds?: number
          attempt_number?: number
          completed_steps?: number[] | null
          current_figure_state?: string | null
          current_step?: number | null
          exercise_id?: string
          exercise_version_snapshot?: Json | null
          figure_history?: Json | null
          final_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          hint_penalties?: number
          hints_used?: Json | null
          id?: string
          last_saved_at?: string
          randomization_seed?: number | null
          raw_score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          teacher_feedback?: string | null
          time_penalties?: number
          time_spent_seconds?: number
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "geometry_exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "geometry_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_exercise_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_exercise_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_exercise_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_exercise_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_exercise_steps: {
        Row: {
          can_skip: boolean
          created_at: string
          description: string
          display_order: number
          exercise_id: string
          hint_general: string | null
          hint_specific: string | null
          hint_step_by_step: string | null
          id: string
          is_required: boolean
          points: number
          step_number: number
          title: string
          validation_function: string
          validation_params: Json
        }
        Insert: {
          can_skip?: boolean
          created_at?: string
          description: string
          display_order: number
          exercise_id: string
          hint_general?: string | null
          hint_specific?: string | null
          hint_step_by_step?: string | null
          id?: string
          is_required?: boolean
          points?: number
          step_number: number
          title: string
          validation_function: string
          validation_params?: Json
        }
        Update: {
          can_skip?: boolean
          created_at?: string
          description?: string
          display_order?: number
          exercise_id?: string
          hint_general?: string | null
          hint_specific?: string | null
          hint_step_by_step?: string | null
          id?: string
          is_required?: boolean
          points?: number
          step_number?: number
          title?: string
          validation_function?: string
          validation_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "geometry_exercise_steps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "geometry_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_exercises: {
        Row: {
          axis_visible: boolean
          bonus_multiplier: number
          created_at: string
          created_by: string
          description: string | null
          difficulty_level: number
          exercise_type: string
          gidouilles_reward: number
          grade_level: string
          grid_visible: boolean
          hint_penalty_percent: number
          id: string
          initial_figure: string | null
          instructions: string
          is_published: boolean
          is_randomized: boolean
          is_template: boolean
          learning_objectives: string[] | null
          max_score: number
          measurements_visible: boolean
          passing_score: number
          randomization_params: Json | null
          suggested_time_seconds: number | null
          tags: string[] | null
          template_id: string | null
          time_limit_seconds: number | null
          title: string
          tools_allowed: string[]
          topics: string[] | null
          updated_at: string
          validation_config: Json
          validation_mode: string
        }
        Insert: {
          axis_visible?: boolean
          bonus_multiplier?: number
          created_at?: string
          created_by: string
          description?: string | null
          difficulty_level?: number
          exercise_type: string
          gidouilles_reward?: number
          grade_level?: string
          grid_visible?: boolean
          hint_penalty_percent?: number
          id?: string
          initial_figure?: string | null
          instructions: string
          is_published?: boolean
          is_randomized?: boolean
          is_template?: boolean
          learning_objectives?: string[] | null
          max_score?: number
          measurements_visible?: boolean
          passing_score?: number
          randomization_params?: Json | null
          suggested_time_seconds?: number | null
          tags?: string[] | null
          template_id?: string | null
          time_limit_seconds?: number | null
          title: string
          tools_allowed?: string[]
          topics?: string[] | null
          updated_at?: string
          validation_config?: Json
          validation_mode?: string
        }
        Update: {
          axis_visible?: boolean
          bonus_multiplier?: number
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty_level?: number
          exercise_type?: string
          gidouilles_reward?: number
          grade_level?: string
          grid_visible?: boolean
          hint_penalty_percent?: number
          id?: string
          initial_figure?: string | null
          instructions?: string
          is_published?: boolean
          is_randomized?: boolean
          is_template?: boolean
          learning_objectives?: string[] | null
          max_score?: number
          measurements_visible?: boolean
          passing_score?: number
          randomization_params?: Json | null
          suggested_time_seconds?: number | null
          tags?: string[] | null
          template_id?: string | null
          time_limit_seconds?: number | null
          title?: string
          tools_allowed?: string[]
          topics?: string[] | null
          updated_at?: string
          validation_config?: Json
          validation_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "geometry_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "geometry_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_hints: {
        Row: {
          created_at: string
          exercise_id: string | null
          hint_level: string
          hint_order: number
          hint_text: string
          id: string
          score_penalty: number
          step_id: string | null
          trigger_condition: Json | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          hint_level: string
          hint_order?: number
          hint_text: string
          id?: string
          score_penalty?: number
          step_id?: string | null
          trigger_condition?: Json | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          hint_level?: string
          hint_order?: number
          hint_text?: string
          id?: string
          score_penalty?: number
          step_id?: string | null
          trigger_condition?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "geometry_hints_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "geometry_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geometry_hints_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "geometry_exercise_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      geometry_templates: {
        Row: {
          base_figure: string
          configurable_params: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          tags: string[] | null
          template_type: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          base_figure: string
          configurable_params?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          tags?: string[] | null
          template_type: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          base_figure?: string
          configurable_params?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          tags?: string[] | null
          template_type?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "geometry_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "geometry_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string
          public_url: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id: string
          public_url: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string
          public_url?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "message_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          message_id: string
          reason: string
          reported_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reported_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "message_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "message_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          flag_reason: string | null
          id: string
          is_flagged: boolean | null
          is_reported: boolean | null
          plain_text: string | null
          sender_id: string | null
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_reported?: boolean | null
          plain_text?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean | null
          is_reported?: boolean | null
          plain_text?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "user_conversations_view"
            referencedColumns: ["conversation_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string
          id: string
          is_system: boolean
          message: string
          priority: string
          system_event_type: string | null
          target_class_ids: string[] | null
          target_roles: string[] | null
          target_type: string
          target_user_ids: string[] | null
          title: string
          type: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string
          id?: string
          is_system?: boolean
          message: string
          priority?: string
          system_event_type?: string | null
          target_class_ids?: string[] | null
          target_roles?: string[] | null
          target_type: string
          target_user_ids?: string[] | null
          title: string
          type: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string
          id?: string
          is_system?: boolean
          message?: string
          priority?: string
          system_event_type?: string | null
          target_class_ids?: string[] | null
          target_roles?: string[] | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_students: {
        Row: {
          activated_at: string | null
          class_ids: string[] | null
          created_at: string | null
          email: string
          firstname: string
          gender: string | null
          grade: string | null
          id: string
          is_activated: boolean | null
          lastname: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          class_ids?: string[] | null
          created_at?: string | null
          email: string
          firstname: string
          gender?: string | null
          grade?: string | null
          id?: string
          is_activated?: boolean | null
          lastname: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          class_ids?: string[] | null
          created_at?: string | null
          email?: string
          firstname?: string
          gender?: string | null
          grade?: string | null
          id?: string
          is_activated?: boolean | null
          lastname?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_ids: string[] | null
          created_at: string
          email: string
          firstname: string | null
          full_name: string | null
          gender: string | null
          gidouilles: number
          grade: string | null
          id: string
          lastname: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          vip_cards: Json
        }
        Insert: {
          avatar_url?: string | null
          class_ids?: string[] | null
          created_at?: string
          email: string
          firstname?: string | null
          full_name?: string | null
          gender?: string | null
          gidouilles?: number
          grade?: string | null
          id: string
          lastname?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          vip_cards?: Json
        }
        Update: {
          avatar_url?: string | null
          class_ids?: string[] | null
          created_at?: string
          email?: string
          firstname?: string | null
          full_name?: string | null
          gender?: string | null
          gidouilles?: number
          grade?: string | null
          id?: string
          lastname?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          vip_cards?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      question_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          delay: number | null
          description: string | null
          domain: string
          exercise_instruction: string | null
          grades: string[]
          id: string
          level: number
          multiple_answers: boolean | null
          options: Json | null
          precision: Json | null
          status: string
          subdomain: string | null
          theme: string
          title: string
          transform_type: string | null
          type: string
          updated_at: string | null
          variations: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delay?: number | null
          description?: string | null
          domain: string
          exercise_instruction?: string | null
          grades: string[]
          id?: string
          level: number
          multiple_answers?: boolean | null
          options?: Json | null
          precision?: Json | null
          status: string
          subdomain?: string | null
          theme: string
          title: string
          transform_type?: string | null
          type: string
          updated_at?: string | null
          variations: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delay?: number | null
          description?: string | null
          domain?: string
          exercise_instruction?: string | null
          grades?: string[]
          id?: string
          level?: number
          multiple_answers?: boolean | null
          options?: Json | null
          precision?: Json | null
          status?: string
          subdomain?: string | null
          theme?: string
          title?: string
          transform_type?: string | null
          type?: string
          updated_at?: string | null
          variations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "question_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "question_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string
          country: string
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          timetable: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city: string
          country: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          timetable?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          timetable?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      srs_card_stats: {
        Row: {
          card_reference_id: string
          card_reference_type: string
          created_at: string
          difficulty: number
          id: string
          last_review: string | null
          next_review: string
          review_history: Json
          stability: number
          state: string
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_reference_id: string
          card_reference_type: string
          created_at?: string
          difficulty?: number
          id?: string
          last_review?: string | null
          next_review?: string
          review_history?: Json
          stability?: number
          state?: string
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_reference_id?: string
          card_reference_type?: string
          created_at?: string
          difficulty?: number
          id?: string
          last_review?: string | null
          next_review?: string
          review_history?: Json
          stability?: number
          state?: string
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_card_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "srs_card_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_cards: {
        Row: {
          back_content: Json | null
          card_type: string
          created_at: string
          deck_id: string
          front_content: Json | null
          id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          back_content?: Json | null
          card_type: string
          created_at?: string
          deck_id: string
          front_content?: Json | null
          id?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          back_content?: Json | null
          card_type?: string
          created_at?: string
          deck_id?: string
          front_content?: Json | null
          id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "srs_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_deck_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to: string
          assignment_type: string
          id: string
          source_deck_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to: string
          assignment_type: string
          id?: string
          source_deck_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to?: string
          assignment_type?: string
          id?: string
          source_deck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_deck_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "srs_deck_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_deck_assignments_source_deck_id_fkey"
            columns: ["source_deck_id"]
            isOneToOne: false
            referencedRelation: "srs_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_decks: {
        Row: {
          config: Json
          created_at: string
          deck_type: string
          description: string | null
          id: string
          is_assigned: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          deck_type: string
          description?: string | null
          id?: string
          is_assigned?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          deck_type?: string
          description?: string | null
          id?: string
          is_assigned?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_decks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "srs_decks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      srs_review_sessions: {
        Row: {
          average_time: number
          cards_reviewed: number
          completed_at: string | null
          correct_count: number
          deck_id: string
          id: string
          started_at: string
          total_time: number
          user_id: string
        }
        Insert: {
          average_time?: number
          cards_reviewed?: number
          completed_at?: string | null
          correct_count?: number
          deck_id: string
          id?: string
          started_at?: string
          total_time?: number
          user_id: string
        }
        Update: {
          average_time?: number
          cards_reviewed?: number
          completed_at?: string | null
          correct_count?: number
          deck_id?: string
          id?: string
          started_at?: string
          total_time?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srs_review_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "srs_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srs_review_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "srs_review_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          question_instance: Json
          template_id: string | null
          test_session_id: string
          time_spent: number | null
          user_answer: Json | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_instance: Json
          template_id?: string | null
          test_session_id: string
          time_spent?: number | null
          user_answer?: Json | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_instance?: Json
          template_id?: string | null
          test_session_id?: string
          time_spent?: number | null
          user_answer?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_test_session_id_fkey"
            columns: ["test_session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          assignment_id: string | null
          categories: Json
          completed_at: string | null
          created_at: string | null
          id: string
          mode: string
          score: number | null
          time_limit: number | null
          time_spent: number | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          categories: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mode: string
          score?: number | null
          time_limit?: number | null
          time_spent?: number | null
          total_questions: number
          user_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          categories?: Json
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mode?: string
          score?: number | null
          time_limit?: number | null
          time_spent?: number | null
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["assignment_id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_heartbeat: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_heartbeat?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_heartbeat?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assessment_results: {
        Row: {
          assessment_grade: string | null
          assessment_id: string | null
          assessment_title: string | null
          assignment_id: string | null
          attempts_count: number | null
          best_score: number | null
          class_id: string | null
          class_name: string | null
          last_attempt_at: string | null
          status: string | null
          student_firstname: string | null
          student_id: string | null
          student_lastname: string | null
          student_user_id: string | null
          total_questions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "assessment_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conversations_view: {
        Row: {
          class_id: string | null
          conversation_id: string | null
          created_by: string | null
          is_archived: boolean | null
          is_group: boolean | null
          is_muted: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          last_read_at: string | null
          name: string | null
          other_user_avatar_url: string | null
          other_user_firstname: string | null
          other_user_id: string | null
          other_user_lastname: string | null
          participant_count: number | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assessment_results"
            referencedColumns: ["student_user_id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      award_random_vip_card: {
        Args: { p_student_id: string }
        Returns: string
      }
      can_view_student_profile: {
        Args: { student_profile_id: string }
        Returns: boolean
      }
      check_profanity_simple: {
        Args: { p_text: string }
        Returns: boolean
      }
      cleanup_stale_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_1on1_chat: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: string
      }
      delete_attachment: {
        Args: { p_attachment_id: string }
        Returns: string
      }
      extract_plain_text_from_tiptap: {
        Args: { p_content: Json }
        Returns: string
      }
      generate_join_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_best_geometry_score: {
        Args: { p_exercise_id: string; p_student_id: string }
        Returns: number
      }
      get_class_geometry_stats: {
        Args: { p_class_id: string; p_exercise_id: string }
        Returns: Json
      }
      get_conversation_participants: {
        Args: { p_conversation_id: string }
        Returns: {
          avatar_url: string
          firstname: string
          joined_at: string
          last_read_at: string
          lastname: string
          user_id: string
        }[]
      }
      get_database_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_deck_stats: {
        Args: { p_deck_id: string; p_user_id: string }
        Returns: {
          due_count: number
          learning_count: number
          new_count: number
          review_count: number
          total_cards: number
        }[]
      }
      get_due_cards_for_deck: {
        Args: { p_deck_id: string; p_user_id: string }
        Returns: {
          card_id: string
          card_type: string
          difficulty: number
          next_review: string
          stability: number
          state: string
          template_id: string
        }[]
      }
      get_friend_ids: {
        Args: { p_user_id: string }
        Returns: {
          friend_id: string
        }[]
      }
      get_geometry_progress: {
        Args: { p_exercise_id: string; p_student_id: string }
        Returns: Json
      }
      get_message_attachments: {
        Args: { p_message_id: string }
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          public_url: string
          uploaded_by: string
          uploader_firstname: string
          uploader_lastname: string
        }[]
      }
      get_message_reaction_counts: {
        Args: { p_message_id: string }
        Returns: {
          count: number
          emoji: string
          user_reacted: boolean
        }[]
      }
      get_messages_paginated: {
        Args: {
          p_before_id?: string
          p_before_timestamp?: string
          p_conversation_id: string
          p_limit?: number
        }
        Returns: {
          content: Json
          conversation_id: string
          created_at: string
          edited_at: string
          id: string
          is_flagged: boolean
          plain_text: string
          sender_avatar_url: string
          sender_firstname: string
          sender_id: string
          sender_lastname: string
        }[]
      }
      get_pending_reports_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_reaction_users: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          firstname: string
          lastname: string
          user_id: string
        }[]
      }
      get_reports_for_moderation: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          conversation_id: string
          conversation_name: string
          created_at: string
          details: string
          message_content: Json
          message_created_at: string
          message_id: string
          message_plain_text: string
          reason: string
          report_id: string
          reported_by: string
          reporter_firstname: string
          reporter_lastname: string
          review_notes: string
          reviewed_at: string
          reviewed_by: string
          reviewer_firstname: string
          reviewer_lastname: string
          sender_avatar_url: string
          sender_firstname: string
          sender_id: string
          sender_lastname: string
          status: string
        }[]
      }
      get_teacher_classes_with_data: {
        Args: { p_teacher_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          join_code: string
          name: string
          schedules: Json
          student_count: number
          teacher_id: string
          updated_at: string
        }[]
      }
      get_teacher_classes_with_students: {
        Args: { p_teacher_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          join_code: string
          name: string
          students: Json
          teacher_id: string
          updated_at: string
        }[]
      }
      get_unread_count: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: number
      }
      get_user_conversations: {
        Args: { p_user_id?: string }
        Returns: {
          class_id: string
          conversation_id: string
          is_group: boolean
          is_muted: boolean
          last_message_at: string
          last_message_preview: string
          name: string
          other_user_avatar_url: string
          other_user_firstname: string
          other_user_id: string
          other_user_lastname: string
          participant_count: number
          unread_count: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_class_teacher: {
        Args: { p_class_id: string }
        Returns: boolean
      }
      is_student: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_teacher_or_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_conversation_read: {
        Args: {
          p_conversation_id: string
          p_message_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
      remove_student_vip_card: {
        Args: { p_card_id: string; p_student_id: string }
        Returns: boolean
      }
      report_message: {
        Args: { p_details?: string; p_message_id: string; p_reason: string }
        Returns: string
      }
      review_report: {
        Args: {
          p_delete_message?: boolean
          p_new_status: string
          p_report_id: string
          p_review_notes?: string
        }
        Returns: undefined
      }
      soft_delete_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      toggle_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      update_class_gidouilles: {
        Args: { p_class_id: string; p_delta: number }
        Returns: number
      }
      update_student_gidouilles: {
        Args: { p_delta: number; p_student_id: string }
        Returns: number
      }
      upsert_user_presence: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      use_vip_card: {
        Args: { p_card_id: string; p_student_id: string }
        Returns: boolean
      }
      validate_1on1_chat_creation: {
        Args: { p_user1_id: string; p_user2_id: string }
        Returns: boolean
      }
      validate_attachment_upload: {
        Args: { p_file_size: number; p_message_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      difficulty_level: "easy" | "medium" | "hard"
      exercise_type:
        | "multiple_choice"
        | "free_response"
        | "true_false"
        | "fill_blank"
      user_role: "student" | "teacher" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      difficulty_level: ["easy", "medium", "hard"],
      exercise_type: [
        "multiple_choice",
        "free_response",
        "true_false",
        "fill_blank",
      ],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const
