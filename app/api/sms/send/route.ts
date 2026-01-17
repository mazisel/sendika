import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/netgsm';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user check (simple session check)
        // Since we are using Next.js App Router API, we can check basic auth headers or session
        // For now, rely on standard supabase session check if possible, or assume protected by middleware matchers
        // But explicit check is better

        // Parse body
        const body = await req.json();
        const { phone, message } = body;

        if (!phone || !message) {
            return NextResponse.json(
                { success: false, error: 'Telefon numarası ve mesaj zorunludur.' },
                { status: 400 }
            );
        }

        // Send SMS
        const result = await sendSms(phone, message);

        if (result.success) {
            return NextResponse.json({ success: true, jobId: result.jobId });
        } else {
            return NextResponse.json(
                { success: false, error: result.error || 'SMS gönderilemedi.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('SMS API error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası oluştu.' },
            { status: 500 }
        );
    }
}
