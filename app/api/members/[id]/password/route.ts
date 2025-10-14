import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

    if (!user) {
      return NextResponse.json({ message: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

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
