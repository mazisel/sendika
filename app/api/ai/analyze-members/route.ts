import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'Gemini API anahtarı bulunamadı.' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { stats, context } = body;

        if (!stats) {
            return NextResponse.json(
                { error: 'Analiz edilecek veri bulunamadı.' },
                { status: 400 }
            );
        }

        const prompt = `
Sen uzman bir veri analistisin. Bir sendikanın üye verilerini analiz ediyorsun.
Aşağıdaki istatistiklere dayanerek, yönetime sunulmak üzere kapsamlı, profesyonel ve içgörü dolu bir analiz raporu yaz.

BAĞLAM:
${context ? `Rapor Türü: ${context}` : 'Genel Analiz'}
Tarih: ${new Date().toLocaleDateString('tr-TR')}

VERİLER:
${JSON.stringify(stats, null, 2)}

İSTENEN ÇIKTI FORMATI:
Rapor Türkçe olmalı ve Markdown formatında yazılmalıdır.
Aşağıdaki başlıkları içermelidir:
1. **Genel Durum Özeti**: Kısaca mevcut durum.
2. **Öne Çıkan Eğilimler**: Verilerdeki artış/azalış veya dikkat çekici noktalar (Örn: belirli bir şehirde yoğunlaşma, istifa oranları vb.).
3. **Stratejik Öneriler**: Bu verilere dayanarak yönetim ne yapmalı? (Örn: Üye sayısı az olan bölgelere odaklanma, istifaları önleme vb.).

Not: Sayısal verileri metin içinde kullanarak analizi güçlendir. Sadece sayıları listeleme, yorumla.
Kesinlikle "Hazırlayan: ...", "Raporu Sunan: ..." gibi imza veya kapanış ifadeleri EKLEME. Sadece analiz içeriğini ver.
`;

        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ analysis: text });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json(
            { error: 'Analiz oluşturulurken bir hata oluştu.' },
            { status: 500 }
        );
    }
}
