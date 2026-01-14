import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// E-posta servisi yapılandırması
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// E-posta şablonları
const emailTemplates = {
    resignation: (memberName: string, resignationReason: string, resignationDate: string) => ({
        subject: 'Sendika Üyelik Durumu Değişikliği Bildirimi',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
                    .info-item { margin: 10px 0; }
                    .label { font-weight: bold; color: #6b7280; }
                    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">Üyelik Durumu Değişikliği</h1>
                    </div>
                    <div class="content">
                        <p>Sayın <strong>${memberName}</strong>,</p>
                        <p>Sendikamızdaki üyelik durumunuz güncellenmiştir.</p>
                        
                        <div class="info-box">
                            <div class="info-item">
                                <span class="label">İşlem:</span> Üyelik Sonlandırma
                            </div>
                            <div class="info-item">
                                <span class="label">Neden:</span> ${resignationReason}
                            </div>
                            <div class="info-item">
                                <span class="label">Tarih:</span> ${new Date(resignationDate).toLocaleDateString('tr-TR')}
                            </div>
                        </div>
                        
                        <p>Sorularınız için bizimle iletişime geçebilirsiniz.</p>
                        <p>Saygılarımızla,<br><strong>${process.env.ORGANIZATION_NAME || 'Sendika Yönetimi'}</strong></p>
                    </div>
                    <div class="footer">
                        <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
                        <p>${process.env.ORGANIZATION_NAME || 'Sendika'} © ${new Date().getFullYear()}</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Sayın ${memberName},

Sendikamızdaki üyelik durumunuz güncellenmiştir.

İşlem: Üyelik Sonlandırma
Neden: ${resignationReason}
Tarih: ${new Date(resignationDate).toLocaleDateString('tr-TR')}

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
${process.env.ORGANIZATION_NAME || 'Sendika Yönetimi'}
        `
    })
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, to, memberName, resignationReason, resignationDate } = body;

        if (!to || !type) {
            return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
        }

        let template;
        if (type === 'resignation') {
            template = emailTemplates.resignation(memberName, resignationReason, resignationDate);
        } else {
            return NextResponse.json({ error: 'Geçersiz şablon tipi' }, { status: 400 });
        }

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'Sendika'}" <${process.env.SMTP_USER}>`,
            to,
            subject: template.subject,
            html: template.html,
            text: template.text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('E-posta gönderildi:', info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('E-posta gönderme hatası:', error);
        return NextResponse.json({ error: 'E-posta gönderilemedi' }, { status: 500 });
    }
}
