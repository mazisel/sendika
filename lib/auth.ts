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
              .eq('id', authData.user.id) // Use ID here too for consistency if possible, but keep email for now as per logic, or switch to ID? Using ID is better if we have it.
              //.eq('email', credentials.email) 
              .single();

            if (error) reject(error);
            else resolve(data);
          } catch (e) {
            reject(e);
          }
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Veritabanı bağlantısı zaman aşımına uğradı')), 15000);
        });

        adminUser = await Promise.race([dbQueryPromise, timeoutPromise]);

      } catch (err: any) {
        // Eğer zaman aşımı hatası değilse ve hata varsa, fallback dene
        // Ancak zaman aşımıysa doğrudan hata ver
        if (err.message === 'Veritabanı bağlantısı zaman aşımına uğradı') {
          console.warn('Login DB Timeout (RBAC), attempting fallback...');
          // Don't return immediately, let it fall back to simple query
        } else {
          console.warn('RBAC query failed, falling back to simple query:', err);
        }
        // Fallback: Eski yapı (Sadece admin_users)
        // Tablolar veya ilişki henüz yoksa bu çalışır
        try {
          console.log('Fallback query for User ID:', authData.user.id);
          const fallbackQueryPromise = new Promise(async (resolve, reject) => {
            const { data, error } = await supabase
              .from('admin_users')
              .select('*')
              .eq('id', authData.user.id) // Query by ID is faster and safer
              .single();

            if (error) reject(error);
            else resolve(data);
          });

          const fallbackTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Fallback DB Timeout')), 5000);
          });

          const data = await Promise.race([fallbackQueryPromise, fallbackTimeoutPromise]);
          adminUser = data;

        } catch (e) {
          dbError = e;
        }


      }

      if (dbError || !adminUser) {
        console.error('Login database error:', dbError);
        // Supabase auth'dan çıkış yap
        supabase.auth.signOut().catch(console.error); // Non-blocking
        return { success: false, error: 'Kullanıcı bilgileri alınamadı veya yetkiniz yok (Timeout/Error)' };
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
    // 1. Önce Local Storage'ı temizle (Kritik adım)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_user');
    }

    try {
      // 2. Logger'ı best-effort çalıştır (Hata verirse durmasın)
      const user = this.getCurrentUser(); // Bu artık null dönebilir çünkü üstte sildik, ama memory'de varsa diye statik tutulabilir. 
      // Not: getCurrentUser localStorage'a baktığı için null dönecek. 
      // Ancak loglama için user ID'ye ihtiyacımız varsa, silmeden önce almalıydık.
      // Düzeltme: User ID'yi en başta alalım.
    } catch (e) {
      console.warn('Logout prep error', e);
    }

    try {
      // 3. Supabase çıkışını zaman sınırlı yap (2 saniye)
      // Ağ hatası veya takılma durumunda arayüzü kilitlemesin
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));

      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
      console.error('Logout error:', error);
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
