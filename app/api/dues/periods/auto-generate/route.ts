import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

interface MonthlyGenerationPayload {
  startMonth: string;
  endMonth: string;
  dueDay?: number;
  dueAmount: number;
  penaltyRate?: number;
  description?: string;
  autoGenerateMemberDues?: boolean;
  includeInactiveMembers?: boolean;
}

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const addMonths = (date: Date, count: number) =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Yetkisiz erişim.' },
      { status: authResult.status ?? 401 }
    );
  }

  try {
    const body = (await request.json()) as MonthlyGenerationPayload;
    const {
      startMonth,
      endMonth,
      dueDay = 1,
      dueAmount,
      penaltyRate = 0,
      description,
      autoGenerateMemberDues = false,
      includeInactiveMembers = false
    } = body ?? {};

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { message: 'Başlangıç ve bitiş ayları zorunludur.' },
        { status: 400 }
      );
    }

    if (!dueAmount || Number.isNaN(Number(dueAmount)) || Number(dueAmount) <= 0) {
      return NextResponse.json(
        { message: 'Aidat tutarı 0\'dan büyük olmalıdır.' },
        { status: 400 }
      );
    }

    if (Number.isNaN(Number(penaltyRate)) || Number(penaltyRate) < 0) {
      return NextResponse.json(
        { message: 'Gecikme oranı negatif olamaz.' },
        { status: 400 }
      );
    }

    if (Number.isNaN(Number(dueDay)) || Number(dueDay) < 1 || Number(dueDay) > 31) {
      return NextResponse.json(
        { message: 'Son ödeme günü 1 ile 31 arasında olmalıdır.' },
        { status: 400 }
      );
    }

    const parsedStart = new Date(`${startMonth}-01T00:00:00.000Z`);
    const parsedEnd = new Date(`${endMonth}-01T00:00:00.000Z`);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return NextResponse.json(
        { message: 'Geçerli başlangıç ve bitiş ayları giriniz.' },
        { status: 400 }
      );
    }

    let currentMonth = startOfMonth(parsedStart);
    const finalMonth = startOfMonth(parsedEnd);

    if (currentMonth > finalMonth) {
      return NextResponse.json(
        { message: 'Başlangıç ayı, bitiş ayından sonra olamaz.' },
        { status: 400 }
      );
    }

    const months: Date[] = [];
    while (currentMonth <= finalMonth) {
      months.push(new Date(currentMonth));
      currentMonth = addMonths(currentMonth, 1);
    }

    const rangeStart = startOfMonth(parsedStart);
    const rangeEndExclusive = addMonths(finalMonth, 1);

    const { data: existingPeriods, error: existingError } = await supabaseAdmin
      .from('member_due_periods')
      .select('id, period_start')
      .gte('period_start', toISODate(rangeStart))
      .lt('period_start', toISODate(rangeEndExclusive));

    if (existingError) {
      console.error('Mevcut dönemler alınırken hata:', existingError);
      return NextResponse.json(
        { message: 'Mevcut dönemler kontrol edilemedi.' },
        { status: 500 }
      );
    }

    const existingMap = new Map<string, boolean>();
    (existingPeriods ?? []).forEach(period => {
      const key = monthKey(new Date(period.period_start));
      existingMap.set(key, true);
    });

    const dueAmountValue = Number(dueAmount);
    const penaltyRateValue = Number(penaltyRate);
    const dueDayValue = Number(dueDay);

    const rowsToInsert = months
      .filter(month => !existingMap.has(monthKey(month)))
      .map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const maxDay = monthEnd.getDate();
        const finalDueDay = Math.min(Math.max(dueDayValue, 1), maxDay);
        const dueDate = new Date(month.getFullYear(), month.getMonth(), finalDueDay);

        const monthName = monthStart.toLocaleDateString('tr-TR', { month: 'long' });
        const formattedName = `${capitalize(monthName)} ${monthStart.getFullYear()} Aidatı`;

        return {
          name: formattedName,
          period_start: toISODate(monthStart),
          period_end: toISODate(monthEnd),
          due_date: toISODate(dueDate),
          due_amount: dueAmountValue,
          penalty_rate: penaltyRateValue,
          description: description?.trim() || null,
          status: 'draft'
        };
      });

    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        data: {
          inserted_count: 0,
          inserted_periods: [],
          message: 'Belirtilen aylar için yeni dönem oluşturulmadı. Dönemler zaten mevcut olabilir.'
        }
      });
    }

    const { data: insertedPeriods, error: insertError } = await supabaseAdmin
      .from('member_due_periods')
      .insert(rowsToInsert)
      .select('*');

    if (insertError) {
      console.error('Aylık dönemler oluşturulurken hata:', insertError);
      return NextResponse.json(
        { message: 'Aidat dönemleri oluşturulamadı.' },
        { status: 500 }
      );
    }

    if (autoGenerateMemberDues) {
      for (const period of insertedPeriods ?? []) {
        const { error: generationError } = await supabaseAdmin.rpc(
          'generate_member_dues_for_period',
          {
            p_period_id: period.id,
            p_include_inactive: includeInactiveMembers
          }
        );

        if (generationError) {
          console.error(
            `Aidat kayıtları oluşturulurken hata (period ${period.id}):`,
            generationError
          );
        }
      }
    }

    const insertedIds = (insertedPeriods ?? []).map(period => period.id);
    let summaries: any[] = [];

    if (insertedIds.length > 0) {
      const { data: summaryData, error: summaryError } = await supabaseAdmin
        .from('member_due_period_summary')
        .select('*')
        .in('period_id', insertedIds);

      if (summaryError) {
        console.error('Aidat dönemi özetleri alınırken hata:', summaryError);
      } else {
        summaries = summaryData ?? [];
      }
    }

    const summaryMap = new Map<string, any>();
    summaries.forEach(item => summaryMap.set(item.period_id, item));

    const responsePeriods = (insertedPeriods ?? []).map(period => ({
      ...period,
      summary: summaryMap.get(period.id) ?? null
    }));

    return NextResponse.json({
      data: {
        inserted_count: responsePeriods.length,
        inserted_periods: responsePeriods
      }
    });
  } catch (error) {
    console.error('Aylık aidat dönemleri oluşturulurken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat dönemleri oluşturulamadı.' },
      { status: 500 }
    );
  }
}
