import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(request: Request) {
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Gemini API key is not configured' },
            { status: 500 }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Model configuration
        // Using gemini-3-flash-preview as requested by user
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `
            Analyze this Turkish Identity Card (Kimlik Kartı) image.
            Extract the following information and return ONLY a valid JSON object with these keys:
            - first_name (string, extract Ad)
            - last_name (string, extract Soyad)
            - tc_identity (string, extract TC Kimlik No/TR Identity No)
            - birth_date (string, format YYYY-MM-DD, extract Doğum Tarihi)
            - gender (string, 'male' or 'female', extract Cinsiyet E/K)

            Rules:
            1. Correct any OCR errors if possible (e.g. 0 vs O).
            2. For gender, if 'E' return 'male', if 'K' return 'female'.
            3. Return only pure JSON, no markdown formatting like \`\`\`json.
            4. If a field is not visible or cannot be read, leave it as null.
            5. Do NOT include any explanations or extra text.
        `;

        const imagePart = {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType: file.type,
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log('AI Raw Response:', text); // Debug log

        // Clean up text if it contains markdown code blocks
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        if (!cleanedText) {
            throw new Error('AI returned empty response');
        }

        try {
            const data = JSON.parse(cleanedText);
            return NextResponse.json(data);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Raw Text:', text);
            return NextResponse.json(
                { error: 'Failed to parse API response', raw: text },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('ID Scan Error:', error);

        // Handle Google API Rate Limiting (429)
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded') || error.status === 429) {
            return NextResponse.json(
                { error: 'AI servisi işlem limitine ulaştı. Lütfen 1 dakika bekleyip tekrar deneyin. (Google Gemini Free Tier Quota)' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Kimlik tarama işlemi sırasında bir hata oluştu.' },
            { status: 500 }
        );
    }
}
