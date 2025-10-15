import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    const { password } = await request.json();

    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    let authenticatedUser = user;

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
          }
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { data: adminUserById, error: adminErrorById } = await supabaseAdmin
      .from('admin_users')
      .select('id, is_active')
      .eq('id', authenticatedUser.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminErrorById) {
      console.error('Admin kullanıcı doğrulaması başarısız (id sorgusu):', adminErrorById);
      return NextResponse.json({ message: 'Admin yetkisi doğrulanamadı.' }, { status: 500 });
    }

    let adminUser = adminUserById;

    if (!adminUser && authenticatedUser.email) {
      const { data: adminUserByEmail, error: adminErrorByEmail } = await supabaseAdmin
        .from('admin_users')
        .select('id, is_active')
        .eq('email', authenticatedUser.email)
        .eq('is_active', true)
        .maybeSingle();

      if (adminErrorByEmail) {
        console.error('Admin kullanıcı doğrulaması başarısız (email sorgusu):', adminErrorByEmail);
        return NextResponse.json({ message: 'Admin yetkisi doğrulanamadı.' }, { status: 500 });
      }

      adminUser = adminUserByEmail ?? null;
    }

    if (!adminUser) {
      return NextResponse.json({ message: 'Admin yetkisi bulunamadı.' }, { status: 403 });
    }

    if (!memberId) {
      return NextResponse.json(
        { message: 'Üye bilgisi bulunamadı.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.trim().length < 6) {
      return NextResponse.json(
        { message: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc('set_member_password', {
      p_member_id: memberId,
      p_new_password: password.trim()
    });

    if (error) {
      console.error('Üye şifresi belirlenirken hata:', error);
      return NextResponse.json(
        { message: 'Şifre belirlenemedi. Lütfen tekrar deneyiniz.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Şifre belirleme isteği başarısız oldu:', error);
    return NextResponse.json(
      { message: 'Beklenmeyen bir hata oluştu.' },
      { status: 500 }
    );
  }
}
