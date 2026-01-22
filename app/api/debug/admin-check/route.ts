import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        // Masked keys
        const maskedKey = serviceRoleKey
            ? `${serviceRoleKey.substring(0, 10)}...${serviceRoleKey.substring(serviceRoleKey.length - 5)} (Length: ${serviceRoleKey.length})`
            : 'MISSING';

        const debugInfo = {
            url: supabaseUrl,
            keyStatus: maskedKey,
            envCheck: {
                NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            }
        };

        // Test query
        const start = Date.now();
        const { data, error, count } = await supabaseAdmin
            .from('admin_users')
            .select('count', { count: 'exact', head: true });

        const duration = Date.now() - start;

        if (error) {
            return NextResponse.json({
                status: 'ERROR',
                message: 'Database connection failed',
                error: error,
                debug: debugInfo,
                duration: `${duration}ms`
            }, { status: 500 });
        }

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Database connection successful',
            data: { count },
            debug: debugInfo,
            duration: `${duration}ms`
        });

    } catch (err: any) {
        return NextResponse.json({
            status: 'CRASH',
            message: 'Unexpected error during check',
            error: err.message,
            stack: err.stack
        }, { status: 500 });
    }
}
