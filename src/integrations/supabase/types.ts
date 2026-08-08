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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      aviator_settings: {
        Row: {
          auto_rtp_enabled: boolean | null
          house_edge: number
          id: string
          manual_crash_points: number[] | null
          max_bet: number
          min_bet: number
          preparing_duration_seconds: number
          rtp_mode: string
          rtp_percentage: number
          updated_at: string
          updated_by: string | null
          use_manual_crash_point: boolean | null
        }
        Insert: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number
          id?: string
          manual_crash_points?: number[] | null
          max_bet?: number
          min_bet?: number
          preparing_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_manual_crash_point?: boolean | null
        }
        Update: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number
          id?: string
          manual_crash_points?: number[] | null
          max_bet?: number
          min_bet?: number
          preparing_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_manual_crash_point?: boolean | null
        }
        Relationships: []
      }
      aviator_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bets: {
        Row: {
          amount: number
          auto_cashout: number | null
          cashed_out_at: number | null
          created_at: string
          id: string
          profit: number | null
          round_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_cashout?: number | null
          cashed_out_at?: number | null
          created_at?: string
          id?: string
          profit?: number | null
          round_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_cashout?: number | null
          cashed_out_at?: number | null
          created_at?: string
          id?: string
          profit?: number | null
          round_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_games: {
        Row: {
          badge_type: string | null
          created_at: string | null
          game_name: string
          game_route: string
          id: string
          is_active: boolean | null
          poster_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          badge_type?: string | null
          created_at?: string | null
          game_name: string
          game_route: string
          id?: string
          is_active?: boolean | null
          poster_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_type?: string | null
          created_at?: string | null
          game_name?: string
          game_route?: string
          id?: string
          is_active?: boolean | null
          poster_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chicken_road_bets: {
        Row: {
          amount: number
          created_at: string
          difficulty: string
          final_multiplier: number | null
          id: string
          lanes_crossed: number
          profit: number | null
          status: string
          total_lanes: number
          user_id: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          difficulty?: string
          final_multiplier?: number | null
          id?: string
          lanes_crossed?: number
          profit?: number | null
          status?: string
          total_lanes?: number
          user_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          difficulty?: string
          final_multiplier?: number | null
          id?: string
          lanes_crossed?: number
          profit?: number | null
          status?: string
          total_lanes?: number
          user_id?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      chicken_road_how_to_play: {
        Row: {
          content: string
          id: string
          rules: Json
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          rules?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          rules?: Json
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      chicken_road_settings: {
        Row: {
          auto_rtp_enabled: boolean | null
          bet_button_text: string | null
          house_edge: number
          id: string
          lane_odds_easy: Json | null
          lane_odds_expert: Json | null
          lane_odds_hard: Json | null
          lane_odds_medium: Json | null
          lanes_easy: number
          lanes_expert: number
          lanes_hard: number
          lanes_medium: number
          manual_control_enabled: boolean | null
          manual_crash_lanes_easy: number[] | null
          manual_crash_lanes_expert: number[] | null
          manual_crash_lanes_hard: number[] | null
          manual_crash_lanes_medium: number[] | null
          max_bet: number
          min_bet: number
          multiplier_easy: number
          multiplier_expert: number
          multiplier_hard: number
          multiplier_medium: number
          rtp_mode: string | null
          rtp_percentage: number
          updated_at: string
          updated_by: string | null
          use_custom_lane_odds: boolean | null
        }
        Insert: {
          auto_rtp_enabled?: boolean | null
          bet_button_text?: string | null
          house_edge?: number
          id?: string
          lane_odds_easy?: Json | null
          lane_odds_expert?: Json | null
          lane_odds_hard?: Json | null
          lane_odds_medium?: Json | null
          lanes_easy?: number
          lanes_expert?: number
          lanes_hard?: number
          lanes_medium?: number
          manual_control_enabled?: boolean | null
          manual_crash_lanes_easy?: number[] | null
          manual_crash_lanes_expert?: number[] | null
          manual_crash_lanes_hard?: number[] | null
          manual_crash_lanes_medium?: number[] | null
          max_bet?: number
          min_bet?: number
          multiplier_easy?: number
          multiplier_expert?: number
          multiplier_hard?: number
          multiplier_medium?: number
          rtp_mode?: string | null
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_custom_lane_odds?: boolean | null
        }
        Update: {
          auto_rtp_enabled?: boolean | null
          bet_button_text?: string | null
          house_edge?: number
          id?: string
          lane_odds_easy?: Json | null
          lane_odds_expert?: Json | null
          lane_odds_hard?: Json | null
          lane_odds_medium?: Json | null
          lanes_easy?: number
          lanes_expert?: number
          lanes_hard?: number
          lanes_medium?: number
          manual_control_enabled?: boolean | null
          manual_crash_lanes_easy?: number[] | null
          manual_crash_lanes_expert?: number[] | null
          manual_crash_lanes_hard?: number[] | null
          manual_crash_lanes_medium?: number[] | null
          max_bet?: number
          min_bet?: number
          multiplier_easy?: number
          multiplier_expert?: number
          multiplier_hard?: number
          multiplier_medium?: number
          rtp_mode?: string | null
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_custom_lane_odds?: boolean | null
        }
        Relationships: []
      }
      chicken_road_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coin_flip_bets: {
        Row: {
          amount: number
          created_at: string
          id: string
          potential_payout: number
          profit: number | null
          round_id: string
          side: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          potential_payout: number
          profit?: number | null
          round_id: string
          side: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          potential_payout?: number
          profit?: number | null
          round_id?: string
          side?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_flip_rounds: {
        Row: {
          client_seed: string | null
          created_at: string
          finished_at: string | null
          id: string
          nonce: number | null
          result: string | null
          round_number: number
          server_seed: string | null
          server_seed_hash: string | null
          started_at: string
          status: string
        }
        Insert: {
          client_seed?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          nonce?: number | null
          result?: string | null
          round_number: number
          server_seed?: string | null
          server_seed_hash?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          client_seed?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          nonce?: number | null
          result?: string | null
          round_number?: number
          server_seed?: string | null
          server_seed_hash?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      coin_flip_settings: {
        Row: {
          auto_rtp_enabled: boolean | null
          betting_duration_seconds: number
          flip_duration_seconds: number
          house_edge: number
          id: string
          manual_result: string | null
          manual_result_enabled: boolean | null
          max_bet: number
          min_bet: number
          rtp_mode: string
          rtp_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_rtp_enabled?: boolean | null
          betting_duration_seconds?: number
          flip_duration_seconds?: number
          house_edge?: number
          id?: string
          manual_result?: string | null
          manual_result_enabled?: boolean | null
          max_bet?: number
          min_bet?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_rtp_enabled?: boolean | null
          betting_duration_seconds?: number
          flip_duration_seconds?: number
          house_edge?: number
          id?: string
          manual_result?: string | null
          manual_result_enabled?: boolean | null
          max_bet?: number
          min_bet?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coin_flip_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coin_train_settings: {
        Row: {
          auto_rtp_enabled: boolean | null
          house_edge: number
          id: string
          manual_crash_points: number[] | null
          max_bet: number
          min_bet: number
          preparing_duration_seconds: number
          rtp_mode: string
          rtp_percentage: number
          updated_at: string
          updated_by: string | null
          use_manual_crash_point: boolean | null
        }
        Insert: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number
          id?: string
          manual_crash_points?: number[] | null
          max_bet?: number
          min_bet?: number
          preparing_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_manual_crash_point?: boolean | null
        }
        Update: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number
          id?: string
          manual_crash_points?: number[] | null
          max_bet?: number
          min_bet?: number
          preparing_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string
          updated_by?: string | null
          use_manual_crash_point?: boolean | null
        }
        Relationships: []
      }
      coin_train_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_transactions: {
        Row: {
          amount: number
          commission_type: string
          created_at: string
          id: string
          reference_id: string | null
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          amount: number
          commission_type: string
          created_at?: string
          id?: string
          reference_id?: string | null
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          commission_type?: string
          created_at?: string
          id?: string
          reference_id?: string | null
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      custom_themes: {
        Row: {
          colors: Json
          created_at: string | null
          created_by: string | null
          description: string
          gradients: Json
          id: string
          mode: string
          name: string
          preview: Json
          radius: string
          shadows: Json
          updated_at: string | null
        }
        Insert: {
          colors: Json
          created_at?: string | null
          created_by?: string | null
          description: string
          gradients: Json
          id: string
          mode: string
          name: string
          preview: Json
          radius: string
          shadows: Json
          updated_at?: string | null
        }
        Update: {
          colors?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string
          gradients?: Json
          id?: string
          mode?: string
          name?: string
          preview?: Json
          radius?: string
          shadows?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          domain: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          domain: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          domain?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cycling_race_bets: {
        Row: {
          amount: number
          created_at: string
          cyclist_number: number
          id: string
          potential_payout: number
          profit: number | null
          race_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          cyclist_number: number
          id?: string
          potential_payout?: number
          profit?: number | null
          race_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          cyclist_number?: number
          id?: string
          potential_payout?: number
          profit?: number | null
          race_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycling_race_bets_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "cycling_race_races"
            referencedColumns: ["id"]
          },
        ]
      }
      cycling_race_predictions: {
        Row: {
          confidence_percentage: number
          created_at: string
          house_prediction_cyclist: number
          id: string
          race_id: string
          race_number: number
          real_outcome_cyclist: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confidence_percentage: number
          created_at?: string
          house_prediction_cyclist: number
          id?: string
          race_id: string
          race_number: number
          real_outcome_cyclist: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confidence_percentage?: number
          created_at?: string
          house_prediction_cyclist?: number
          id?: string
          race_id?: string
          race_number?: number
          real_outcome_cyclist?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycling_race_predictions_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: true
            referencedRelation: "cycling_race_races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycling_race_predictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cycling_race_prediction_settings: {
        Row: {
          bias_mode: string
          confidence_max: number
          confidence_min: number
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bias_mode?: string
          confidence_max?: number
          confidence_min?: number
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bias_mode?: string
          confidence_max?: number
          confidence_min?: number
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cycling_race_races: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          race_duration: number
          race_number: number
          started_at: string | null
          status: string
          winner_cyclist: number | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          race_duration?: number
          race_number?: number
          started_at?: string | null
          status?: string
          winner_cyclist?: number | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          race_duration?: number
          race_number?: number
          started_at?: string | null
          status?: string
          winner_cyclist?: number | null
        }
        Relationships: []
      }
      cycling_race_settings: {
        Row: {
          auto_rtp_enabled: boolean
          betting_duration_seconds: number
          created_at: string | null
          cyclist_customization: Json | null
          cyclist_odds: Json | null
          house_edge: number
          id: string
          manual_winner_cyclist: number | null
          manual_winner_enabled: boolean
          max_bet: number
          min_bet: number
          number_of_cyclists: number
          race_duration_seconds: number
          rtp_mode: string
          rtp_percentage: number
          updated_at: string | null
          updated_by: string | null
          use_custom_odds: boolean | null
        }
        Insert: {
          auto_rtp_enabled?: boolean
          betting_duration_seconds?: number
          created_at?: string | null
          cyclist_customization?: Json | null
          cyclist_odds?: Json | null
          house_edge?: number
          id?: string
          manual_winner_cyclist?: number | null
          manual_winner_enabled?: boolean
          max_bet?: number
          min_bet?: number
          number_of_cyclists?: number
          race_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string | null
          updated_by?: string | null
          use_custom_odds?: boolean | null
        }
        Update: {
          auto_rtp_enabled?: boolean
          betting_duration_seconds?: number
          created_at?: string | null
          cyclist_customization?: Json | null
          cyclist_odds?: Json | null
          house_edge?: number
          id?: string
          manual_winner_cyclist?: number | null
          manual_winner_enabled?: boolean
          max_bet?: number
          min_bet?: number
          number_of_cyclists?: number
          race_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string | null
          updated_by?: string | null
          use_custom_odds?: boolean | null
        }
        Relationships: []
      }
      exclusive_promotions: {
        Row: {
          badge_color: string
          badge_text: string
          button_link: string | null
          button_text: string
          created_at: string | null
          description: string
          gradient_from: string
          gradient_to: string
          icon_type: string
          id: string
          is_active: boolean | null
          sort_order: number
          subtitle: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          badge_color: string
          badge_text: string
          button_link?: string | null
          button_text: string
          created_at?: string | null
          description: string
          gradient_from: string
          gradient_to: string
          icon_type: string
          id?: string
          is_active?: boolean | null
          sort_order?: number
          subtitle: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          badge_color?: string
          badge_text?: string
          button_link?: string | null
          button_text?: string
          created_at?: string | null
          description?: string
          gradient_from?: string
          gradient_to?: string
          icon_type?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          crash_point: number
          crashed_at: string | null
          created_at: string
          game_type: string | null
          id: string
          round_number: number
          started_at: string
          status: string
        }
        Insert: {
          crash_point: number
          crashed_at?: string | null
          created_at?: string
          game_type?: string | null
          id?: string
          round_number: number
          started_at?: string
          status?: string
        }
        Update: {
          crash_point?: number
          crashed_at?: string | null
          created_at?: string
          game_type?: string | null
          id?: string
          round_number?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          accent_color: string | null
          auto_rtp_enabled: boolean | null
          background_color: string | null
          btc_address: string | null
          btc_enabled: boolean | null
          btc_method_name: string | null
          btc_qr_enabled: boolean | null
          btc_qr_url: string | null
          currency_name: string
          currency_symbol: string
          favicon_url: string | null
          first_deposit_bonus_fixed_amount: number | null
          first_deposit_bonus_percent: number
          hidden_categories: string[] | null
          hidden_games: string[] | null
          house_edge: number
          id: string
          loan_feature_enabled: boolean | null
          manual_crash_points: number[] | null
          max_crash_point: number
          max_deposit: number | null
          min_crash_point: number
          min_deposit: number | null
          mpesa_enabled: boolean
          mpesa_shortcode: string | null
          primary_color: string | null
          referral_bet_commission_percent: number
          referral_first_deposit_commission_percent: number
          rtp_mode: string | null
          rtp_percentage: number | null
          secondary_color: string | null
          show_utr_number: boolean | null
          show_wallet_address: boolean | null
          signup_bonus_amount: number | null
          theme_name: string | null
          updated_at: string
          updated_by: string | null
          upi_enabled: boolean | null
          upi_id: string | null
          upi_method_name: string | null
          upi_qr_enabled: boolean | null
          upi_qr_url: string | null
          usdt_address: string | null
          usdt_conversion_rate: number | null
          usdt_enabled: boolean | null
          usdt_method_name: string | null
          usdt_qr_enabled: boolean | null
          usdt_qr_url: string | null
          use_manual_crash_point: boolean | null
          wager_requirement_enabled: boolean | null
          wager_requirement_multiplier: number
          website_logo_url: string | null
          website_name: string | null
          withdrawals_enabled: boolean
          tenant_id: string | null
        }
        Insert: {
          accent_color?: string | null
          auto_rtp_enabled?: boolean | null
          background_color?: string | null
          btc_address?: string | null
          btc_enabled?: boolean | null
          btc_method_name?: string | null
          btc_qr_enabled?: boolean | null
          btc_qr_url?: string | null
          currency_name?: string
          currency_symbol?: string
          favicon_url?: string | null
          first_deposit_bonus_fixed_amount?: number | null
          first_deposit_bonus_percent?: number
          hidden_categories?: string[] | null
          hidden_games?: string[] | null
          house_edge?: number
          id?: string
          loan_feature_enabled?: boolean | null
          manual_crash_points?: number[] | null
          max_crash_point?: number
          max_deposit?: number | null
          min_crash_point?: number
          min_deposit?: number | null
          mpesa_enabled?: boolean
          mpesa_shortcode?: string | null
          primary_color?: string | null
          referral_bet_commission_percent?: number
          referral_first_deposit_commission_percent?: number
          rtp_mode?: string | null
          rtp_percentage?: number | null
          secondary_color?: string | null
          show_utr_number?: boolean | null
          show_wallet_address?: boolean | null
          signup_bonus_amount?: number | null
          theme_name?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_enabled?: boolean | null
          upi_id?: string | null
          upi_method_name?: string | null
          upi_qr_enabled?: boolean | null
          upi_qr_url?: string | null
          usdt_address?: string | null
          usdt_conversion_rate?: number | null
          usdt_enabled?: boolean | null
          usdt_method_name?: string | null
          usdt_qr_enabled?: boolean | null
          usdt_qr_url?: string | null
          use_manual_crash_point?: boolean | null
          wager_requirement_enabled?: boolean | null
          wager_requirement_multiplier?: number
          website_logo_url?: string | null
          website_name?: string | null
          withdrawals_enabled?: boolean
          tenant_id?: string | null
        }
        Update: {
          accent_color?: string | null
          auto_rtp_enabled?: boolean | null
          background_color?: string | null
          btc_address?: string | null
          btc_enabled?: boolean | null
          btc_method_name?: string | null
          btc_qr_enabled?: boolean | null
          btc_qr_url?: string | null
          currency_name?: string
          currency_symbol?: string
          favicon_url?: string | null
          first_deposit_bonus_fixed_amount?: number | null
          first_deposit_bonus_percent?: number
          hidden_categories?: string[] | null
          hidden_games?: string[] | null
          house_edge?: number
          id?: string
          loan_feature_enabled?: boolean | null
          manual_crash_points?: number[] | null
          max_crash_point?: number
          max_deposit?: number | null
          min_crash_point?: number
          min_deposit?: number | null
          mpesa_enabled?: boolean
          mpesa_shortcode?: string | null
          primary_color?: string | null
          referral_bet_commission_percent?: number
          referral_first_deposit_commission_percent?: number
          rtp_mode?: string | null
          rtp_percentage?: number | null
          secondary_color?: string | null
          show_utr_number?: boolean | null
          show_wallet_address?: boolean | null
          signup_bonus_amount?: number | null
          theme_name?: string | null
          updated_at?: string
          updated_by?: string | null
          upi_enabled?: boolean | null
          upi_id?: string | null
          upi_method_name?: string | null
          upi_qr_enabled?: boolean | null
          upi_qr_url?: string | null
          usdt_address?: string | null
          usdt_conversion_rate?: number | null
          usdt_enabled?: boolean | null
          usdt_method_name?: string | null
          usdt_qr_enabled?: boolean | null
          usdt_qr_url?: string | null
          use_manual_crash_point?: boolean | null
          wager_requirement_enabled?: boolean | null
          wager_requirement_multiplier?: number
          website_logo_url?: string | null
          website_name?: string | null
          withdrawals_enabled?: boolean
          tenant_id?: string | null
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          document_type: string
          id: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type: string
          id?: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string
          id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      loan_transactions: {
        Row: {
          created_at: string
          id: string
          loan_amount: number
          recovered_at: string | null
          recovery_amount: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loan_amount: number
          recovered_at?: string | null
          recovery_amount?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loan_amount?: number
          recovered_at?: string | null
          recovery_amount?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      marketers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketer_site_assignments: {
        Row: {
          id: string
          marketer_id: string
          tenant_id: string
          created_at: string
        }
        Insert: {
          id?: string
          marketer_id: string
          tenant_id: string
          created_at?: string
        }
        Update: {
          id?: string
          marketer_id?: string
          tenant_id?: string
          created_at?: string
        }
        Relationships: []
      }
      marketer_settings: {
        Row: {
          id: string
          revenue_share_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          revenue_share_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          revenue_share_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      marketer_withdrawals: {
        Row: {
          id: string
          marketer_id: string
          amount: number
          status: string
          payment_method: string | null
          payment_details: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          marketer_id: string
          amount: number
          status?: string
          payment_method?: string | null
          payment_details?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          marketer_id?: string
          amount?: number
          status?: string
          payment_method?: string | null
          payment_details?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mines_bets: {
        Row: {
          amount: number
          client_seed: string | null
          created_at: string | null
          current_multiplier: number | null
          final_multiplier: number | null
          grid_size: number | null
          id: string
          mine_positions: number[] | null
          mines_count: number
          nonce: number | null
          profit: number | null
          server_seed: string | null
          status: string | null
          tiles_revealed: number[] | null
          user_id: string
        }
        Insert: {
          amount: number
          client_seed?: string | null
          created_at?: string | null
          current_multiplier?: number | null
          final_multiplier?: number | null
          grid_size?: number | null
          id?: string
          mine_positions?: number[] | null
          mines_count: number
          nonce?: number | null
          profit?: number | null
          server_seed?: string | null
          status?: string | null
          tiles_revealed?: number[] | null
          user_id: string
        }
        Update: {
          amount?: number
          client_seed?: string | null
          created_at?: string | null
          current_multiplier?: number | null
          final_multiplier?: number | null
          grid_size?: number | null
          id?: string
          mine_positions?: number[] | null
          mines_count?: number
          nonce?: number | null
          profit?: number | null
          server_seed?: string | null
          status?: string | null
          tiles_revealed?: number[] | null
          user_id?: string
        }
        Relationships: []
      }
      mines_settings: {
        Row: {
          auto_rtp_enabled: boolean | null
          house_edge: number | null
          id: string
          max_bet: number | null
          min_bet: number | null
          rtp_mode: string | null
          rtp_percentage: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number | null
          id?: string
          max_bet?: number | null
          min_bet?: number | null
          rtp_mode?: string | null
          rtp_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_rtp_enabled?: boolean | null
          house_edge?: number | null
          id?: string
          max_bet?: number | null
          min_bet?: number | null
          rtp_mode?: string | null
          rtp_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      mines_stats: {
        Row: {
          created_at: string | null
          current_profit_percent: number | null
          date: string | null
          id: string
          total_bets: number | null
          total_paidout: number | null
          total_wagered: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string | null
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_profit_percent?: number | null
          date?: string | null
          id?: string
          total_bets?: number | null
          total_paidout?: number | null
          total_wagered?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      offer_rain_claims: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          rain_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string
          id?: string
          rain_id: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          rain_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_rain_claims_rain_id_fkey"
            columns: ["rain_id"]
            isOneToOne: false
            referencedRelation: "offer_rains"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_rains: {
        Row: {
          amount_per_person: number
          claimed_count: number
          created_at: string
          creator_id: string
          expires_at: string
          id: string
          max_claimers: number
          pot_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_per_person?: number
          claimed_count?: number
          created_at?: string
          creator_id: string
          expires_at: string
          id?: string
          max_claimers?: number
          pot_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount_per_person?: number
          claimed_count?: number
          created_at?: string
          creator_id?: string
          expires_at?: string
          id?: string
          max_claimers?: number
          pot_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      plinko_settings: {
        Row: {
          created_at: string | null
          id: string
          rtp_percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rtp_percentage?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rtp_percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          banned_at: string | null
          created_at: string
          email: string
          id: string
          is_banned: boolean
          pin: string | null
          tenant_id: string | null
          total_deposited: number
          updated_at: string
          username: string | null
          vip_tier_id: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          email: string
          id: string
          is_banned?: boolean
          pin?: string | null
          tenant_id?: string | null
          total_deposited?: number
          updated_at?: string
          username?: string | null
          vip_tier_id?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_banned?: boolean
          pin?: string | null
          tenant_id?: string | null
          total_deposited?: number
          updated_at?: string
          username?: string | null
          vip_tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_vip_tier_id_fkey"
            columns: ["vip_tier_id"]
            isOneToOne: false
            referencedRelation: "vip_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          total_earnings: number
          total_referrals: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          total_earnings?: number
          total_referrals?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          total_earnings?: number
          total_referrals?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          reward_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_id: string
          reward_amount?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          reward_amount?: number
          status?: string
        }
        Relationships: []
      }
      spin_achievements: {
        Row: {
          achievement_type: string
          badge_color: string
          created_at: string | null
          criteria_value: number
          description: string
          icon: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          achievement_type: string
          badge_color?: string
          created_at?: string | null
          criteria_value: number
          description: string
          icon: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          achievement_type?: string
          badge_color?: string
          created_at?: string | null
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spin_wheel_prizes: {
        Row: {
          amount: number
          color: string
          created_at: string | null
          id: string
          label: string
          position: number
          updated_at: string | null
        }
        Insert: {
          amount?: number
          color: string
          created_at?: string | null
          id?: string
          label: string
          position: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          color?: string
          created_at?: string | null
          id?: string
          label?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          message: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          mpesa_checkout_request_id: string | null
          mpesa_conversation_id: string | null
          mpesa_receipt: string | null
          payment_method: string | null
          payment_proof: string | null
          phone_number: string | null
          status: string
          tenant_id: string | null
          transaction_hash: string | null
          type: string
          user_id: string
          utr_number: string | null
          wallet_address: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_conversation_id?: string | null
          mpesa_receipt?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          phone_number?: string | null
          status?: string
          tenant_id?: string | null
          transaction_hash?: string | null
          type: string
          user_id: string
          utr_number?: string | null
          wallet_address?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          mpesa_checkout_request_id?: string | null
          mpesa_conversation_id?: string | null
          mpesa_receipt?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          phone_number?: string | null
          status?: string
          tenant_id?: string | null
          transaction_hash?: string | null
          type?: string
          user_id?: string
          utr_number?: string | null
          wallet_address?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_spin_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_spin_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "spin_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_spin_stats: {
        Row: {
          created_at: string | null
          current_streak: number
          id: string
          last_spin_date: string | null
          longest_streak: number
          total_earnings: number
          total_spins: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_spin_date?: string | null
          longest_streak?: number
          total_earnings?: number
          total_spins?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number
          id?: string
          last_spin_date?: string | null
          longest_streak?: number
          total_earnings?: number
          total_spins?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_tiers: {
        Row: {
          bonus_percentage: number
          color: string
          created_at: string
          deposit_threshold: number
          icon: string | null
          id: string
          name: string
          tier_level: number
          updated_at: string
        }
        Insert: {
          bonus_percentage?: number
          color?: string
          created_at?: string
          deposit_threshold?: number
          icon?: string | null
          id?: string
          name: string
          tier_level: number
          updated_at?: string
        }
        Update: {
          bonus_percentage?: number
          color?: string
          created_at?: string
          deposit_threshold?: number
          icon?: string | null
          id?: string
          name?: string
          tier_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
          wallet_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
          wallet_type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
          wallet_type?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          first_deposit_received: boolean
          id: string
          last_deposit_amount: number
          loan_amount: number
          loan_eligible: boolean
          loan_taken_at: string | null
          updated_at: string
          user_id: string
          wager_completed: number
          wager_required: number
          wallet_bonus: number
          wallet_cash: number
        }
        Insert: {
          balance?: number
          created_at?: string
          first_deposit_received?: boolean
          id?: string
          last_deposit_amount?: number
          loan_amount?: number
          loan_eligible?: boolean
          loan_taken_at?: string | null
          updated_at?: string
          user_id: string
          wager_completed?: number
          wager_required?: number
          wallet_bonus?: number
          wallet_cash?: number
        }
        Update: {
          balance?: number
          created_at?: string
          first_deposit_received?: boolean
          id?: string
          last_deposit_amount?: number
          loan_amount?: number
          loan_eligible?: boolean
          loan_taken_at?: string | null
          updated_at?: string
          user_id?: string
          wager_completed?: number
          wager_required?: number
          wallet_bonus?: number
          wallet_cash?: number
        }
        Relationships: []
      }
      wingo_bets: {
        Row: {
          amount: number
          bet_type: string | null
          created_at: string | null
          id: string
          payout: number | null
          result: string | null
          round_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          bet_type?: string | null
          created_at?: string | null
          id?: string
          payout?: number | null
          result?: string | null
          round_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          bet_type?: string | null
          created_at?: string | null
          id?: string
          payout?: number | null
          result?: string | null
          round_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wingo_bets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "wingo_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wingo_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wingo_rounds: {
        Row: {
          created_at: string | null
          id: string
          result: string | null
          round_number: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          result?: string | null
          round_number?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          result?: string | null
          round_number?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wingo_settings: {
        Row: {
          auto_rtp_enabled: boolean
          betting_duration_seconds: number
          created_at: string | null
          green_multiplier: number
          house_edge: number
          id: string
          manual_result_enabled: boolean
          max_bet: number
          min_bet: number
          red_multiplier: number
          result_duration_seconds: number
          rtp_mode: string
          rtp_percentage: number
          updated_at: string | null
          violet_multiplier: number
        }
        Insert: {
          auto_rtp_enabled?: boolean
          betting_duration_seconds?: number
          created_at?: string | null
          green_multiplier?: number
          house_edge?: number
          id?: string
          manual_result_enabled?: boolean
          max_bet?: number
          min_bet?: number
          red_multiplier?: number
          result_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string | null
          violet_multiplier?: number
        }
        Update: {
          auto_rtp_enabled?: boolean
          betting_duration_seconds?: number
          created_at?: string | null
          green_multiplier?: number
          house_edge?: number
          id?: string
          manual_result_enabled?: boolean
          max_bet?: number
          min_bet?: number
          red_multiplier?: number
          result_duration_seconds?: number
          rtp_mode?: string
          rtp_percentage?: number
          updated_at?: string | null
          violet_multiplier?: number
        }
        Relationships: []
      }
    }
    Views: {
      profile_public_usernames: {
        Row: {
          id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      get_user_stats: {
        Args: { user_id_param: string }
        Returns: {
          biggest_win: number
          total_bets: number
          total_profit: number
          total_wagered: number
          win_rate: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_cycling_race_predictions: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: {
          confidence_percentage: number
          is_verified_outcome: boolean
          predicted_cyclist: number
          race_number: number
        }[]
      }
      regenerate_house_cycling_race_prediction: {
        Args: { p_prediction_id: string }
        Returns: {
          confidence_percentage: number
          created_at: string
          house_prediction_cyclist: number
          id: string
          race_id: string
          race_number: number
          real_outcome_cyclist: number
          status: string
          tenant_id: string
          updated_at: string
        }
      }
      set_profile_account_type: {
        Args: { p_account_type: string; p_user_id: string }
        Returns: {
          account_type: string
          avatar_url: string | null
          banned_at: string | null
          created_at: string
          email: string
          id: string
          is_banned: boolean
          pin: string | null
          tenant_id: string | null
          total_deposited: number
          updated_at: string
          username: string | null
          vip_tier_id: string | null
        }
      }
      update_profile_total_deposited: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user", "marketer"],
    },
  },
} as const
