import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

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
    const statusFilter = url.searchParams.get('status');

    let query = supabaseAdmin
      .from('member_due_periods')
      .select('*')
      .order('due_date', { ascending: false });

    if (statusFilter) {
      const statuses = statusFilter
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in('status', statuses);
      }
    }

    const { data: periods, error: periodsError } = await query;

    if (periodsError) {
      console.error('Aidat dönemleri alınırken hata:', periodsError);
      return NextResponse.json(
        { message: 'Aidat dönemleri alınamadı.' },
        { status: 500 }
      );
    }

    if (!periods || periods.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const periodIds = periods.map(period => period.id);

    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('member_due_period_summary')
      .select('*')
      .in('period_id', periodIds);

    if (summaryError) {
      console.error('Aidat dönemi özetleri alınırken hata:', summaryError);
    }

    const summaryMap = new Map<string, any>();
    summaryData?.forEach(item => {
      summaryMap.set(item.period_id, item);
    });

    const responseData = periods.map(period => ({
      ...period,
      summary: summaryMap.get(period.id) ?? null
    }));

    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error('Aidat dönemleri alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat dönemleri alınamadı.' },
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
    const payload = await request.json();

    const {
      name,
      period_start,
      period_end,
      due_date,
      due_amount,
      penalty_rate = 0,
      description,
      autoGenerate = false,
      includeInactiveMembers = false
    } = payload ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { message: 'Dönem adı zorunludur.' },
        { status: 400 }
      );
    }

    if (!period_start || !period_end || !due_date) {
      return NextResponse.json(
        { message: 'Başlangıç, bitiş ve son ödeme tarihleri zorunludur.' },
        { status: 400 }
      );
    }

    if (!due_amount || Number.isNaN(Number(due_amount)) || Number(due_amount) < 0) {
      return NextResponse.json(
        { message: 'Aidat tutarı geçerli bir sayı olmalıdır.' },
        { status: 400 }
      );
    }

    const numericPenalty = Number(penalty_rate) || 0;

    if (numericPenalty < 0) {
      return NextResponse.json(
        { message: 'Gecikme oranı negatif olamaz.' },
        { status: 400 }
      );
    }

    const insertPayload = {
      name: name.trim(),
      period_start,
      period_end,
      due_date,
      due_amount: Number(due_amount),
      penalty_rate: numericPenalty,
      description: description?.trim() ?? null
    };

    const { data: createdPeriod, error: insertError } = await supabaseAdmin
      .from('member_due_periods')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError || !createdPeriod) {
      console.error('Aidat dönemi oluşturulurken hata:', insertError);
      return NextResponse.json(
        { message: 'Aidat dönemi oluşturulamadı.' },
        { status: 500 }
      );
    }

    let generatedCount = 0;

    if (autoGenerate) {
      const { data: generated, error: generateError } = await supabaseAdmin.rpc(
        'generate_member_dues_for_period',
        {
          p_period_id: createdPeriod.id,
          p_include_inactive: includeInactiveMembers
        }
      );

      if (generateError) {
        console.error('Aidat kayıtları oluşturulurken hata:', generateError);
      } else {
        generatedCount = generated ?? 0;
      }
    }

    const { data: summary } = await supabaseAdmin
      .from('member_due_period_summary')
      .select('*')
      .eq('period_id', createdPeriod.id)
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...createdPeriod,
        summary: summary ?? null,
        generated_member_count: generatedCount
      }
    });
  } catch (error) {
    console.error('Aidat dönemi oluşturulurken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat dönemi oluşturulamadı.' },
      { status: 500 }
    );
  }
}
