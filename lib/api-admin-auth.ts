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

const decodeJwtPayload = (token: string): { sub?: string; email?: string; exp?: number } | null => {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

/**
 * API istekleri için Supabase oturumunu ve admin yetkisini doğrular.
 */
export async function getAuthenticatedAdmin(request: NextRequest): Promise<AdminAuthResult> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY eksik!');
      return { status: 500, error: 'Sunucu yapılandırma hatası: Service Role Key eksik.' };
    }

    // Debug log for authentication issues
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(`Debug Auth: Key length: ${key.length}, Starts with: ${key.substring(0, 10)}...`);

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
            if (tokenError.name === 'AuthSessionMissingError') {
              const decoded = decodeJwtPayload(token);
              const isExpired = decoded?.exp ? decoded.exp * 1000 < Date.now() : true;
              if (decoded?.sub && !isExpired) {
                authenticatedUser = {
                  id: decoded.sub,
                  email: decoded.email ?? ''
                } as any;
                accessToken = token ?? undefined;
              }
            }

            if (!authenticatedUser) {
              console.error('Supabase access token doğrulanamadı:', tokenError);
            }
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
      return { status: 500, error: `Admin yetkisi doğrulanamadı (ID: ${adminErrorById.message}).` };
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
        return { status: 500, error: `Admin yetkisi doğrulanamadı (Email: ${adminErrorByEmail.message}).` };
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
