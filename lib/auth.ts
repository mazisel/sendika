import { supabase } from './supabase';
import { AdminUser } from './types';
import { Logger } from './logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

export class AdminAuth {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Supabase Auth ile giriş yap
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError || !authData.user) {
        return { success: false, error: 'E-posta veya şifre hatalı' };
      }

      // Admin kullanıcı bilgilerini al
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .single();

      if (adminError || !adminUser) {
        // Supabase auth'dan çıkış yap
        await supabase.auth.signOut();
        return { success: false, error: 'Admin yetkisi bulunamadı' };
      }

      // Local storage'a admin bilgilerini kaydet
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
      }

      await Logger.logLogin(adminUser.id);
      return { success: true, user: adminUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Giriş işlemi başarısız' };
    }
  }

  static async logout(): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (user) {
        await Logger.logLogout(user.id);
      }
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_user');
    }
  }

  static getCurrentUser(): AdminUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session !== null;
    } catch {
      return false;
    }
  }

  static async requireAuth(): Promise<void> {
    const isAuth = await this.isAuthenticated();
    if (typeof window !== 'undefined' && !isAuth) {
      window.location.href = '/admin/login';
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role?: 'admin' | 'super_admin' | 'branch_manager';
    role_type?: 'general_manager' | 'regional_manager' | 'branch_manager';
    city?: string;
    region?: number;
  }): Promise<AuthResponse> {
    try {
      // Önce Supabase Auth'da kullanıcı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError || !authData.user) {
        return { success: false, error: 'Kullanıcı oluşturulamadı: ' + authError?.message };
      }

      // Admin tablosuna kullanıcı bilgilerini ekle
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .insert([
          {
            id: authData.user.id, // Supabase Auth user ID'sini kullan
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role || 'admin',
            role_type: userData.role_type || 'general_manager',
            city: userData.city,
            region: userData.region ?? null
          }
        ])
        .select()
        .single();

      if (adminError) {
        // Auth'dan kullanıcıyı sil
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: 'Admin kullanıcı kaydı oluşturulamadı' };
      }

      return { success: true, user: adminUser };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Kullanıcı oluşturma işlemi başarısız' };
    }
  }

  static async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      // Supabase Auth ile şifre güncelle
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'Şifre güncelleme işlemi başarısız' };
    }
  }

  static async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch {
      return null;
    }
  }
}
