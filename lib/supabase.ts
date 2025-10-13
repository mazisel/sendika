import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
          sort_order: number
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
          sort_order?: number
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
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          full_name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          full_name: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
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
    }
  }
}
