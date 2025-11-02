import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Yetkisiz erişim.' },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const withSummary = url.searchParams.get('withSummary') !== 'false';

    let query = supabaseAdmin
      .from('finance_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Finans hesapları yüklenirken hata:', error);
      return NextResponse.json(
        { message: 'Finans hesapları alınamadı.' },
        { status: 500 }
      );
    }

    if (!withSummary || !accounts?.length) {
      return NextResponse.json({ data: accounts ?? [] });
    }

    const accountIds = accounts.map(account => account.id);

    const { data: summaries, error: summaryError } = await supabaseAdmin
      .from('finance_account_summary')
      .select('*')
      .in('account_id', accountIds);

    if (summaryError) {
      console.error('Finans hesap özetleri alınırken hata:', summaryError);
    }

    const summaryMap = new Map<string, any>();
    summaries?.forEach(item => summaryMap.set(item.account_id, item));

    const result = accounts.map(account => ({
      ...account,
      summary: summaryMap.get(account.id) ?? null
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Finans hesapları alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Finans hesapları alınamadı.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Yetkisiz erişim.' },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      account_type,
      currency = 'TRY',
      opening_balance = 0,
      description,
      is_active = true
    } = body ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { message: 'Hesap adı zorunludur.' },
        { status: 400 }
      );
    }

    if (!account_type || !['cash', 'bank', 'other'].includes(account_type)) {
      return NextResponse.json(
        { message: 'Geçerli bir hesap türü seçilmelidir.' },
        { status: 400 }
      );
    }

    const numericOpening = Number(opening_balance) || 0;

    const insertPayload = {
      name: name.trim(),
      account_type,
      currency: typeof currency === 'string' && currency.trim().length === 3
        ? currency.trim().toUpperCase()
        : 'TRY',
      opening_balance: numericOpening,
      current_balance: numericOpening,
      description: description?.trim() || null,
      is_active: Boolean(is_active)
    };

    const { data: account, error } = await supabaseAdmin
      .from('finance_accounts')
      .insert([insertPayload])
      .select()
      .single();

    if (error || !account) {
      console.error('Finans hesabı oluşturulurken hata:', error);
      return NextResponse.json(
        { message: 'Hesap oluşturulamadı.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error('Finans hesabı oluşturulurken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Hesap oluşturulamadı.' },
      { status: 500 }
    );
  }
}
