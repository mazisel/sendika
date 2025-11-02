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
    const typeFilter = url.searchParams.get('type');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    let query = supabaseAdmin
      .from('finance_categories')
      .select('*')
      .order('name', { ascending: true });

    if (typeFilter) {
      const types = typeFilter.split(',').map(item => item.trim()).filter(Boolean);
      if (types.length === 1) {
        query = query.eq('category_type', types[0]);
      } else if (types.length > 1) {
        query = query.in('category_type', types);
      }
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Finans kategorileri alınırken hata:', error);
      return NextResponse.json(
        { message: 'Finans kategorileri alınamadı.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('Finans kategorileri alınırken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Finans kategorileri alınamadı.' },
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
      category_type,
      parent_id,
      description,
      is_active = true
    } = body ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { message: 'Kategori adı zorunludur.' },
        { status: 400 }
      );
    }

    if (!category_type || !['income', 'expense', 'transfer'].includes(category_type)) {
      return NextResponse.json(
        { message: 'Geçerli bir kategori türü seçilmelidir.' },
        { status: 400 }
      );
    }

    const insertPayload = {
      name: name.trim(),
      category_type,
      parent_id: parent_id || null,
      description: description?.trim() || null,
      is_active: Boolean(is_active)
    };

    const { data, error } = await supabaseAdmin
      .from('finance_categories')
      .insert([insertPayload])
      .select()
      .single();

    if (error || !data) {
      console.error('Finans kategorisi oluşturulurken hata:', error);
      return NextResponse.json(
        { message: 'Kategori oluşturulamadı.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Finans kategorisi oluşturulurken beklenmeyen hata:', error);
    return NextResponse.json(
      { message: 'Kategori oluşturulamadı.' },
      { status: 500 }
    );
  }
}
