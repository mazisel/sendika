import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendSms } from '@/lib/netgsm';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { memberId, phone, password, memberName } = body;

        if (!memberId || !phone || !password) {
            return NextResponse.json(
                { success: false, error: 'Eksik bilgi: ID, Telefon ve Şifre zorunludur.' },
                { status: 400 }
            );
        }

        // Clean phone number for Auth (E.164 format or consistent format)
        // Adjust based on your Auth settings. Assuming standard format.
        // If phone starts with 0, remove 0 and add +90 (for TR) if that's how you store it.
        // For now, let's use the phone as provided but ensure it's unique.

        // Note: Supabase Auth requires unique phones.
        // We first check if a user exists with this phone.

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) throw listError;

        // Find user by phone (manual filter as listUsers doesn't support phone filter directly in all versions efficiently)
        // Optimization: In large user bases, use listUsers with specific query if available or try createUser and catch error.

        // Strategy: Try to update user by phone. If not found, create.
        // Actually, getUserById is easy, but we only have phone.
        // Let's iterate or try create.

        let targetUser = users.find(u => u.phone === phone);
        let authUserId = targetUser?.id;

        if (targetUser) {
            // Update existing user
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                targetUser.id,
                { password: password, user_metadata: { member_id: memberId, full_name: memberName } }
            );

            if (updateError) {
                return NextResponse.json({ success: false, error: 'Kullanıcı güncellenemedi: ' + updateError.message }, { status: 500 });
            }
        } else {
            // Create new user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                phone: phone,
                password: password,
                email: `${phone}@placeholder.sendika.app`, // Dummy email if required
                email_confirm: true,
                phone_confirm: true,
                user_metadata: { member_id: memberId, full_name: memberName }
            });

            if (createError) {
                return NextResponse.json({ success: false, error: 'Kullanıcı oluşturulamadı: ' + createError.message }, { status: 500 });
            }
            authUserId = newUser.user.id;
        }

        // Send SMS
        // We send the RAW password here because we just set it.
        const message = `Sayın ${memberName}, mobil uygulama giriş şifreniz: ${password}`;
        const smsResult = await sendSms(phone, message);

        if (!smsResult.success) {
            return NextResponse.json({
                success: false,
                warning: 'Şifre oluşturuldu ancak SMS gönderilemedi.',
                error: smsResult.error
            });
        }

        return NextResponse.json({ success: true, userId: authUserId });

    } catch (error: any) {
        console.error('Mobile Auth API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası: ' + error.message },
            { status: 500 }
        );
    }
}
