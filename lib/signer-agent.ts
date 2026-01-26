export interface SignerConfig {
    baseUrl: string;
    port: number;
    getToken: () => Promise<string>;
    certificateThumbprint?: string;
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
        const url = `${this.config.baseUrl}/health`; // Try health endpoint if available, or just root
        console.log(`[SignerAgent] Checking availability at ${this.config.baseUrl}...`);

        try {
            // Try standard health check first if agent supports it
            try {
                const res = await fetch(url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000)
                });
                if (res.ok) return true;
            } catch { }

            // Fallback: Try a no-cors request to root/sign to see if it's there
            await fetch(`${this.config.baseUrl}/sign`, {
                method: 'POST',
                mode: 'no-cors',
                signal: AbortSignal.timeout(2000)
            });

            console.log('[SignerAgent] Availability check PASSED');
            return true;
        } catch (e: any) {
            console.error('[SignerAgent] Availability check FAILED:', e);
            return false;
        }
    }

    /**
     * Signs PaketOzeti.xml using the agent (recommended method).
     * @param paketOzetiXmlBase64 The PaketOzeti.xml content in Base64.
     * @param documentMeta Metadata about the document being signed.
     */
    async signPaketOzeti(
        paketOzetiXmlBase64: string,
        documentMeta: { number: string; date: string; subject: string; recipient?: string }
    ): Promise<SignResult> {
        const url = `${this.config.baseUrl}/sign`;

        try {
            const token = await this.config.getToken();

            console.log(`[SignerAgent] Sending PaketOzeti sign request to ${url}...`);

            const payload = {
                paketOzetiXmlBase64,
                signatureProfile: "CAdES-DETACHED",
                certificateThumbprint: this.config.certificateThumbprint,
                documentMeta
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signing-Session': token,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(60000)
            });

            return this.handleResponse(response);

        } catch (error: any) {
            return this.handleError(error);
        }
    }

    /**
     * Signs a pre-computed hash using the agent (alternative method).
     * @param hashBase64 The SHA256 hash of the document in Base64.
     * @param documentMeta Metadata about the document being signed.
     */
    async signHash(
        hashBase64: string,
        documentMeta: { number: string; date: string; subject: string; recipient?: string }
    ): Promise<SignResult> {
        const url = `${this.config.baseUrl}/sign`;

        try {
            const token = await this.config.getToken();

            console.log(`[SignerAgent] Sending hash sign request to ${url}...`);

            const payload = {
                toBeSignedHashBase64: hashBase64,
                signatureProfile: "CAdES-DETACHED",
                certificateThumbprint: this.config.certificateThumbprint,
                documentMeta
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signing-Session': token,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(60000)
            });

            return this.handleResponse(response);

        } catch (error: any) {
            return this.handleError(error);
        }
    }

    private async handleResponse(response: Response): Promise<SignResult> {
        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                if (errJson.errorMessage) {
                    return { success: false, error: `Agent Error: ${errJson.errorMessage}` };
                }
            } catch { }

            console.warn(`[SignerAgent] Request failed: ${response.status} ${errText}`);
            return { success: false, error: `Agent Error (${response.status}): ${errText}` };
        }

        const data = await response.json();
        console.log('[SignerAgent] Sign success:', data);

        if (data.signatureBase64) {
            return { success: true, signature: data.signatureBase64 };
        } else if (data.signature) {
            return { success: true, signature: data.signature };
        }

        return { success: false, error: 'Invalid response: No signature found' };
    }

    private handleError(error: any): SignResult {
        console.error(`[SignerAgent] Connection Failed:`, error);
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            return { success: false, error: 'Agent\'a ulaşılamadı. Lütfen uygulamanın açık olduğundan, portun doğru olduğundan ve CORS ayarlarının yapıldığından emin olun.' };
        }
        return { success: false, error: `Connection failed: ${error.message}` };
    }
}
