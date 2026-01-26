'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download, Share2, FileText, Calendar, User, Building, Paperclip, Clock, Settings } from 'lucide-react';
import A4Preview from '@/components/ui/A4Preview';
import { DocumentService } from '@/lib/services/documentService';
import { DMDocument, DMAttachment } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [document, setDocument] = useState<DMDocument | null>(null);
    const [attachments, setAttachments] = useState<DMAttachment[]>([]);
    const [eypPackages, setEypPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocument();
    }, [params.id]);

    const fetchDocument = async () => {
        try {
            setLoading(true);
            const { data, error } = await DocumentService.getDocumentById(params.id);
            if (error) throw error;
            setDocument(data);

            const atts = await DocumentService.getAttachments(params.id);
            setAttachments(atts || []);

            // Fetch EYP packages
            const { EYPService } = await import('@/lib/services/eypService');
            const packages = await EYPService.getPackagesByDocument(params.id);
            setEypPackages(packages);
        } catch (error) {
            console.error('Error fetching document:', error);
            toast.error('Belge detayları alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAttachment = async (path: string, fileName: string) => {
        try {
            const url = await DocumentService.getAttachmentUrl(path);
            window.open(url, '_blank');
        } catch (err) {
            toast.error('Dosya açılamadı.');
        }
    }

    const [generatingEYP, setGeneratingEYP] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [signerPort, setSignerPort] = useState('51695'); // Default port
    const [showPortConfig, setShowPortConfig] = useState(false);

    const handleDownloadEYP = async () => {
        if (!document) return;

        try {
            setGeneratingEYP(true);
            console.log('[EYP] Starting EYP generation...');
            console.log('[EYP] Document:', document);
            
            const { EYPBuilder } = await import('@/lib/eyp/package-builder');
            const fileSaver = await import('file-saver');
            const { generateDocumentPDF } = await import('@/lib/pdf-generator');
            console.log('[EYP] Modules loaded');

            // 1. Generate PDF (UstYazi)
            console.log('[EYP] Generating PDF...');
            const pdfBlob = await generateDocumentPDF(document);
            console.log('[EYP] PDF generated, size:', pdfBlob.size);

            // 2. Fetch Attachments Content
            const attachmentFiles = await Promise.all(attachments.map(async (att) => {
                try {
                    const url = await DocumentService.getAttachmentUrl(att.file_path);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Download failed');
                    const blob = await response.blob();

                    return {
                        fileName: att.file_name,
                        content: blob,
                        mimeType: att.file_type
                    };
                } catch (e) {
                    console.error('Failed to fetch attachment:', att.file_name, e);
                    return null;
                }
            }));

            // Filter out failed downloads
            const validAttachments = attachmentFiles.filter(a => a !== null) as any[];

            // 3. Generate Hash for PDF
            const pdfBuffer = await pdfBlob.arrayBuffer();
            let hashHex: string;
            
            // crypto.subtle is only available in secure contexts (HTTPS or localhost)
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                // Fallback: Use simple hash calculation for non-secure contexts
                // Note: For production, always use HTTPS
                console.warn('crypto.subtle not available (non-secure context). Using fallback hash.');
                const bytes = new Uint8Array(pdfBuffer);
                let hash = 0;
                for (let i = 0; i < bytes.length; i++) {
                    hash = ((hash << 5) - hash + bytes[i]) | 0;
                }
                // Generate a pseudo-hash (NOT cryptographically secure - only for dev)
                hashHex = Math.abs(hash).toString(16).padStart(64, '0');
            }

            // 4. Get ALL Signers Info from document
            const imzaBilgileri = (document.signers || []).map((signer: any) => {
                // Parse name - try to split into first/last name
                const nameParts = (signer.name || '').trim().split(' ');
                let ilkAdi = 'Yetkili';
                let soyadi = '';
                
                if (nameParts.length > 1) {
                    ilkAdi = nameParts[0];
                    soyadi = nameParts.slice(1).join(' ');
                } else if (nameParts.length === 1 && nameParts[0]) {
                    ilkAdi = nameParts[0];
                }
                
                const unvan = signer.title || 'Yetkili';
                
                return {
                    ilkAdi,
                    soyadi,
                    unvan,
                    makam: unvan
                };
            });
            
            console.log('[EYP] Signers info:', imzaBilgileri);

            // 5. Build Package
            console.log('[EYP] Building EYP package...');
            console.log('[EYP] Config:', {
                belgeNo: document.document_number,
                tarih: document.reference_date,
                konu: document.subject
            });
            const eypBlob = await EYPBuilder.buildPackage({
                ustYaziPdf: pdfBlob,
                ustVeri: {
                    senaryo: 'e-Yazışma Paketi',
                    bellesikDosya: {
                        dosyaAdi: 'UstYazi.pdf',
                        dosyaImzaliAdi: 'UstYazi_imzali.pdf',
                        mimeTuru: 'application/pdf',
                        boyut: pdfBlob.size,
                        ozet: {
                            algoritma: 'SHA-256',
                            deger: hashHex
                        }
                    },
                    ustveriDili: 'TR',
                    belgeNo: document.document_number,
                    tarih: document.reference_date,
                    konu: document.subject,
                    gonderen: {
                        id: '1234567890',
                        adi: document.sender || 'Sendika Yönetim',
                        rol: 'Gonderen'
                    },
                    alici: [{
                        id: '0000000000',
                        adi: document.receiver || 'İlgili Makama',
                        rol: 'Alici'
                    }]
                },
                belgeHedef: {
                    hedefler: [
                        { hedef: document.receiver || 'İlgili Makama', amac: 'Gereği' }
                    ]
                },
                imzaBilgileri: imzaBilgileri.length > 0 ? imzaBilgileri : undefined,
                attachments: validAttachments
            });

            console.log('[EYP] EYP blob created, size:', eypBlob.size);
            
            if (eypBlob.size === 0) {
                throw new Error('EYP blob is empty!');
            }
            
            const fileName = `${document.document_number.replace(/[\/\\]/g, '_')}.eyp`;
            console.log('[EYP] Saving as:', fileName);
            fileSaver.saveAs(eypBlob, fileName);
            toast.success('EYP paketi başarıyla indirildi');

        } catch (error) {
            console.error('EYP generation failed:', error);
            toast.error('EYP oluşturulurken hata meydana geldi');
        } finally {
            setGeneratingEYP(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!document) return;

        try {
            setGeneratingPDF(true);
            const fileSaver = await import('file-saver');
            const { generateDocumentPDF } = await import('@/lib/pdf-generator');

            const pdfBlob = await generateDocumentPDF(document);
            fileSaver.saveAs(pdfBlob, `${document.document_number.replace(/[\/\\]/g, '_')}.pdf`);
            toast.success('PDF başarıyla indirildi');

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('PDF oluşturulurken hata meydana geldi');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handlePrint = () => {
        if (!document) return;

        // Create a hidden iframe
        const iframe = window.document.createElement('iframe');
        iframe.style.display = 'none';
        window.document.body.appendChild(iframe);

        const printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${document.document_number} - ${document.subject}</title>
    <style>
        @page { size: A4; margin: 25mm; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; }
        .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #dc2626; font-size: 14pt; margin: 0; }
        .header h2 { font-size: 16pt; margin: 5px 0; }
        .header p { font-size: 10pt; color: #666; margin: 5px 0 0 0; }
        .meta { display: flex; justify-content: space-between; font-size: 11pt; margin-bottom: 20px; }
        .meta-left, .meta-right { }
        .receiver { font-weight: bold; margin-bottom: 20px; }
        .content { text-align: justify; white-space: pre-wrap; }
        .signature { position: absolute; bottom: 50mm; right: 25mm; text-align: center; }
        .signature p { margin: 5px 0; }
        @media print { body { -webkit-print-color-adjust: exact; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>T.C.</h1>
        <h2>SENDİKA YÖNETİM SİSTEMİ</h2>
        <p>Genel Merkez Yönetim Kurulu</p>
    </div>
    <div class="meta">
        <div class="meta-left">
            <p><strong>Sayı:</strong> ${document.document_number}</p>
            <p><strong>Konu:</strong> ${document.subject}</p>
        </div>
        <div class="meta-right">
            <p><strong>Tarih:</strong> ${new Date(document.reference_date).toLocaleDateString('tr-TR')}</p>
        </div>
    </div>
    <div class="receiver">
        <p>Sayın: ${document.receiver || ''}</p>
    </div>
    <div class="content">
${document.description || ''}
    </div>
    <div class="signature">
        <p><strong>${document.sender || ''}</strong></p>
        <p style="font-size: 10pt; color: #666;">İmza</p>
    </div>
</body>
</html>`;

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(printContent);
            iframeDoc.close();

            // Wait for content to load then print
            setTimeout(() => {
                if (iframe.contentWindow) {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    // Remove iframe after delay
                    setTimeout(() => {
                        window.document.body.removeChild(iframe);
                    }, 5000);
                }
            }, 500);
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Yükleniyor...</div>;
    }

    if (!document) {
        return <div className="p-10 text-center text-red-500">Belge bulunamadı.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">{document.document_number}</h1>
                        <p className="text-sm text-slate-500">{document.type === 'outgoing' ? 'Giden Evrak' : 'İç Yazışma'}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Yazdır
                    </button>
                    <button
                        onClick={() => handleDownloadEYP()}
                        disabled={generatingEYP}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {generatingEYP ? 'Paketleniyor...' : 'EYP İndir'}
                    </button>
                    <button
                        onClick={() => handleDownloadPDF()}
                        disabled={generatingPDF}
                        className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {generatingPDF ? 'Oluşturuluyor...' : 'İndir (PDF)'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Like A4 Preview) */}
                <div className="lg:col-span-2 space-y-6 flex justify-center">
                    <div className="bg-white dark:bg-slate-800 rounded-sm shadow-md border border-slate-200 dark:border-slate-700 relative mx-auto overflow-auto">
                        <A4Preview
                            document={document}
                            zoom={1}
                            readonly={true}
                        />
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Belge Durumu</h3>
                        <div className={`flex items-center space-x-2 mb-4 p-3 rounded-lg ${document.status === 'sent' ? 'text-green-600 bg-green-50' :
                            document.status === 'pending_approval' ? 'text-yellow-600 bg-yellow-50' :
                                document.status === 'draft' ? 'text-slate-600 bg-slate-50' :
                                    document.status === 'registered' ? 'text-blue-600 bg-blue-50' :
                                        'text-slate-600 bg-slate-50'
                            }`}>
                            <CheckCircleIcon className="w-5 h-5" />
                            <span className="font-medium">
                                {document.status === 'sent' ? 'Gönderildi' :
                                    document.status === 'pending_approval' ? 'İmza Bekliyor' :
                                        document.status === 'draft' ? 'Taslak' :
                                            document.status === 'registered' ? 'Kayıtlı' :
                                                document.status === 'archived' ? 'Arşivlendi' :
                                                    document.status === 'cancelled' ? 'İptal Edildi' :
                                                        document.status}
                            </span>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Oluşturma</span>
                                <span>{new Date(document.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                <span className="flex items-center"><User className="w-4 h-4 mr-2" /> Oluşturan</span>
                                <span>{document.sender}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="flex items-center"><Building className="w-4 h-4 mr-2" /> Kod</span>
                                <span>{document.category_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* EYP Status Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">EYP Durumu</h3>
                        {eypPackages.length === 0 ? (
                            <p className="text-slate-500 text-sm">EYP paketi bulunamadı.</p>
                        ) : (
                            <div className="space-y-4">
                                {eypPackages.map(pkg => (
                                    <div key={pkg.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {pkg.document_number}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${pkg.status === 'created' ? 'bg-yellow-100 text-yellow-800' :
                                                pkg.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                                                    pkg.status === 'sent' ? 'bg-green-100 text-green-800' :
                                                        'bg-slate-100 text-slate-800'
                                                }`}>
                                                {pkg.status === 'created' ? 'Oluşturuldu' :
                                                    pkg.status === 'signed' ? 'İmzalandı' :
                                                        pkg.status === 'sent' ? 'Gönderildi' :
                                                            pkg.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">
                                            {new Date(pkg.created_at).toLocaleString('tr-TR')}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={async () => {
                                                    const { EYPService } = await import('@/lib/services/eypService');
                                                    const url = await EYPService.getDownloadUrl(pkg.storage_path);
                                                    if (url) window.open(url, '_blank');
                                                    else toast.error('İndirme bağlantısı alınamadı');
                                                }}
                                                className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                            >
                                                <Download className="w-3 h-3 inline mr-1" />
                                                İndir
                                            </button>

                                            {pkg.status === 'created' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={async () => {
                                                                const { SignerAgentClient } = await import('@/lib/signer-agent');
                                                                const { EYPService } = await import('@/lib/services/eypService');
                                                                const { DocumentService } = await import('@/lib/services/documentService');

                                                                try {
                                                                    const targetPort = parseInt(signerPort) || 51695;

                                                                    // Token Fetcher Function
                                                                    const getToken = async () => {
                                                                        const sessionRes = await fetch('/api/signer/session', { method: 'POST' });
                                                                        if (!sessionRes.ok) throw new Error('Oturum anahtarı alınamadı');
                                                                        const sessionData = await sessionRes.json();
                                                                        return sessionData.token;
                                                                    };

                                                                    const signer = new SignerAgentClient({
                                                                        baseUrl: `http://127.0.0.1:${targetPort}`,
                                                                        port: targetPort,
                                                                        getToken: getToken
                                                                    });

                                                                    // Check Availability
                                                                    const tokenToast = toast.loading(`Uygulama aranıyor (Port: ${targetPort})...`);
                                                                    const isAvailable = await signer.checkAvailability();
                                                                    if (!isAvailable) {
                                                                        throw new Error(`Signer Agent bulunamadı (Port: ${targetPort}). Lütfen portu kontrol edin veya uygulamanın çalıştığından emin olun.`);
                                                                    }

                                                                    // Request Signing
                                                                    if (!pkg.hash_value) {
                                                                        throw new Error('Paket özeti (hash) bulunamadı.');
                                                                    }

                                                                    toast.loading('İmza bekleniyor... Lütfen PIN giriniz.', { id: tokenToast });
                                                                    const signResult = await signer.signHash(
                                                                        pkg.hash_value,
                                                                        {
                                                                            number: pkg.document_number || document.document_number,
                                                                            date: new Date().toISOString().split('T')[0],
                                                                            subject: document.subject,
                                                                            recipient: document.receiver || undefined
                                                                        }
                                                                    );

                                                                    if (!signResult.success || !signResult.signature) {
                                                                        throw new Error(signResult.error || 'İmzalama iptal edildi veya hata oluştu.');
                                                                    }

                                                                    // Save Signature
                                                                    toast.loading('İmza kaydediliyor...', { id: tokenToast });

                                                                    await EYPService.updateStatus(pkg.id, 'signed', {
                                                                        signed_at: new Date().toISOString()
                                                                    });

                                                                    await DocumentService.updateDocument(document.id, {
                                                                        status: 'registered'
                                                                    });

                                                                    toast.success('Belge başarıyla e-imza ile imzalandı!', { id: tokenToast });
                                                                    setTimeout(() => window.location.reload(), 1000);

                                                                } catch (err: any) {
                                                                    console.error(err);
                                                                    toast.error(err.message || 'İşlem başarısız');
                                                                }
                                                            }}
                                                            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex-1"
                                                        >
                                                            İmzala (E-İmza)
                                                        </button>
                                                        <button
                                                            onClick={() => setShowPortConfig(!showPortConfig)}
                                                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                            title="Port Ayarı"
                                                        >
                                                            <Settings className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    {showPortConfig && (
                                                        <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
                                                            <span className="text-[10px] text-slate-500">Port:</span>
                                                            <input
                                                                type="text"
                                                                value={signerPort}
                                                                onChange={(e) => setSignerPort(e.target.value)}
                                                                className="w-12 text-xs border rounded px-1 h-5"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {pkg.status === 'signed' && (
                                                <button
                                                    onClick={() => toast('KEP entegrasyonu henüz hazır değil', { icon: '📧' })}
                                                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                >
                                                    KEP'e Gönder
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Attachments Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ekler</h3>
                        {attachments.length === 0 ? (
                            <p className="text-slate-500 text-sm">Ek dosya bulunmuyor.</p>
                        ) : (
                            <ul className="space-y-3">
                                {attachments.map(att => (
                                    <li key={att.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <Paperclip className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={att.file_name}>
                                                {att.file_name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadAttachment(att.file_path, att.file_name)}
                                            className="text-slate-400 hover:text-violet-600 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

function CheckCircleIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
}
