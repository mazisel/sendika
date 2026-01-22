import { NextRequest, NextResponse } from 'next/server';
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

        // Get admin user ID (may need to check by email too)
        let adminUserId = authenticatedUser.id;

        const { data: adminById } = await supabaseAdmin
            .from('admin_users')
            .select('id')
            .eq('id', authenticatedUser.id)
            .single();

        if (!adminById && authenticatedUser.email) {
            const { data: adminByEmail } = await supabaseAdmin
                .from('admin_users')
                .select('id')
                .eq('email', authenticatedUser.email)
                .single();

            if (adminByEmail) {
                adminUserId = adminByEmail.id;
            } else {
                return NextResponse.json(
                    { success: false, error: 'Admin kullanıcı bulunamadı.' },
                    { status: 404 }
                );
            }
        }

        // Parse body
        const body = await req.json();
        const { code } = body;

        if (!code || code.length !== 6) {
            return NextResponse.json(
                { success: false, error: 'Geçersiz OTP kodu.' },
                { status: 400 }
            );
        }

        // Find valid OTP
        const { data: otpRecord, error: otpError } = await supabaseAdmin
            .from('sms_otp_codes')
            .select('*')
            .eq('admin_user_id', adminUserId)
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpRecord) {
            return NextResponse.json(
                { success: false, error: 'Geçersiz veya süresi dolmuş OTP kodu.' },
                { status: 400 }
            );
        }

        // Mark OTP as used
        await supabaseAdmin
            .from('sms_otp_codes')
            .update({ used: true })
            .eq('id', otpRecord.id);

        return NextResponse.json({
            success: true,
            message: 'OTP doğrulandı.'
        });

    } catch (error) {
        console.error('OTP Verify error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu.' },
            { status: 500 }
        );
    }
}
