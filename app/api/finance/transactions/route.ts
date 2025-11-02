import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

const TRANSACTION_TYPES = new Set(['income', 'expense', 'transfer']);

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
    const accountId = url.searchParams.get('accountId');
    const categoryId = url.searchParams.get('categoryId');
    const typeFilter = url.searchParams.get('type');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const memberId = url.searchParams.get('memberId');
    const limit = Number(url.searchParams.get('limit')) || 200;
    const includeRelated = url.searchParams.get('includeRelated') !== 'false';

    let query = supabaseAdmin
      .from('finance_transactions')
      .select(
        includeRelated
          ? `
            *,
            finance_accounts!finance_transactions_account_id_fkey(id, name, account_type, currency),
            finance_categories(id, name, category_type),
            members(id, first_name, last_name, membership_number)
          `
          : '*'
      )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (typeFilter) {
      const types = typeFilter.split(',').map(item => item.trim()).filter(Boolean);
      if (types.length === 1) {
        query = query.eq('transaction_type', types[0]);
      } else if (types.length > 1) {
        query = query.in('transaction_type', types);
      }
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Finans işlemleri alınırken hata:', error);
      return NextResponse.json(
        { message: 'Finans işlemleri alınamadı.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Finans işlemleri alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Finans işlemleri alınamadı.' },
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
      account_id,
      category_id,
      transaction_type,
      amount,
      transaction_date,
      reference_code,
      description,
      member_id,
      member_due_id,
      transfer_account_id,
      notes
    } = body ?? {};

    if (!account_id || typeof account_id !== 'string') {
      return NextResponse.json(
        { message: 'Hesap bilgisi zorunludur.' },
        { status: 400 }
      );
    }

    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json(
        { message: 'Kategori bilgisi zorunludur.' },
        { status: 400 }
      );
    }

    if (!transaction_type || !TRANSACTION_TYPES.has(transaction_type)) {
      return NextResponse.json(
        { message: 'Geçerli bir işlem türü seçilmelidir.' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: 'İşlem tutarı 0\'dan büyük olmalıdır.' },
        { status: 400 }
      );
    }

    if (!transaction_date || Number.isNaN(Date.parse(transaction_date))) {
      return NextResponse.json(
        { message: 'Geçerli bir işlem tarihi giriniz.' },
        { status: 400 }
      );
    }

    if (transaction_type === 'transfer') {
      if (!transfer_account_id || typeof transfer_account_id !== 'string') {
        return NextResponse.json(
          { message: 'Transfer işlemleri için hedef hesap zorunludur.' },
          { status: 400 }
        );
      }

      if (transfer_account_id === account_id) {
        return NextResponse.json(
          { message: 'Transfer işlemlerinde kaynak ve hedef hesap farklı olmalıdır.' },
          { status: 400 }
        );
      }
    }

    const insertPayload = {
      account_id,
      category_id,
      transaction_type,
      amount: numericAmount,
      transaction_date,
      reference_code: reference_code?.trim?.() || null,
      description: description?.trim?.() || null,
      member_id: member_id || null,
      member_due_id: member_due_id || null,
      transfer_account_id: transfer_account_id || null,
      created_by: authResult.admin.id,
      notes: notes?.trim?.() || null
    };

    const { data: transaction, error } = await supabaseAdmin
      .from('finance_transactions')
      .insert([insertPayload])
      .select(
        `
          *,
          finance_accounts!finance_transactions_account_id_fkey(id, name, account_type, currency),
          finance_categories(id, name, category_type)
        `
      )
      .single();

    if (error || !transaction) {
      console.error('Finans işlemi kaydedilirken hata:', error);
      return NextResponse.json(
        { message: 'İşlem kaydedilemedi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    console.error('Finans işlemi kaydedilirken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'İşlem kaydedilemedi.' },
      { status: 500 }
    );
  }
}
