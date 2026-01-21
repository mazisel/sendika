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
        // Using gemini-2.0-flash for high accuracy and JSON support
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
            Analyze this Turkish Identity Card (Kimlik Kartı) image.
            Extract the following information:
            - first_name (string, extract Ad)
            - last_name (string, extract Soyad)
            - tc_identity (string, extract TC Kimlik No/TR Identity No)
            - birth_date (string, format YYYY-MM-DD, extract Doğum Tarihi)
            - gender (string, 'male' or 'female', extract Cinsiyet E/K)

            Rules:
            1. For gender, if 'E' return 'male', if 'K' return 'female'.
            2. If a field is not visible, use null.
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
                { error: 'AI servisi işlem limitine ulaştı. Lütfen 1 dakika bekleyip tekrar deneyin.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Kimlik tarama işlemi sırasında bir hata oluştu.' },
            { status: 500 }
        );
    }
}
