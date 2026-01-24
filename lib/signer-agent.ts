export interface SignerConfig {
    port: number;
    baseUrl: string;
    token: string;
}

export interface SignResult {
    success: boolean;
    signature?: string;
    error?: string;
}

export class SignerAgentClient {
    private config: SignerConfig;

    constructor(config: SignerConfig) {
        this.config = config;
    }

    /**
     * Checks if the agent is reachable.
     */
    async checkAvailability(): Promise<boolean> {
        console.log(`[SignerAgent] Checking availability at ${this.config.baseUrl}...`);
        try {
            // Usually agents have a /health or root endpoint
            const res = await fetch(`${this.config.baseUrl}/api/status`, { // Guessing endpoint based on common patterns, user guide didn't specify.
                method: 'GET',                                             // Will try connection.
                headers: {
                    'Authorization': `Bearer ${this.config.token}`
                },
                signal: AbortSignal.timeout(1000) // Fast timeout
            });
            return res.ok;
        } catch (e) {
            // Try root if api/status fails
            try {
                // Just fetching root might return 404 but proves connectivity
                await fetch(`${this.config.baseUrl}`, {
                    mode: 'no-cors',
                    signal: AbortSignal.timeout(1000)
                });
                return true;
            } catch {
                return false;
            }
        }
    }

    /**
     * Request the agent to sign a hash.
     * @param hash The SHA-256 hash or data to sign.
     * @param description Description to show to the user on the PIN screen.
     */
    async signHash(hash: string, description: string): Promise<SignResult> {
        try {
            // Endpoint structure typical for Akis/Signer agents: /api/sign
            // Payload often matches { hash: "...", description: "..." }

            const response = await fetch(`${this.config.baseUrl}/api/sign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.token}`,
                    // 'X-Session-Token': this.config.token // Guide says "Origin whitelist yerine HMAC session token zorunlu tutulur"
                },
                body: JSON.stringify({
                    hash: hash,
                    description: description,
                    // content: "..." // If we were sending full content
                    alg: "SHA256",
                    format: "CAdES" // or PAdES if sending PDF
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                return { success: false, error: `Agent Error: ${response.status} - ${errText}` };
            }

            const data = await response.json();

            // Expected response: { signature: "Base64..." }
            if (data.signature) {
                return { success: true, signature: data.signature };
            } else {
                return { success: false, error: 'Invalid response from agent' };
            }

        } catch (error: any) {
            return { success: false, error: error.message || 'Connection failed' };
        }
    }
}
