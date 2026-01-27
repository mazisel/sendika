import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['draft', 'collecting', 'closed']);

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
        { message: 'Aidat dönemi bulunamadı.' },
        { status: 400 }
      );
    }

    const { data: period, error: periodError } = await supabaseAdmin
      .from('member_due_periods')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (periodError) {
      console.error('Aidat dönemi alınırken hata:', periodError);
      return NextResponse.json(
        { message: 'Aidat dönemi bilgisi alınamadı.' },
        { status: 500 }
      );
    }

    if (!period) {
      return NextResponse.json(
        { message: 'Aidat dönemi bulunamadı.' },
        { status: 404 }
      );
    }

    const { data: summary } = await supabaseAdmin
      .from('member_due_period_summary')
      .select('*')
      .eq('period_id', id)
      .maybeSingle();

    const { data: memberDues, error: memberDuesError } = await supabaseAdmin
      .from('member_dues')
      .select(
        `id,
         member_id,
         period_id,
         due_date,
         amount_due,
         discount_amount,
         penalty_amount,
         paid_amount,
         status,
         notes,
         created_at,
         updated_at,
         members (
           id,
           first_name,
           last_name,
           membership_number,
           tc_identity,
           city,
           district,
           phone,
           email
         ),
         member_due_payments (
           id,
           amount,
           payment_date,
           payment_method,
           reference_number,
           recorded_by,
           notes,
           created_at
         )`
      )
      .eq('period_id', id)
      .order('due_date', { ascending: true });

    if (memberDuesError) {
      console.error('Aidat kayıtları alınırken hata:', memberDuesError);
      return NextResponse.json(
        { message: 'Aidat kayıtları alınamadı.' },
        { status: 500 }
      );
    }

    const enhancedMemberDues = (memberDues ?? []).map(item => {
      const totalDue = Math.max(
        (item.amount_due ?? 0) - (item.discount_amount ?? 0) + (item.penalty_amount ?? 0),
        0
      );
      const outstanding = Math.max(totalDue - (item.paid_amount ?? 0), 0);

      const lastPayment = (item.member_due_payments ?? [])
        .sort(
          (a, b) =>
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0] ?? null;

      return {
        ...item,
        total_due_amount: totalDue,
        outstanding_amount: outstanding,
        last_payment_at: lastPayment?.payment_date ?? null
      };
    });

    return NextResponse.json({
      data: {
        period,
        summary: summary ?? null,
        member_dues: enhancedMemberDues
      }
    });
  } catch (error) {
    console.error('Aidat dönemi detayları alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat dönemi bilgisi alınamadı.' },
      { status: 500 }
    );
  }
}

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
        { message: 'Aidat dönemi bulunamadı.' },
        { status: 400 }
      );
    }

    const payload = await request.json().catch(() => ({}));
    const { status } = payload ?? {};

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { message: 'Geçersiz durum bilgisi.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = { status };

    if (status === 'collecting') {
      updateData.published_at = new Date().toISOString();
      updateData.closed_at = null;
    } else if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { data: updatedPeriod, error } = await supabaseAdmin
      .from('member_due_periods')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Aidat dönemi durumu güncellenirken hata:', error);
      return NextResponse.json(
        { message: 'Aidat dönemi güncellenemedi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedPeriod });
  } catch (error) {
    console.error('Aidat dönemi güncellenirken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat dönemi güncellenemedi.' },
      { status: 500 }
    );
  }
}
