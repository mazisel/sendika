export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'branch_manager';
  role_type: 'general_manager' | 'branch_manager';
  city?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  image_url?: string;
  is_published: boolean;
  published_at?: string;
  category_id?: string;
  category?: Category;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'general' | 'urgent';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Slider {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  button_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Management {
  id: string;
  full_name: string;
  title: string;
  position_order: number;
  image_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
