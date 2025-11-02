import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

const DEFAULT_LOOKBACK_DAYS = 90;

const sumByType = (items: any[], type: string) =>
  items
    .filter(item => item.transaction_type === type)
    .reduce((total, item) => total + (Number(item.amount) || 0), 0);

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
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const includeInactiveAccounts = url.searchParams.get('includeInactiveAccounts') === 'true';

    const now = new Date();
    const endDate = endDateParam ? new Date(endDateParam) : now;

    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const formattedStart = startDate.toISOString().split('T')[0];
    const formattedEnd = endDate.toISOString().split('T')[0];

    let accountQuery = supabaseAdmin
      .from('finance_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!includeInactiveAccounts) {
      accountQuery = accountQuery.eq('is_active', true);
    }

    const { data: accounts, error: accountsError } = await accountQuery;

    if (accountsError) {
      console.error('Finans hesapları alınırken hata:', accountsError);
      return NextResponse.json(
        { message: 'Finans özet bilgisi alınamadı.' },
        { status: 500 }
      );
    }

    const accountIds = accounts?.map(account => account.id) ?? [];
    const { data: accountSummaries, error: summaryError } = accountIds.length
      ? await supabaseAdmin
          .from('finance_account_summary')
          .select('*')
          .in('account_id', accountIds)
      : { data: [], error: null };

    if (summaryError) {
      console.error('Finans hesap özetleri alınırken hata:', summaryError);
    }

    const summaryMap = new Map<string, any>();
    accountSummaries?.forEach(item => summaryMap.set(item.account_id, item));

    const accountsWithSummary = (accounts ?? []).map(account => ({
      ...account,
      summary: summaryMap.get(account.id) ?? null
    }));

    const totalBalance = accountsWithSummary.reduce((total, account) => {
      const effectiveBalance = summaryMap.get(account.id)?.current_balance ?? account.current_balance ?? 0;
      return total + (Number(effectiveBalance) || 0);
    }, 0);

    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('finance_transactions')
      .select(
        `
          id,
          account_id,
          category_id,
          transaction_type,
          amount,
          transfer_account_id,
          transaction_date,
          description,
          reference_code,
          finance_accounts!finance_transactions_account_id_fkey(id, name, account_type, currency),
          finance_categories(id, name, category_type)
        `
      )
      .gte('transaction_date', formattedStart)
      .lte('transaction_date', formattedEnd)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300);

    if (transactionsError) {
      console.error('Finans işlemleri alınırken hata:', transactionsError);
      return NextResponse.json(
        { message: 'Finans özet bilgisi alınamadı.' },
        { status: 500 }
      );
    }

    const incomeTotal = sumByType(transactions ?? [], 'income');
    const expenseTotal = sumByType(transactions ?? [], 'expense');
    const transferOutTotal = sumByType(
      (transactions ?? []).filter(item => item.account_id),
      'transfer'
    );
    const transferInTotal = (transactions ?? []).reduce((total, item) => {
      if (item.transaction_type === 'transfer' && item.transfer_account_id) {
        return total + (Number(item.amount) || 0);
      }
      return total;
    }, 0);

    const categoryBreakdown = (transactions ?? []).reduce<Record<string, any>>((acc, item) => {
      const categoryData = Array.isArray(item.finance_categories)
        ? item.finance_categories[0]
        : item.finance_categories;

      if (!categoryData) {
        return acc;
      }

      const key = `${categoryData.category_type}_${categoryData.id}`;
      if (!acc[key]) {
        acc[key] = {
          category_id: categoryData.id,
          category_name: categoryData.name,
          category_type: categoryData.category_type,
          total_amount: 0
        };
      }

      acc[key].total_amount += Number(item.amount) || 0;
      return acc;
    }, {});

    const response = {
      overview: {
        total_balance: totalBalance,
        total_income: incomeTotal,
        total_expense: expenseTotal,
        total_incoming_transfer: transferInTotal,
        total_outgoing_transfer: transferOutTotal
      },
      accounts: accountsWithSummary,
      recent_transactions: (transactions ?? []).slice(0, 10),
      category_breakdown: Object.values(categoryBreakdown),
      period: {
        start: formattedStart,
        end: formattedEnd
      }
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error('Finans özet bilgisi alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Finans özet bilgisi alınamadı.' },
      { status: 500 }
    );
  }
}
