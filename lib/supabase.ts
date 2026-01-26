import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Cookie-tabanlı Supabase client - tüm client component'ler için paylaşımlı
// Bu sayede login sonrası oturum bilgisi tüm servisler tarafından görülür
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const REALTIME_DISABLED = process.env.NEXT_PUBLIC_DISABLE_REALTIME === 'true'

export const supabase = createClientComponentClient<Database>({
  supabaseUrl,
  supabaseKey,
})

// Database types will be generated here
export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          created_at: string
          email: string
          full_name: string
          phone: string
          workplace: string
          membership_date: string
          status: 'active' | 'inactive'
          region: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          full_name: string
          phone: string
          workplace: string
          membership_date?: string
          status?: 'active' | 'inactive'
          region?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          full_name?: string
          phone?: string
          workplace?: string
          membership_date?: string
          status?: 'active' | 'inactive'
          region?: number | null
        }
      }
      news: {
        Row: {
          id: string
          created_at: string
          title: string
          content: string
          excerpt: string
          published: boolean
          author: string
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          content: string
          excerpt: string
          published?: boolean
          author: string
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          content?: string
          excerpt?: string
          published?: boolean
          author?: string
        }
      }
      sliders: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          link_url: string | null
          button_text: string | null
          is_active: boolean
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          link_url?: string | null
          button_text?: string | null
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          link_url?: string | null
          button_text?: string | null
          is_active?: boolean
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          role_type: string | null
          city: string | null
          region: number | null
          is_active: boolean
          created_at: string
          updated_at: string
          password_hash?: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: string
          role_type?: string | null
          city?: string | null
          region?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          password_hash?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          role_type?: string | null
          city?: string | null
          region?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          password_hash?: string | null
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      header_announcements: {
        Row: {
          id: string
          title: string
          content: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      general_definitions: {
        Row: {
          id: string
          type: string
          label: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          label: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          label?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      member_due_periods: {
        Row: {
          id: string
          name: string
          period_start: string
          period_end: string
          due_date: string
          due_amount: number
          penalty_rate: number
          description: string | null
          status: string
          created_at: string
          published_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          period_start: string
          period_end: string
          due_date: string
          due_amount: number
          penalty_rate?: number
          description?: string | null
          status?: string
          created_at?: string
          published_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          period_start?: string
          period_end?: string
          due_date?: string
          due_amount?: number
          penalty_rate?: number
          description?: string | null
          status?: string
          created_at?: string
          published_at?: string | null
          closed_at?: string | null
        }
      }
      member_dues: {
        Row: {
          id: string
          member_id: string
          period_id: string
          due_date: string
          amount_due: number
          discount_amount: number
          penalty_amount: number
          paid_amount: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          period_id: string
          due_date: string
          amount_due: number
          discount_amount?: number
          penalty_amount?: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          period_id?: string
          due_date?: string
          amount_due?: number
          discount_amount?: number
          penalty_amount?: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      member_due_payments: {
        Row: {
          id: string
          member_due_id: string
          amount: number
          payment_date: string
          payment_method: string
          reference_number: string | null
          recorded_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_due_id: string
          amount: number
          payment_date: string
          payment_method: string
          reference_number?: string | null
          recorded_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_due_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
          recorded_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      finance_accounts: {
        Row: {
          id: string
          name: string
          account_type: string
          currency: string
          opening_balance: number
          current_balance: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          account_type: string
          currency?: string
          opening_balance?: number
          current_balance?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_type?: string
          currency?: string
          opening_balance?: number
          current_balance?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      finance_categories: {
        Row: {
          id: string
          name: string
          category_type: string
          parent_id: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category_type: string
          parent_id?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category_type?: string
          parent_id?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      finance_transactions: {
        Row: {
          id: string
          account_id: string
          category_id: string
          transaction_type: string
          amount: number
          transaction_date: string
          reference_code: string | null
          description: string | null
          member_id: string | null
          member_due_id: string | null
          transfer_account_id: string | null
          created_by: string | null
          approved_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          category_id: string
          transaction_type: string
          amount: number
          transaction_date: string
          reference_code?: string | null
          description?: string | null
          member_id?: string | null
          member_due_id?: string | null
          transfer_account_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          category_id?: string
          transaction_type?: string
          amount?: number
          transaction_date?: string
          reference_code?: string | null
          description?: string | null
          member_id?: string | null
          member_due_id?: string | null
          transfer_account_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      finance_account_summary: {
        Row: {
          account_id: string
          name: string
          account_type: string
          currency: string
          opening_balance: number
          current_balance: number
          transaction_count: number
          total_income: number
          total_expense: number
          total_outgoing_transfer: number
          total_incoming_transfer: number
        }
      }
    }
  }
}
