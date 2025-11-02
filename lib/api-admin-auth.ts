import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase';
import { supabaseAdmin } from './supabase-admin';

interface AuthenticatedAdmin {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_type: string | null;
  city: string | null;
}

interface AdminAuthResult {
  admin?: AuthenticatedAdmin;
  accessToken?: string;
  status?: number;
  error?: string;
}

/**
 * API istekleri için Supabase oturumunu ve admin yetkisini doğrular.
 */
export async function getAuthenticatedAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    let authenticatedUser = user;
    let accessToken: string | undefined;

    if (!authenticatedUser) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader?.trim();

      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Supabase yapılandırma değişkenleri eksik: NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY');
        } else {
          const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          });

          const {
            data: tokenData,
            error: tokenError
          } = await supabaseWithToken.auth.getUser(token);

          if (tokenError) {
            console.error('Supabase access token doğrulanamadı:', tokenError);
          } else {
            authenticatedUser = tokenData.user ?? null;
            accessToken = token ?? undefined;
          }
        }
      }
    } else {
      const {
        data: sessionData
      } = await supabase.auth.getSession();
      accessToken = sessionData?.session?.access_token;
    }

    if (!authenticatedUser) {
      return { status: 401, error: 'Yetkisiz erişim.' };
    }

    const selectColumns = 'id, email, full_name, role, role_type, city, is_active';

    const { data: adminUserById, error: adminErrorById } = await supabaseAdmin
      .from('admin_users')
      .select(selectColumns)
      .eq('id', authenticatedUser.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminErrorById) {
      console.error('Admin kullanıcı doğrulaması başarısız (id sorgusu):', adminErrorById);
      return { status: 500, error: 'Admin yetkisi doğrulanamadı.' };
    }

    let adminRecord = adminUserById;

    if (!adminRecord && authenticatedUser.email) {
      const { data: adminUserByEmail, error: adminErrorByEmail } = await supabaseAdmin
        .from('admin_users')
        .select(selectColumns)
        .eq('email', authenticatedUser.email)
        .eq('is_active', true)
        .maybeSingle();

      if (adminErrorByEmail) {
        console.error('Admin kullanıcı doğrulaması başarısız (email sorgusu):', adminErrorByEmail);
        return { status: 500, error: 'Admin yetkisi doğrulanamadı.' };
      }

      adminRecord = adminUserByEmail ?? null;
    }

    if (!adminRecord) {
      return { status: 403, error: 'Admin yetkisi bulunamadı.' };
    }

    return {
      admin: {
        id: adminRecord.id,
        email: adminRecord.email,
        full_name: adminRecord.full_name,
        role: adminRecord.role,
        role_type: adminRecord.role_type,
        city: adminRecord.city
      },
      accessToken
    };
  } catch (error) {
    console.error('Admin doğrulama hatası:', error);
    return { status: 500, error: 'Beklenmeyen bir hata oluştu.' };
  }
}
