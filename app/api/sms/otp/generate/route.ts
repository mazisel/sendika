import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/netgsm';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user using createRouteHandlerClient
        const supabase = createRouteHandlerClient<Database>({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        let authenticatedUser = user;

        // Fallback to Authorization header if no session
        if (!authenticatedUser) {
            const authHeader = req.headers.get('authorization');
            const token = authHeader?.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : authHeader?.trim();

            if (token) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                if (supabaseUrl && supabaseAnonKey) {
                    const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, {
                        auth: { persistSession: false, autoRefreshToken: false }
                    });

                    const { data: tokenData, error: tokenError } = await supabaseWithToken.auth.getUser(token);
                    if (!tokenError && tokenData.user) {
                        authenticatedUser = tokenData.user;
                    }
                }
            }
        }

        if (!authenticatedUser) {
            return NextResponse.json(
                { success: false, error: 'Oturum bulunamadı.' },
                { status: 401 }
            );
        }

        // Get admin user details with phone
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('id, phone, full_name')
            .eq('id', authenticatedUser.id)
            .single();

        if (adminError || !adminUser) {
            // Try by email as fallback
            if (authenticatedUser.email) {
                const { data: adminByEmail } = await supabaseAdmin
                    .from('admin_users')
                    .select('id, phone, full_name')
                    .eq('email', authenticatedUser.email)
                    .single();

                if (adminByEmail) {
                    return await generateAndSendOtp(adminByEmail);
                }
            }

            return NextResponse.json(
                { success: false, error: 'Admin kullanıcı bulunamadı.' },
                { status: 404 }
            );
        }

        return await generateAndSendOtp(adminUser);

    } catch (error) {
        console.error('OTP Generate error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu.' },
            { status: 500 }
        );
    }
}

async function generateAndSendOtp(adminUser: { id: string; phone: string | null; full_name: string }) {
    if (!adminUser.phone) {
        return NextResponse.json(
            { success: false, error: 'Telefon numaranız tanımlı değil. Lütfen profil ayarlarından telefon numaranızı ekleyin.' },
            { status: 400 }
        );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate any existing unused OTPs for this user
    await supabaseAdmin
        .from('sms_otp_codes')
        .update({ used: true })
        .eq('admin_user_id', adminUser.id)
        .eq('used', false);

    // Save OTP to database
    const { error: insertError } = await supabaseAdmin
        .from('sms_otp_codes')
        .insert({
            admin_user_id: adminUser.id,
            code: otpCode,
            expires_at: expiresAt
        });

    if (insertError) {
        console.error('OTP insert error:', insertError);
        return NextResponse.json(
            { success: false, error: 'OTP oluşturulamadı.' },
            { status: 500 }
        );
    }

    // Send OTP via SMS
    const message = `SMS gönderim onay kodunuz: ${otpCode}\nBu kod 5 dakika geçerlidir.`;
    const smsResult = await sendSms(adminUser.phone, message);

    if (!smsResult.success) {
        return NextResponse.json(
            { success: false, error: `OTP SMS gönderilemedi: ${smsResult.error}` },
            { status: 500 }
        );
    }

    // Return success with masked phone for UI display
    const maskedPhone = adminUser.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');

    return NextResponse.json({
        success: true,
        maskedPhone,
        expiresIn: 300 // seconds
    });
}
