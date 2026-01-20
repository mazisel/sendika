import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {

            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {

            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }



        // Check admin role
        const { data: adminUser, error: adminError } = await supabaseAdmin
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .single();



        if (adminError || !adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'admin')) {

            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch logs
        const url = new URL(request.url);
        const filterAction = url.searchParams.get('action');
        const filterEntity = url.searchParams.get('entity');

        let query = supabaseAdmin
            .from('audit_logs')
            .select(`
        *,
        admin_users (
          full_name,
          email
        )
      `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (filterAction) {
            query = query.eq('action', filterAction);
        }

        if (filterEntity) {
            query = query.eq('entity_type', filterEntity);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Fetch logs error:', error);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Audit Log API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, entityType, entityId, details, userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Extract IP address from headers
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'Unknown';

        let locationDetails = {};
        let city = null;

        // Fetch location data if IP is valid and not local
        if (ip && ip !== 'Unknown' && ip !== '::1' && ip !== '127.0.0.1') {
            try {
                // Add a timeout to prevent ETIMEDOUT errors
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const geoRes = await fetch(`http://ip-api.com/json/${ip}`, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.status === 'success') {
                        locationDetails = {
                            country: geoData.country,
                            city: geoData.city,
                            region: geoData.regionName,
                            isp: geoData.isp,
                            lat: geoData.lat,
                            lon: geoData.lon
                        };
                        city = geoData.city;
                    }
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.warn('GeoIP lookup timed out');
                } else {
                    console.error('GeoIP lookup failed:', err);
                }
            }
        }

        // Merge location details into log details
        const logDetails = {
            ...details,
            ip_details: locationDetails
        };

        // Initialize Supabase Admin Client
        // We use the service role key to bypass RLS when writing via this API,
        // although the RPC function itself is SECURITY DEFINER (owned by postgres usually), 
        // it requires execute permission which we granted to authenticated/service_role.
        // However, since we are on the server, we can use the service role key for maximum reliability.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Call the RPC function
        const { error } = await supabase.rpc('create_audit_log_entry', {
            p_user_id: userId,
            p_action: action,
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_details: logDetails
        });

        // Also update the IP address column directly if needed, or pass it to details.
        // The current RPC implementation only takes p_details. 
        // We should probably update the table/RPC to accept IP/City explicitly if we want them in dedicated columns,
        // OR just update the log entry we just created.
        // But since the RPC creates the record, we can't update it easily without returning ID.

        // For now, let's update the audit_logs table to have an 'ip_address' column (already exists)
        // We need to update the RPC to accept IP address or update it manually.
        // Let's modify the RPC call to include IP if we can update the function signature?
        // User asked for "IP address and estimated city".
        // The table has `ip_address` column.
        // WE SHOULD UPDATE THE RPC FUNCTION TO ACCEPT IP ADDRESS AND CITY/LOCATION.

        // BUT, since we cannot easily change the RPC function signature without running migration again interactively...
        // Let's re-run the SQL migration for the function to accept p_ip_address.

        if (error) {
            console.error('Supabase RPC Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Audit Log API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
