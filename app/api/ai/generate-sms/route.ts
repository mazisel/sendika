import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
// Note: This requires GEMINI_API_KEY in .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        // Check if API key is configured
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API anahtarı yapılandırılmamış. Lütfen .env dosyasını kontrol edin.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { prompt, tone = 'formal', includePlaceholders = true } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: 'Lütfen bir konu veya açıklama girin.' },
                { status: 400 }
            );
        }

        // Construct the prompt for Gemini
        let systemInstruction = `Sen profesyonel bir metin yazarısın. Görevin, sendika üyelerine gönderilecek kısa, etkileyici ve amaca uygun SMS metinleri oluşturmaktır.
    
Kurallar:
1. Dil: Türkçe.
2. Uzunluk: Maksimum 918 karakter (SMS standardı), ancak mümkünse 160 karakteri geçmemeye çalış (tek SMS).
3. Ton: ${tone === 'formal' ? 'Resmi ve Saygılı' : tone === 'enthusiastic' ? 'Coşkulu ve Heyecanlı' : 'Profesyonel ve Bilgilendirici'}.
4. İçerik: "${prompt}" konusunu ele al.`;

        if (includePlaceholders) {
            systemInstruction += `\n5. Kişiselleştirme: Mesajın uygun yerlerinde şu etiketleri kullanabilirsin: {AD}, {SOYAD}, {AD_SOYAD}. Örneğin "Sayın {AD_SOYAD}, ..."`;
        }

        systemInstruction += `\n6. Çıktı formatı: Sadece oluşturulan SMS metnini döndür. Başka bir açıklama veya giriş/çıkış cümlesi yazma.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ content: text.trim() });
    } catch (error) {
        console.error('Gemini AI Generation Error:', error);
        return NextResponse.json(
            { error: 'SMS oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' },
            { status: 500 }
        );
    }
}
