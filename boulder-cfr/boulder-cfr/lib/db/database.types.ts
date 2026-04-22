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
      audit_log: {
        Row: {
          action: string
          after_json: Json | null
          at: string
          before_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_json?: Json | null
          at?: string
          before_json?: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_json?: Json | null
          at?: string
          before_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bid_line_items: {
        Row: {
          budget_cents: number
          coding: string | null
          created_at: string
          division_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          budget_cents: number
          coding?: string | null
          created_at?: string
          division_id: string
          id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          budget_cents?: number
          coding?: string | null
          created_at?: string
          division_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_division_id_divisions_id_fk"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount_cents: number
          approved_in_draw_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          number: number
          project_id: string
          status: Database["public"]["Enums"]["co_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          approved_in_draw_id?: string | null
          created_at?: string
          date: string
          description: string
          id: string
          number: number
          project_id: string
          status?: Database["public"]["Enums"]["co_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          approved_in_draw_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          number?: number
          project_id?: string
          status?: Database["public"]["Enums"]["co_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          created_at: string
          id: string
          name: string
          number: number
          project_id: string
          retainage_bps_override: number | null
          scheduled_value_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          number: number
          project_id: string
          retainage_bps_override?: number | null
          scheduled_value_cents: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          number?: number
          project_id?: string
          retainage_bps_override?: number | null
          scheduled_value_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_line_items: {
        Row: {
          col_c_scheduled_value_cents: number
          col_d_from_previous_cents: number
          col_e_this_period_cents: number
          col_f_materials_stored_cents: number
          col_g_completed_stored_cents: number
          col_g_percent_bps: number
          col_h_balance_cents: number
          col_i_retainage_cents: number
          created_at: string
          division_id: string
          draw_id: string
          id: string
          updated_at: string
        }
        Insert: {
          col_c_scheduled_value_cents: number
          col_d_from_previous_cents?: number
          col_e_this_period_cents?: number
          col_f_materials_stored_cents?: number
          col_g_completed_stored_cents?: number
          col_g_percent_bps?: number
          col_h_balance_cents?: number
          col_i_retainage_cents?: number
          created_at?: string
          division_id: string
          draw_id: string
          id: string
          updated_at?: string
        }
        Update: {
          col_c_scheduled_value_cents?: number
          col_d_from_previous_cents?: number
          col_e_this_period_cents?: number
          col_f_materials_stored_cents?: number
          col_g_completed_stored_cents?: number
          col_g_percent_bps?: number
          col_h_balance_cents?: number
          col_i_retainage_cents?: number
          created_at?: string
          division_id?: string
          draw_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_line_items_division_id_divisions_id_fk"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_line_items_draw_id_draws_id_fk"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          certified_at: string | null
          certified_by: string | null
          created_at: string
          id: string
          line1_contract_sum_cents: number
          line2_net_co_cents: number
          line3_contract_sum_to_date_cents: number
          line4_completed_stored_cents: number
          line5_retainage_cents: number
          line6_earned_less_retainage_cents: number
          line7_less_previous_cents: number
          line8_current_payment_due_cents: number
          line9_balance_to_finish_cents: number
          number: number
          paid_at: string | null
          period_end_date: string
          project_id: string
          status: Database["public"]["Enums"]["draw_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id: string
          line1_contract_sum_cents: number
          line2_net_co_cents?: number
          line3_contract_sum_to_date_cents: number
          line4_completed_stored_cents: number
          line5_retainage_cents: number
          line6_earned_less_retainage_cents: number
          line7_less_previous_cents: number
          line8_current_payment_due_cents: number
          line9_balance_to_finish_cents: number
          number: number
          paid_at?: string | null
          period_end_date: string
          project_id: string
          status?: Database["public"]["Enums"]["draw_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          id?: string
          line1_contract_sum_cents?: number
          line2_net_co_cents?: number
          line3_contract_sum_to_date_cents?: number
          line4_completed_stored_cents?: number
          line5_retainage_cents?: number
          line6_earned_less_retainage_cents?: number
          line7_less_previous_cents?: number
          line8_current_payment_due_cents?: number
          line9_balance_to_finish_cents?: number
          number?: number
          paid_at?: string | null
          period_end_date?: string
          project_id?: string
          status?: Database["public"]["Enums"]["draw_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draws_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_backup: {
        Row: {
          amount_cents: number
          check_ref: string | null
          commentary: string | null
          created_at: string
          description: string
          draw_id: string
          g703_division_id: string
          id: string
          net_cents: number
          retainage_cents: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          check_ref?: string | null
          commentary?: string | null
          created_at?: string
          description: string
          draw_id: string
          g703_division_id: string
          id: string
          net_cents?: number
          retainage_cents?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          check_ref?: string | null
          commentary?: string | null
          created_at?: string
          description?: string
          draw_id?: string
          g703_division_id?: string
          id?: string
          net_cents?: number
          retainage_cents?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_backup_draw_id_draws_id_fk"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_backup_g703_division_id_divisions_id_fk"
            columns: ["g703_division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_backup_transaction_id_transactions_id_fk"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          org_role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          org_id: string
          org_role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          org_role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id: string
          name: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      project_memberships: {
        Row: {
          created_at: string
          id: string
          project_id: string
          project_role: Database["public"]["Enums"]["project_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          project_id: string
          project_role: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          project_role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          architect_org_id: string
          contract_date: string
          contract_sum_cents: number
          contractor_org_id: string
          cover_color: string
          created_at: string
          default_retainage_bps: number
          id: string
          name: string
          owner_org_id: string
          project_number: string | null
          retainage_on_stored_materials: boolean
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          address: string
          architect_org_id: string
          contract_date: string
          contract_sum_cents: number
          contractor_org_id: string
          cover_color?: string
          created_at?: string
          default_retainage_bps?: number
          id: string
          name: string
          owner_org_id: string
          project_number?: string | null
          retainage_on_stored_materials?: boolean
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          architect_org_id?: string
          contract_date?: string
          contract_sum_cents?: number
          contractor_org_id?: string
          cover_color?: string
          created_at?: string
          default_retainage_bps?: number
          id?: string
          name?: string
          owner_org_id?: string
          project_number?: string | null
          retainage_on_stored_materials?: boolean
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_architect_org_id_organizations_id_fk"
            columns: ["architect_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contractor_org_id_organizations_id_fk"
            columns: ["contractor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_org_id_organizations_id_fk"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      received_funds: {
        Row: {
          counterparty: string | null
          created_at: string
          date: string | null
          description: string
          division_id: string
          draw_id: string | null
          draw_number: number
          gross_cents: number
          id: string
          net_cents: number
          project_id: string
          retainage_cents: number
          updated_at: string
        }
        Insert: {
          counterparty?: string | null
          created_at?: string
          date?: string | null
          description: string
          division_id: string
          draw_id?: string | null
          draw_number: number
          gross_cents: number
          id: string
          net_cents?: number
          project_id: string
          retainage_cents?: number
          updated_at?: string
        }
        Update: {
          counterparty?: string | null
          created_at?: string
          date?: string | null
          description?: string
          division_id?: string
          draw_id?: string | null
          draw_number?: number
          gross_cents?: number
          id?: string
          net_cents?: number
          project_id?: string
          retainage_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "received_funds_division_id_divisions_id_fk"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "received_funds_draw_id_draws_id_fk"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "received_funds_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          bid_line_item_id: string | null
          commentary: string | null
          counterparty: string | null
          created_at: string
          date: string | null
          description: string
          division_id: string
          draw_number: number | null
          id: string
          linked_draw_id: string | null
          linked_invoice_id: string | null
          net_cents: number
          paid_by: string | null
          payment_status: Database["public"]["Enums"]["tx_payment_status"]
          project_id: string
          retainage_cents: number
          source: Database["public"]["Enums"]["tx_source"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          vendor: string
        }
        Insert: {
          amount_cents: number
          bid_line_item_id?: string | null
          commentary?: string | null
          counterparty?: string | null
          created_at?: string
          date?: string | null
          description: string
          division_id: string
          draw_number?: number | null
          id: string
          linked_draw_id?: string | null
          linked_invoice_id?: string | null
          net_cents?: number
          paid_by?: string | null
          payment_status?: Database["public"]["Enums"]["tx_payment_status"]
          project_id: string
          retainage_cents?: number
          source?: Database["public"]["Enums"]["tx_source"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          vendor: string
        }
        Update: {
          amount_cents?: number
          bid_line_item_id?: string | null
          commentary?: string | null
          counterparty?: string | null
          created_at?: string
          date?: string | null
          description?: string
          division_id?: string
          draw_number?: number | null
          id?: string
          linked_draw_id?: string | null
          linked_invoice_id?: string | null
          net_cents?: number
          paid_by?: string | null
          payment_status?: Database["public"]["Enums"]["tx_payment_status"]
          project_id?: string
          retainage_cents?: number
          source?: Database["public"]["Enums"]["tx_source"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bid_line_item_id_bid_line_items_id_fk"
            columns: ["bid_line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_division_id_divisions_id_fk"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_projects_id_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider_id: string | null
          avatar_color: string
          created_at: string
          email: string
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          auth_provider_id?: string | null
          avatar_color?: string
          created_at?: string
          email: string
          id: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          auth_provider_id?: string | null
          avatar_color?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_organizations_id_fk"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      co_status: "pending" | "approved" | "rejected"
      draw_status: "draft" | "submitted" | "certified" | "paid" | "voided"
      org_role: "admin" | "member" | "viewer"
      org_type: "contractor" | "owner" | "architect" | "accountant"
      project_role:
        | "contractor_admin"
        | "contractor_pm"
        | "contractor_viewer"
        | "owner"
        | "architect"
        | "accountant"
      project_status: "active" | "completed" | "on_hold"
      tx_payment_status: "pending" | "paid" | "voided"
      tx_source: "manual" | "excel_import" | "invoice_upload" | "api"
      tx_type:
        | "invoice"
        | "payroll"
        | "expense"
        | "change_order_cost"
        | "credit"
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
      co_status: ["pending", "approved", "rejected"],
      draw_status: ["draft", "submitted", "certified", "paid", "voided"],
      org_role: ["admin", "member", "viewer"],
      org_type: ["contractor", "owner", "architect", "accountant"],
      project_role: [
        "contractor_admin",
        "contractor_pm",
        "contractor_viewer",
        "owner",
        "architect",
        "accountant",
      ],
      project_status: ["active", "completed", "on_hold"],
      tx_payment_status: ["pending", "paid", "voided"],
      tx_source: ["manual", "excel_import", "invoice_upload", "api"],
      tx_type: ["invoice", "payroll", "expense", "change_order_cost", "credit"],
    },
  },
} as const
