import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Configuration
        const secret = process.env.SIGNER_AGENT_SECRET || 'DEFAULT_SECRET_CHANGE_ME';
        // User requested port 51695
        const port = parseInt(process.env.SIGNER_AGENT_PORT || '51695');

        // Generate Session Token (HMAC SHA256 of data)
        // The payload can be essentially anything the agent and backend agree on, 
        // or if the agent just validates the signature against the secret.
        // Based on standard HMAC implementations for such agents:
        // Token = Base64(HMAC_SHA256(Payload, Secret))
        // Payload often includes expiry or session ID.

        // Let's assume a simple payload for now: "session:{timestamp}:{userId}"
        const timestamp = Date.now();
        const payload = `session:${timestamp}:${session.user.id}`;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);
        const token = hmac.digest('hex'); // or 'base64' depending on agent requirement. 
        // The user guide says "HMAC session token". Let's assume hex string for safe transport or base64. 
        // Usually these agents expect a standard JWT or just a signed string.
        // Since the guide is generic, let's provide a robust token structure (JWT-like).

        // Revisiting the guide: "Backend HMAC token uretir (secret sadece backend'de tutulur)."
        // Let's generate a proper JWT signed with the secret.
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(JSON.stringify({
            sub: session.user.id,
            iat: Math.floor(timestamp / 1000),
            exp: Math.floor(timestamp / 1000) + 300 // 5 minutes validity
        })).toString('base64url');

        const jwtSignature = crypto
            .createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

        const jwtToken = `${header}.${body}.${jwtSignature}`;

        return NextResponse.json({
            token: jwtToken,
            port: port,
            agentUrl: `http://127.0.0.1:${port}`
        });

    } catch (error) {
        console.error('Session token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
