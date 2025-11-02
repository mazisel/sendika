import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export async function POST(
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
        { message: 'Aidat dönemi bilgisi bulunamadı.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const includeInactiveMembers = Boolean(body?.includeInactiveMembers);

    const { data: generatedCount, error } = await supabaseAdmin.rpc(
      'generate_member_dues_for_period',
      {
        p_period_id: id,
        p_include_inactive: includeInactiveMembers
      }
    );

    if (error) {
      console.error('Aidat kayıtları oluşturulurken hata:', error);
      return NextResponse.json(
        { message: 'Aidat kayıtları oluşturulamadı.' },
        { status: 500 }
      );
    }

    const { data: summary } = await supabaseAdmin
      .from('member_due_period_summary')
      .select('*')
      .eq('period_id', id)
      .maybeSingle();

    return NextResponse.json({
      data: {
        generated_member_count: generatedCount ?? 0,
        summary: summary ?? null
      }
    });
  } catch (error) {
    console.error('Aidat kayıtları oluşturulurken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Aidat kayıtları oluşturulamadı.' },
      { status: 500 }
    );
  }
}
