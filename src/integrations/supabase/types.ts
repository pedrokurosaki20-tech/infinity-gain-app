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
      checkin_history: {
        Row: {
          amount: number
          checkin_date: string
          created_at: string
          day: number
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          checkin_date: string
          created_at?: string
          day: number
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkin_date?: string
          created_at?: string
          day?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_progress: {
        Row: {
          created_at: string
          current_day: number
          cycles_completed: number
          last_checkin_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_day?: number
          cycles_completed?: number
          last_checkin_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_day?: number
          cycles_completed?: number
          last_checkin_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkin_settings: {
        Row: {
          active: boolean
          created_at: string
          id: boolean
          rewards: number[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: boolean
          rewards?: number[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: boolean
          rewards?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          balance: number
          created_at: string
          device_id: string | null
          email: string | null
          id: string
          invite_code: string | null
          name: string | null
          phone: string | null
          pix_key: string | null
          pix_type: string | null
          referred_by: string | null
          signup_ip: string | null
          status_reason: string | null
          total_earnings: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          balance?: number
          created_at?: string
          device_id?: string | null
          email?: string | null
          id: string
          invite_code?: string | null
          name?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          status_reason?: string | null
          total_earnings?: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          balance?: number
          created_at?: string
          device_id?: string | null
          email?: string | null
          id?: string
          invite_code?: string | null
          name?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          status_reason?: string | null
          total_earnings?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      referral_bonus_claims: {
        Row: {
          amount: number
          created_at: string
          id: string
          period: string
          period_key: string
          target: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          period: string
          period_key: string
          target: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          period?: string
          period_key?: string
          target?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          commission_amount: number
          created_at: string
          first_task_at: string | null
          fraud_reason: string | null
          id: string
          invite_code: string
          referred_id: string
          referrer_id: string
          review_reason: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          first_task_at?: string | null
          fraud_reason?: string | null
          id?: string
          invite_code: string
          referred_id: string
          referrer_id: string
          review_reason?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          commission_amount?: number
          created_at?: string
          first_task_at?: string | null
          fraud_reason?: string | null
          id?: string
          invite_code?: string
          referred_id?: string
          referrer_id?: string
          review_reason?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      share_campaign_logs: {
        Row: {
          action: string
          admin_id: string | null
          admin_name: string | null
          campaign_id: string | null
          created_at: string
          details: string | null
          id: string
          platform: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          admin_name?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          platform: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          admin_name?: string | null
          campaign_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "share_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      share_campaigns: {
        Row: {
          active: boolean
          created_at: string
          file_type: string
          file_url: string | null
          id: string
          platform: string
          share_url: string | null
          text_content: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          file_type?: string
          file_url?: string | null
          id?: string
          platform: string
          share_url?: string | null
          text_content?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          file_type?: string
          file_url?: string | null
          id?: string
          platform?: string
          share_url?: string | null
          text_content?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          link: string | null
          platform: string | null
          proof_path: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["submission_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          platform?: string | null
          proof_path: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          platform?: string | null
          proof_path?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "share_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["txn_type"]
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
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          net_amount: number
          pix_key: string
          pix_type: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          net_amount: number
          pix_key: string
          pix_type: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          net_amount?: number
          pix_key?: string
          pix_type?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
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
      admin_checkin_overview: {
        Args: never
        Returns: {
          checkins_today: number
          current_day: number
          cycles_completed: number
          email: string
          last_checkin_date: string
          name: string
          total_amount: number
          total_checkins: number
          user_id: string
        }[]
      }
      admin_list_referrals: {
        Args: never
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          first_task_at: string
          fraud_reason: string
          id: string
          invite_code: string
          referred_email: string
          referred_id: string
          referred_name: string
          referred_phone: string
          referrer_id: string
          referrer_name: string
          review_reason: string
          status: Database["public"]["Enums"]["referral_status"]
          status_reason: string
        }[]
      }
      admin_list_share_campaigns: {
        Args: never
        Returns: {
          active: boolean
          file_type: string
          file_url: string
          id: string
          platform: string
          share_url: string
          text_content: string
          title: string
          updated_at: string
        }[]
      }
      admin_reset_checkin: { Args: { _user_id: string }; Returns: undefined }
      admin_review_referral: {
        Args: { _action: string; _id: string; _reason?: string }
        Returns: undefined
      }
      admin_save_checkin_settings: {
        Args: { _active: boolean; _rewards: number[] }
        Returns: undefined
      }
      admin_save_share_campaign: {
        Args: {
          _active: boolean
          _file_type: string
          _file_url: string
          _platform: string
          _share_url: string
          _text_content: string
          _title: string
        }
        Returns: string
      }
      admin_set_account_status: {
        Args: {
          _reason?: string
          _status: Database["public"]["Enums"]["account_status"]
          _user_id: string
        }
        Returns: undefined
      }
      checkin_state: {
        Args: never
        Returns: {
          active: boolean
          claimed_today: boolean
          current_day: number
          cycles_completed: number
          last_checkin_date: string
          rewards: number[]
        }[]
      }
      claim_daily_checkin: {
        Args: never
        Returns: {
          amount: number
          cycle_completed: boolean
          day: number
        }[]
      }
      claim_referral_bonus: {
        Args: { _amount: number; _period: string; _target: number }
        Returns: undefined
      }
      credit_balance: {
        Args: {
          _amount: number
          _description: string
          _type: Database["public"]["Enums"]["txn_type"]
          _user_id: string
        }
        Returns: undefined
      }
      gen_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      referral_stats: {
        Args: never
        Returns: {
          daily_valid: number
          pending_total: number
          total_commission: number
          valid_total: number
          weekly_valid: number
        }[]
      }
      request_withdrawal: {
        Args: { _amount: number; _pix_key: string; _pix_type: string }
        Returns: string
      }
      review_task_submission:
        | {
            Args: { _approve: boolean; _id: string; _reason?: string }
            Returns: undefined
          }
        | {
            Args: {
              _amount?: number
              _approve: boolean
              _id: string
              _reason?: string
            }
            Returns: undefined
          }
      review_withdrawal: {
        Args: {
          _id: string
          _reason?: string
          _status: Database["public"]["Enums"]["withdrawal_status"]
        }
        Returns: undefined
      }
      share_campaign_state: {
        Args: { _platform: string }
        Returns: {
          available: boolean
          campaign_id: string
          file_type: string
          file_url: string
          last_status: Database["public"]["Enums"]["submission_status"]
          next_available_at: string
          platform: string
          share_url: string
          text_content: string
          title: string
        }[]
      }
      submit_task_proof: {
        Args: {
          _link?: string
          _platform?: string
          _proof_path: string
          _task_type: Database["public"]["Enums"]["task_type"]
        }
        Returns: string
      }
      validate_referral_first_task: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "blocked"
      app_role: "admin" | "user"
      referral_status: "pending" | "valid" | "rejected" | "suspicious"
      submission_status: "pending" | "approved" | "rejected"
      task_type: "rcs" | "compartilhamento"
      txn_type:
        | "referral_commission"
        | "referral_bonus"
        | "task_reward"
        | "withdrawal"
        | "withdrawal_refund"
        | "bonus_expired"
        | "adjustment"
      withdrawal_status: "requested" | "processing" | "completed" | "rejected"
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
      account_status: ["active", "suspended", "blocked"],
      app_role: ["admin", "user"],
      referral_status: ["pending", "valid", "rejected", "suspicious"],
      submission_status: ["pending", "approved", "rejected"],
      task_type: ["rcs", "compartilhamento"],
      txn_type: [
        "referral_commission",
        "referral_bonus",
        "task_reward",
        "withdrawal",
        "withdrawal_refund",
        "bonus_expired",
        "adjustment",
      ],
      withdrawal_status: ["requested", "processing", "completed", "rejected"],
    },
  },
} as const
