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
            // Create new user, handle potential duplication race conditions or pagination misses
            try {
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    phone: phone,
                    password: password,
                    email: `${phone}@placeholder.sendika.app`, // Dummy email if required
                    email_confirm: true,
                    phone_confirm: true,
                    user_metadata: { member_id: memberId, full_name: memberName }
                });

                if (createError) throw createError;
                authUserId = newUser.user.id;
            } catch (createError: any) {
                // If creation failed because user exists, try to find them by paging through users
                if (createError?.message?.includes('already been registered') || createError?.code === 'unique_violation' || createError?.status === 422) {
                    console.log('User exists, searching via pagination...');
                    let foundUser = null;
                    let page = 1;
                    const PER_PAGE = 50;
                    let hasMore = true;

                    while (hasMore && !foundUser && page <= 10) { // Limit to 10 pages for safety
                        const { data: { users: pageUsers }, error: listPageError } = await supabaseAdmin.auth.admin.listUsers({
                            page: page,
                            perPage: PER_PAGE
                        });

                        if (listPageError || !pageUsers || pageUsers.length === 0) {
                            hasMore = false;
                            break;
                        }

                        // Check for match by phone OR the generated placeholder email
                        foundUser = pageUsers.find(u => u.phone === phone || u.email === `${phone}@placeholder.sendika.app`);

                        if (foundUser) break;

                        if (pageUsers.length < PER_PAGE) hasMore = false;
                        page++;
                    }

                    if (foundUser) {
                        authUserId = foundUser.id;
                        // Update the found user's password
                        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                            foundUser.id,
                            { password: password, user_metadata: { member_id: memberId, full_name: memberName } }
                        );
                        if (updateError) throw updateError;
                    } else {
                        throw new Error('Kullanıcı kayıtlı görünüyor ancak sistemde bulunamadı (Pagination limit exceeded).');
                    }
                } else {
                    throw createError;
                }
            }
        }

        // Sync password to members table for custom auth flow (verify_member_credentials)
        const { error: rpcError } = await supabaseAdmin.rpc('set_member_password', {
            p_member_id: memberId,
            p_new_password: password
        });

        if (rpcError) {
            console.error('Member password sync error:', rpcError);
            // We don't block the process but logging is important
        }

        // Send SMS
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
