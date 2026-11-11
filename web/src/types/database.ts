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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          claim_id: string | null
          client_id: string
          created_at: string
          created_by: string
          id: string
          occurred_at: string
          opportunity_id: string | null
          policy_id: string | null
          summary: string
          type: string
        }
        Insert: {
          claim_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          policy_id?: string | null
          summary: string
          type: string
        }
        Update: {
          claim_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          policy_id?: string | null
          summary?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          event: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          event?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          event?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          event_date: string
          id: string
          insurer_claim_number: string | null
          policy_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description: string
          event_date: string
          id?: string
          insurer_claim_number?: string | null
          policy_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          id?: string
          insurer_claim_number?: string | null
          policy_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          city_state: string | null
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          owner_id: string
          phone: string
          source: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          city_state?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          owner_id: string
          phone: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          city_state?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          coll_agent_pct: number
          coll_exec_pct: number
          created_at: string
          product_id: string
          sale_agent_pct: number
          sale_exec_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coll_agent_pct?: number
          coll_exec_pct?: number
          created_at?: string
          product_id: string
          sale_agent_pct?: number
          sale_exec_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coll_agent_pct?: number
          coll_exec_pct?: number
          created_at?: string
          product_id?: string
          sale_agent_pct?: number
          sale_exec_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      commissions: {
        Row: {
          agent_id: string | null
          amount: number
          base_amount: number
          beneficiary_type: string
          commission_type: string
          created_at: string
          executive_id: string | null
          id: string
          policy_id: string
          rate_pct: number
          receipt_id: string
          settled_at: string | null
          settled_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          base_amount: number
          beneficiary_type: string
          commission_type: string
          created_at?: string
          executive_id?: string | null
          id?: string
          policy_id: string
          rate_pct: number
          receipt_id: string
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          base_amount?: number
          beneficiary_type?: string
          commission_type?: string
          created_at?: string
          executive_id?: string | null
          id?: string
          policy_id?: string
          rate_pct?: number
          receipt_id?: string
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "premium_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string
          id: string
          note: string | null
          opportunity_id: string | null
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date: string
          id?: string
          note?: string | null
          opportunity_id?: string | null
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          note?: string | null
          opportunity_id?: string | null
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "follow_ups_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: string
          seller_id: string
          target_premium: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          seller_id: string
          target_premium: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          seller_id?: string
          target_premium?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      insurers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          archived_at: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          estimated_annual_premium: number
          estimated_close_date: string | null
          id: string
          lost_reason: string | null
          owner_id: string
          product_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          estimated_annual_premium: number
          estimated_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_id: string
          product_id: string
          stage?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          estimated_annual_premium?: number
          estimated_close_date?: string | null
          id?: string
          lost_reason?: string | null
          owner_id?: string
          product_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "opportunities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          agent_id: string | null
          annual_premium: number
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          insurer_id: string
          opportunity_id: string
          owner_id: string
          payment_frequency: string
          policy_number: string
          product_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          annual_premium: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string
          end_date: string
          id?: string
          insurer_id: string
          opportunity_id: string
          owner_id: string
          payment_frequency: string
          policy_number: string
          product_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          annual_premium?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          insurer_id?: string
          opportunity_id?: string
          owner_id?: string
          payment_frequency?: string
          policy_number?: string
          product_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_commission_terms: {
        Row: {
          coll_agent_pct: number
          coll_exec_pct: number
          created_at: string
          policy_id: string
          sale_agent_pct: number
          sale_exec_pct: number
        }
        Insert: {
          coll_agent_pct?: number
          coll_exec_pct?: number
          created_at?: string
          policy_id: string
          sale_agent_pct?: number
          sale_exec_pct?: number
        }
        Update: {
          coll_agent_pct?: number
          coll_exec_pct?: number
          created_at?: string
          policy_id?: string
          sale_agent_pct?: number
          sale_exec_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_commission_terms_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: true
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_commission_terms_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: true
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_receipts: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          paid_by: string | null
          policy_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          paid_by?: string | null
          policy_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          paid_by?: string | null
          policy_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_receipts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_receipts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "premium_receipts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_receipts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          must_change_password?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
    }
    Views: {
      v_commissions: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          amount: number | null
          base_amount: number | null
          beneficiary_type: string | null
          client_name: string | null
          commission_type: string | null
          created_at: string | null
          executive_id: string | null
          executive_name: string | null
          id: string | null
          installment_number: number | null
          policy_id: string | null
          policy_number: string | null
          rate_pct: number | null
          receipt_id: string | null
          settled_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "premium_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_follow_ups: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          is_today: boolean | null
          note: string | null
          opportunity_id: string | null
          owner_id: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      v_policies: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          annual_premium: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          days_to_end: number | null
          effective_status: string | null
          end_date: string | null
          id: string | null
          insurer_id: string | null
          insurer_name: string | null
          opportunity_id: string | null
          owner_id: string | null
          owner_name: string | null
          payment_frequency: string | null
          policy_number: string | null
          product_id: string | null
          product_name: string | null
          start_date: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_receipts: {
        Row: {
          amount: number | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          days_to_due: number | null
          due_date: string | null
          effective_status: string | null
          id: string | null
          installment_number: number | null
          owner_id: string | null
          paid_at: string | null
          policy_id: string | null
          policy_number: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_seller_ranking"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "premium_receipts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_receipts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "v_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_seller_ranking: {
        Row: {
          goal_premium_month: number | null
          lost_count_month: number | null
          open_opportunities: number | null
          open_pipeline_premium: number | null
          overdue_follow_ups: number | null
          overdue_receipts: number | null
          seller_id: string | null
          seller_name: string | null
          won_count_month: number | null
          won_premium_month: number | null
        }
        Relationships: []
      }
      v_team_kpis: {
        Row: {
          lost_count_month: number | null
          open_claims: number | null
          open_opportunities: number | null
          open_pipeline_premium: number | null
          overdue_follow_ups: number | null
          overdue_receipts: number | null
          upcoming_renewals: number | null
          won_count_month: number | null
          won_premium_month: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_role: { Args: never; Returns: string }
      is_active_user: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
      log_event: {
        Args: { p_details?: Json; p_event: string }
        Returns: undefined
      }
      mark_password_changed: { Args: never; Returns: undefined }
      reassign_client: {
        Args: { p_client_id: string; p_new_owner_id: string }
        Returns: undefined
      }
      run_daily_maintenance: { Args: never; Returns: Json }
      today_mx: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
