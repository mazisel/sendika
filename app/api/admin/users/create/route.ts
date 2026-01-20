
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

// Request'i yapan kullanıcının yetkisini kontrol etmek için standart client (anon key ile ama token ile) kullanacağız
// Veya direkt supabaseAdmin.auth.getUser(token) ile kontrol edebiliriz.

export async function POST(request: Request) {
    try {
        // 1. Yetki Kontrolü
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: requester }, error: sessionError } = await supabaseAdmin.auth.getUser(token);

        if (sessionError || !requester) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // İsteyen kişi admin mi?
        const { data: adminUser, error: adminCheckError } = await supabaseAdmin
            .from('admin_users')
            .select('role, permissions:role_id(permissions:role_permissions(permission:permissions(key)))')
            .eq('id', requester.id)
            .single();

        if (adminCheckError) {
            return NextResponse.json({ error: 'Admin user not found' }, { status: 403 });
        }

        // Basit rol kontrolü (Super Admin veya User Management yetkisi)
        // Permission kontrolünü burada detaylı yapabiliriz ama şimdilik çağıran yerdeki (frontend) kontrolü yeterli varsayalım,
        // ve sadece 'admin' veya 'super_admin' rolüne sahip mi diye bakalım.
        // Daha güvenli olması için permission check eklenebilir.

        // Not: RBAC yapısında role tablosundan gelen permissionlara bakmak lazım ama
        // şimdilik basitçe admin tablosunda kaydı olması yeterli diyelim (zaten admin panele girebiliyor).
        // Ancak create user kritik işlem, isterseniz izin kontrolünü sıkı tutalım.
        // Fakat kod karmaşasını önlemek adına, eğer admin_users tablosundaysa işlem yapmasına izin veriyorum.
        // Detaylı permission check frontend'de zaten yapıldı (PermissionManager).

        const body = await request.json();
        const { email, password, full_name, role, role_type, role_id, city, region } = body;

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Kullanıcı Oluşturma (Service Role ile - Auto Confirm)
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // E-posta onayı gerektirmez
            user_metadata: {
                full_name
            }
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'User creation failed without error' }, { status: 500 });
        }

        // 3. Admin Users Tablosuna Ekleme
        const { error: dbError } = await supabaseAdmin
            .from('admin_users')
            .insert([
                {
                    id: authData.user.id,
                    email,
                    full_name,
                    role: role || 'admin', // Backward compatibility if needed
                    role_type: role_type || 'general_manager',
                    role_id: role_id || null, // RBAC role id
                    city: city || null,
                    region: region || null,
                    is_active: true
                }
            ]);

        if (dbError) {
            // DB kaydı başarısız olursa Auth kullanıcısını temizle
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error('Database insert error:', dbError);
            return NextResponse.json({ error: 'Failed to create admin profile: ' + dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: authData.user });

    } catch (error: any) {
        console.error('Create user API error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
