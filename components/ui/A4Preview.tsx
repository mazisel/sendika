import React from 'react';
import { DMDocument } from '@/lib/types/document-management';
import { formatDocumentContent } from '@/lib/utils/documentFormatting';
// import { formatContentForPreview } from '@/lib/utils/documentUtils';

interface A4PreviewProps {
    document: {
        document_number?: string;
        subject?: string;
        receiver?: string;
        description?: string; // or content
        content?: string;
        reference_date?: string; // or date
        date?: string;
        sender?: string;
        sender_unit?: string;
        header_title?: string;
        header_org_name?: string;
        footer_org_name?: string;
        footer_address?: string;
        footer_contact?: string;
        footer_phone?: string;
        decision_number?: string;
        logo_url?: string;
        right_logo_url?: string;
        signers?: Array<{
            name: string;
            title: string;
            signature_url?: string;
            signature_size_mm?: number;
            signature_offset_x_mm?: number;
            signature_offset_y_mm?: number;
        }>;
        // Visibility
        show_header?: boolean;
        show_date?: boolean;
        show_sayi?: boolean;
        show_konu?: boolean;
        show_karar_no?: boolean;
        show_receiver?: boolean;
        show_signatures?: boolean;
        show_footer?: boolean;
        text_align?: string;
        receiver_text_align?: string;
    };
    zoom?: number;
    margins?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    readonly?: boolean;
}

export default function A4Preview({ document, zoom = 1, margins = { top: 25, right: 25, bottom: 25, left: 25 }, readonly = true }: A4PreviewProps) {

    // Normalize properties (handle both snake_case from DB and camelCase from form)
    const doc = {
        ...document,
        content: document.content || document.description || '',
        date: document.date || document.reference_date || new Date().toISOString(),
        headerTitle: (document as any).headerTitle || document.header_title || 'T.C.',
        headerOrgName: (document as any).headerOrgName || document.header_org_name || 'SENDİKA YÖNETİM SİSTEMİ',
        logo_url: document.logo_url || (document as any).logoUrl,
        right_logo_url: document.right_logo_url || (document as any).rightLogoUrl,
        senderUnit: (document as any).senderUnit || document.sender_unit || (document as any).sender,
        footerOrgName: (document as any).footerOrgName || document.footer_org_name,
        footerAddress: (document as any).footerAddress || document.footer_address || 'Genel Merkez Binası, Ankara',
        footerContact: (document as any).footerContact || document.footer_contact || 'Genel Sekreterlik',
        footerPhone: (document as any).footerPhone || document.footer_phone || '0312 000 00 00',
        decisionNumber: (document as any).decisionNumber || document.decision_number,

        // Visibility (default to true if undefined)
        showHeader: document.show_header !== false && (document as any).showHeader !== false,
        showDate: document.show_date !== false && (document as any).showDate !== false,
        showSayi: document.show_sayi !== false && (document as any).showSayi !== false,
        showKonu: document.show_konu !== false && (document as any).showKonu !== false,
        showKararNo: document.show_karar_no !== false && (document as any).showKararNo !== false,
        showReceiver: document.show_receiver !== false && (document as any).showReceiver !== false,
        showSignatures: document.show_signatures !== false && (document as any).showSignatures !== false,
        showFooter: document.show_footer !== false && (document as any).showFooter !== false,

        textAlign: (document as any).textAlign || document.text_align || 'justify',
        receiverTextAlign: (document as any).receiverTextAlign || document.receiver_text_align || 'left',
    };

    const formattedContent = formatDocumentContent(doc.content);
    const DEFAULT_SIGNATURE_SIZE_MM = 50;
    const getSignatureSize = (signer: any) =>
        Number.isFinite(signer?.signature_size_mm) ? signer.signature_size_mm : DEFAULT_SIGNATURE_SIZE_MM;

    return (
        <div
            style={{
                backgroundColor: 'white',
                color: 'black',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                paddingTop: `${margins.top}mm`,
                paddingBottom: `${margins.bottom}mm`,
                paddingLeft: `${margins.left}mm`,
                paddingRight: `${margins.right}mm`,
                height: 'max-content',
                minHeight: '297mm',
                width: '210mm'
            }}
            className="shadow-[0_4px_24px_rgba(0,0,0,0.1)] text-[12pt] font-serif leading-normal relative transition-all duration-200 printable-content mx-auto"
        >
            {/* Header */}
            {doc.showHeader !== false && (
                <div className="text-center mb-8 border-b-2 border-black pb-4 relative min-h-[100px] flex items-center justify-center">
                    {/* Left Logo */}
                    {doc.logo_url && (
                        <img src={doc.logo_url} alt="Sol Logo" className="absolute left-0 top-0 h-24 w-auto object-contain" />
                    )}

                    {/* Title Block */}
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-[14pt] mb-1">{doc.headerTitle}</h1>
                        <h2 className="font-bold text-[16pt] mb-1 whitespace-pre-line">{doc.headerOrgName}</h2>
                        {doc.senderUnit && <p className="text-[11pt] whitespace-pre-line">{doc.senderUnit}</p>}
                    </div>

                    {/* Right Logo */}
                    {doc.right_logo_url && (
                        <img src={doc.right_logo_url} alt="Sağ Logo" className="absolute right-0 top-0 h-24 w-auto object-contain" />
                    )}
                </div>
            )}

            {/* Meta Info */}
            <div className="flex justify-between items-start mb-8 text-[11pt]">
                <div className="space-y-1">
                    {doc.showKararNo !== false && doc.decisionNumber && (
                        <p><span className="font-bold">Karar No:</span> {doc.decisionNumber}</p>
                    )}
                    {doc.showKonu !== false && (
                        <p><span className="font-bold">Konu:</span> {doc.subject}</p>
                    )}
                </div>
                <div className="space-y-1 text-right">
                    {doc.showDate !== false && (
                        <p><span className="font-bold">Tarih:</span> {new Date(doc.date).toLocaleDateString('tr-TR')}</p>
                    )}
                    {doc.showSayi !== false && (
                        <p><span className="font-bold">Sayı:</span> {doc.document_number || '----------'}</p>
                    )}
                </div>
            </div>

            {/* Receiver */}
            {doc.showReceiver !== false && (
                <div className="mb-8 font-bold text-[12pt] uppercase" style={{ textAlign: doc.receiverTextAlign as any }}>
                    <p>{doc.receiver}</p>
                </div>
            )}

            {/* Content with HTML Parsing (Table support) */}
            <div
                className="mb-12"
                style={{ textAlign: doc.textAlign as any, whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: formattedContent }}
            />

            {/* Signatures */}
            {doc.showSignatures !== false && doc.signers && doc.signers.length > 0 && (
                <div className="mt-12 flex justify-end gap-8 flex-wrap">
                    {doc.signers.map((signer: any, index: number) => (
                        <div key={index} className="text-center min-w-[150px]">
                            <p className="font-bold whitespace-nowrap">{signer.name}</p>
                            <p className="text-[10pt] mb-0 leading-none">{signer.title}</p>
                            {/* If signed show image or status */}
                            {(() => {
                                const size = getSignatureSize(signer);
                                const signatureStyle: React.CSSProperties = {
                                    height: `${size}mm`,
                                    width: 'auto',
                                    marginTop: '0px',
                                    display: 'block',
                                };

                                return signer.signature_url ? (
                                    <img
                                        src={signer.signature_url}
                                        alt="İmza"
                                        className="mx-auto mix-blend-multiply"
                                        style={signatureStyle}
                                    />
                                ) : (
                                    <div className="mx-auto" style={{ height: `${size}mm`, marginTop: '0px' }} />
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}

            {/* Legacy Single Signer (Removed) */}

            {/* Footer */}
            {doc.showFooter !== false && (
                <div className="absolute bottom-[25mm] left-[25mm] right-[25mm] border-t border-slate-300 pt-2 text-[8pt] text-slate-500 flex justify-between">
                    <div>
                        <p className="font-bold">{doc.footerOrgName}</p>
                        <p>Adres: {doc.footerAddress}</p>
                    </div>
                    <div className="text-right">
                        <p>Bilgi İçin: {doc.footerContact}</p>
                        <p>Tel: {doc.footerPhone}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
