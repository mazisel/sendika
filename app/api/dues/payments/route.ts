import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

const PAYMENT_METHODS = new Set([
  'cash',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'online',
  'other'
]);

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Yetkisiz erişim.' },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const payload = await request.json();

    const {
      member_due_id,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
      finance_account_id,
      finance_category_id,
      record_finance_transaction = true
    } = payload ?? {};

    if (!member_due_id || typeof member_due_id !== 'string') {
      return NextResponse.json(
        { message: 'Aidat kaydı bilgisi zorunludur.' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { message: 'Ödeme tutarı 0\'dan büyük olmalıdır.' },
        { status: 400 }
      );
    }

    if (!payment_date || Number.isNaN(Date.parse(payment_date))) {
      return NextResponse.json(
        { message: 'Geçerli bir ödeme tarihi giriniz.' },
        { status: 400 }
      );
    }

    if (!payment_method || !PAYMENT_METHODS.has(payment_method)) {
      return NextResponse.json(
        { message: 'Geçerli bir ödeme yöntemi seçiniz.' },
        { status: 400 }
      );
    }

    const wantsFinanceInsert =
      Boolean(record_finance_transaction) && Boolean(finance_account_id) && Boolean(finance_category_id);

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('member_due_payments')
      .insert([
        {
          member_due_id,
          amount: numericAmount,
          payment_date,
          payment_method,
          reference_number: reference_number?.trim?.() || null,
          notes: notes?.trim?.() || null,
          recorded_by: authResult.admin.id
        }
      ])
      .select()
      .single();

    if (insertError || !payment) {
      console.error('Aidat ödemesi kaydedilirken hata:', insertError);
      return NextResponse.json(
        { message: 'Ödeme kaydedilemedi.' },
        { status: 500 }
      );
    }

    const { data: memberDue, error: dueError } = await supabaseAdmin
      .from('member_dues')
      .select('*, member_due_payments(*)')
      .eq('id', member_due_id)
      .maybeSingle();

    if (dueError) {
      console.error('Aidat kaydı güncel durum alınamadı:', dueError);
    }

    const memberIdForFinance = memberDue?.member_id ?? null;

    let financeTransaction = null;

    if (wantsFinanceInsert) {
      const financeInsertPayload = {
        account_id: finance_account_id,
        category_id: finance_category_id,
        transaction_type: 'income',
        amount: numericAmount,
        transaction_date: payment_date,
        reference_code: reference_number?.trim?.() || payment.id,
        description: notes?.trim?.() || 'Aidat ödemesi',
        member_id: memberIdForFinance,
        member_due_id,
        transfer_account_id: null,
        created_by: authResult.admin.id,
        notes: notes?.trim?.() || null
      };

      const { data: financeData, error: financeError } = await supabaseAdmin
        .from('finance_transactions')
        .insert([financeInsertPayload])
        .select()
        .single();

      if (financeError) {
        console.error('Finans işlemi kaydedilirken hata:', financeError);
        await supabaseAdmin.from('member_due_payments').delete().eq('id', payment.id);
        return NextResponse.json(
          { message: 'Finans işlemi kaydedilemedi. Ödeme geri alındı.' },
          { status: 500 }
        );
      }

      financeTransaction = financeData ?? null;
    }

    return NextResponse.json({
      data: {
        payment,
        member_due: memberDue ?? null,
        finance_transaction: financeTransaction
      }
    });
  } catch (error) {
    console.error('Aidat ödemesi kaydedilirken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Ödeme kaydedilemedi.' },
      { status: 500 }
    );
  }
}
