import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Yetkisiz erişim.' },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { message: 'Hesap bilgisi bulunamadı.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload: Record<string, any> = {};

    if (typeof body.name === 'string') {
      payload.name = body.name.trim();
    }

    if (typeof body.description === 'string') {
      payload.description = body.description.trim();
    }

    if (typeof body.is_active === 'boolean') {
      payload.is_active = body.is_active;
    }

    if (typeof body.account_type === 'string' && ['cash', 'bank', 'other'].includes(body.account_type)) {
      payload.account_type = body.account_type;
    }

    if (typeof body.currency === 'string' && body.currency.trim().length === 3) {
      payload.currency = body.currency.trim().toUpperCase();
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { message: 'Güncellenecek alan bulunamadı.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('finance_accounts')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Finans hesabı güncellenirken hata:', error);
      return NextResponse.json(
        { message: 'Hesap güncellenemedi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Finans hesabı güncellenirken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Hesap güncellenemedi.' },
      { status: 500 }
    );
  }
}
