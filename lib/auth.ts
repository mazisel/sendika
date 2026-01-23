import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AdminUser } from './types';
import { Logger } from './logger';

// Client-side auth işlemleri için cookie-tabanlı client oluştur
const supabase = createClientComponentClient();

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

      // Admin kullanıcı bilgilerini al (Rol detaylarıyla)
      // Önce yeni yapıyı dene (RBAC)
      let adminUser: any = null;
      let dbError: any = null;

      try {
        // 10 saniyelik zaman aşımı tanımla
        const dbQueryPromise = new Promise(async (resolve, reject) => {
          try {
            const { data, error } = await supabase
              .from('admin_users')
              .select(`
                *,
                role_details:roles (
                  id,
                  name,
                  is_system_role,
                  permissions:role_permissions (
                    permission:permissions (
                      key
                    )
                  )
                )
              `)
              .eq('email', credentials.email)
              .eq('is_active', true)
              .single();

            if (error) reject(error);
            else resolve(data);
          } catch (e) {
            reject(e);
          }
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Veritabanı bağlantısı zaman aşımına uğradı')), 10000);
        });

        adminUser = await Promise.race([dbQueryPromise, timeoutPromise]);

      } catch (err: any) {
        // Eğer zaman aşımı hatası değilse ve hata varsa, fallback dene
        // Ancak zaman aşımıysa doğrudan hata ver
        if (err.message === 'Veritabanı bağlantısı zaman aşımına uğradı') {
          console.error('Login DB Timeout');
          await supabase.auth.signOut();
          return { success: false, error: 'Sunucu yanıt vermiyor, lütfen sayfayı yenileyip tekrar deneyin.' };
        }

        console.warn('RBAC query failed, falling back to simple query:', err);
        // Fallback: Eski yapı (Sadece admin_users)
        // Tablolar veya ilişki henüz yoksa bu çalışır
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', credentials.email)
          .eq('is_active', true)
          .single();

        if (error) {
          dbError = error;
        } else {
          adminUser = data;
        }
      }

      if (dbError || !adminUser) {
        console.error('Login database error:', dbError);
        // Supabase auth'dan çıkış yap
        await supabase.auth.signOut();
        return { success: false, error: 'Admin yetkisi bulunamadı' };
      }

      // İzinleri düzleştir
      const permissions: string[] = [];
      if (adminUser.role_details?.permissions) {
        adminUser.role_details.permissions.forEach((p: any) => {
          if (p.permission?.key) {
            permissions.push(p.permission.key);
          }
        });
      }

      // Kullanıcı objesine ekle
      const userWithPermissions: AdminUser = {
        ...adminUser,
        permissions
      };

      // Local storage'a admin bilgilerini kaydet
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_user', JSON.stringify(userWithPermissions));
      }

      await Logger.logLogin(adminUser.id);
      return { success: true, user: userWithPermissions };
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
    role_id?: string;
    city?: string;
    region?: number;
    phone?: string;
  }): Promise<AuthResponse> {
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Oturum bulunamadı' };
      }

      // Call API endpoint
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Kullanıcı oluşturulurken bir hata oluştu' };
      }

      return { success: true, user: result.user };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Kullanıcı oluşturma işlemi sırasında bağlantı hatası' };
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

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}
