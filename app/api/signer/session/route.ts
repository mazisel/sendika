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

        // Custom HMAC Token Generation (per Signer Agent documentation)
        // Secret is used as UTF-8 string directly
        // IMPORTANT: Property order must match what agent expects: nbf, nonce, exp

        const secret = 'TwkCgywLVQyYoqLxr5NkLdUsnFNm11SIkauJkmkrI4Q=';

        const now = Math.floor(Date.now() / 1000);
        const exp = now + 300;
        const nonce = crypto.randomBytes(8).toString('hex');

        // Manually construct JSON with exact property order: nbf, nonce, exp
        const payloadJson = `{"nbf":${now},"nonce":"${nonce}","exp":${exp}}`;
        console.log('[SignerSession] Payload JSON:', payloadJson);

        // Convert payload to bytes first, then use for both base64 encoding and HMAC
        const payloadBytes = Buffer.from(payloadJson, 'utf8');
        const payloadB64 = payloadBytes.toString('base64url');

        // HMAC: secret as UTF-8 string, input is payload bytes
        const signature = crypto
            .createHmac('sha256', secret)
            .update(payloadBytes)
            .digest('base64url');

        const token = `${payloadB64}.${signature}`;
        
        console.log('[SignerSession] Generated token:', token);
        console.log('[SignerSession] Payload B64:', payloadB64);
        console.log('[SignerSession] Signature:', signature);

        // User requested port 51695
        const port = parseInt(process.env.SIGNER_AGENT_PORT || '51695');

        return NextResponse.json({
            token: token,
            port: port,
            // The agent URL is constructed on the client side based on port, 
            // but we return the standard structure.
            agentUrl: `http://127.0.0.1:${port}`
        });

    } catch (error) {
        console.error('Session token error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

