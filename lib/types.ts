export type DefinitionType = 'workplace' | 'position' | 'title';

export interface GeneralDefinition {
  id: string;
  type: DefinitionType;
  label: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  user?: AdminUser; // Joined
}

export interface Member {
  id: string;
  membership_number: string;
  decision_number: string | null;
  decision_date: string | null;
  first_name: string;
  last_name: string;
  tc_identity: string;
  birth_date: string;
  gender: string;
  city: string;
  district: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  address: string;
  workplace: string;
  position: string;
  membership_status: 'pending' | 'active' | 'inactive' | 'suspended' | 'resigned';
  membership_date?: string | null;
  due_status?: 'paid' | 'unpaid' | 'partial' | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  education_level: string;
  marital_status: string;
  children_count: number;
  blood_group: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  birth_place?: string | null;
  institution?: string | null;
  institution_register_no?: string | null;
  retirement_register_no?: string | null;
  mobile_password?: string | null;
  last_login_at?: string | null;

  resignation_date?: string | null;
  resignation_reason?: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin' | 'branch_manager' | 'legal_manager';
  role_type: 'general_manager' | 'regional_manager' | 'branch_manager' | 'legal_manager' | null;
  role_id?: string | null;
  role_details?: Role;
  permissions?: string[]; // Runtime only
  city?: string | null;
  region?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  password_hash?: string | null;
  signature_url?: string | null;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  group_name: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  role_type?: 'general_manager' | 'regional_manager' | 'branch_manager' | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Region {
  id: string;
  name: string;
  responsible_id?: string | null;
  responsible_user?: Member;
  created_at: string;
  updated_at: string;
}

export type LegalRequestStatus = 'pending' | 'in_review' | 'lawyer_assigned' | 'completed' | 'cancelled';
export type LegalRequestCategory = 'disciplinary' | 'compensation' | 'consultation' | 'other';

export interface LegalRequest {
  id: string;
  user_id: string;
  member_id?: string;
  member?: Member; // Joined member details
  subject: string;
  description: string;
  category: LegalRequestCategory;
  status: LegalRequestStatus;
  assigned_to?: string;
  assigned_admin?: AdminUser; // Joined admin details
  created_at: string;
  updated_at: string;
}

export interface RegionCityAssignment {
  id: string;
  region_id: string;
  city_code: string;
  city_name: string;
  created_at: string;
}

export interface Branch {
  id: string;
  city: string;
  city_code: string;
  branch_name: string;
  president_name: string;
  president_phone?: string;
  president_email?: string;
  address?: string;
  coordinates_lat?: number;
  coordinates_lng?: number;
  is_active: boolean;
  region_id?: string | null;
  region?: Region;
  responsible_id?: string | null;
  responsible_user?: Member;

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
