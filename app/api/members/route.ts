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
        const { data: members, error } = await supabaseAdmin
            .from('members')
            .select('id, first_name, last_name, tc_identity, membership_number, membership_status, city, workplace, position')
            .order('first_name');

        if (error) {
            console.error('Üyeler alınırken hata:', error);
            return NextResponse.json(
                { message: 'Üyeler yüklenemedi.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: members });
    } catch (error) {
        console.error('Beklenmeyen hata:', error);
        return NextResponse.json(
            { message: 'Bir hata oluştu.' },
            { status: 500 }
        );
    }
}
