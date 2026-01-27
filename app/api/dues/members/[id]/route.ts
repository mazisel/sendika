import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(
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
        { message: 'Üye bilgisi bulunamadı.' },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select(
        'id, first_name, last_name, membership_number, membership_status, is_active, city, district, phone, email'
      )
      .eq('id', id)
      .maybeSingle();

    if (memberError) {
      console.error('Üye bilgisi alınırken hata:', memberError);
      return NextResponse.json(
        { message: 'Üye bilgisi alınamadı.' },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json(
        { message: 'Üye bulunamadı.' },
        { status: 404 }
      );
    }

    const { data: dues, error: duesError } = await supabaseAdmin
      .from('member_dues')
      .select(
        'id, period_id, member_id, due_date, amount_due, discount_amount, penalty_amount, paid_amount, status, notes, created_at, updated_at, member_due_periods(name, due_amount, due_date, penalty_rate, status, period_start, period_end)'
      )
      .eq('member_id', id)
      .order('due_date', { ascending: false });

    if (duesError) {
      console.error('Üye aidat kayıtları alınırken hata:', duesError);
      return NextResponse.json(
        { message: 'Üye aidat kayıtları alınamadı.' },
        { status: 500 }
      );
    }

    const summary = (dues ?? []).reduce(
      (acc, due) => {
        const totalDue = Math.max(
          (due.amount_due ?? 0) - (due.discount_amount ?? 0) + (due.penalty_amount ?? 0),
          0
        );
        const outstanding = Math.max(totalDue - (due.paid_amount ?? 0), 0);

        acc.total_expected += totalDue;
        acc.total_paid += due.paid_amount ?? 0;
        acc.total_outstanding += outstanding;

        if (due.status === 'paid') {
          acc.paid_count += 1;
        } else if (due.status === 'partial') {
          acc.partial_count += 1;
        } else if (due.status === 'overdue') {
          acc.overdue_count += 1;
        } else if (due.status === 'pending') {
          acc.pending_count += 1;
        }

        return acc;
      },
      {
        total_expected: 0,
        total_paid: 0,
        total_outstanding: 0,
        paid_count: 0,
        partial_count: 0,
        overdue_count: 0,
        pending_count: 0
      }
    );

    return NextResponse.json({
      data: {
        member,
        dues: dues ?? [],
        summary
      }
    });
  } catch (error) {
    console.error('Üye aidat bilgileri alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Üye aidat bilgileri alınamadı.' },
      { status: 500 }
    );
  }
}
