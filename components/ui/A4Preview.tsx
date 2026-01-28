import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

function A4PreviewComponent({ document: docProp, zoom = 1, margins = { top: 25, right: 25, bottom: 25, left: 25 }, readonly = true }: A4PreviewProps) {
    const [pages, setPages] = useState<React.ReactNode[][]>([]);
    const ghostRef = useRef<HTMLDivElement>(null);
    const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Normalize properties
    const doc = useMemo(() => ({
        ...docProp,
        content: docProp.content || docProp.description || '',
        date: docProp.date || docProp.reference_date || new Date().toISOString(),
        headerTitle: (docProp as any).headerTitle || docProp.header_title || 'T.C.',
        headerOrgName: (docProp as any).headerOrgName || docProp.header_org_name || 'SENDİKA YÖNETİM SİSTEMİ',
        logo_url: docProp.logo_url || (docProp as any).logoUrl,
        right_logo_url: docProp.right_logo_url || (docProp as any).rightLogoUrl,
        senderUnit: (docProp as any).senderUnit || docProp.sender_unit || (docProp as any).sender,
        footerOrgName: (docProp as any).footerOrgName || docProp.footer_org_name,
        footerAddress: (docProp as any).footerAddress || docProp.footer_address || 'Genel Merkez Binası, Ankara',
        footerContact: (docProp as any).footerContact || docProp.footer_contact || 'Genel Sekreterlik',
        footerPhone: (docProp as any).footerPhone || docProp.footer_phone || '0312 000 00 00',
        decisionNumber: (docProp as any).decisionNumber || docProp.decision_number,

        showHeader: docProp.show_header !== false && (docProp as any).showHeader !== false,
        showDate: docProp.show_date !== false && (docProp as any).showDate !== false,
        showSayi: docProp.show_sayi !== false && (docProp as any).showSayi !== false,
        showKonu: docProp.show_konu !== false && (docProp as any).showKonu !== false,
        showKararNo: docProp.show_karar_no !== false && (docProp as any).showKararNo !== false,
        showReceiver: docProp.show_receiver !== false && (docProp as any).showReceiver !== false,
        showSignatures: docProp.show_signatures !== false && (docProp as any).showSignatures !== false,
        showFooter: docProp.show_footer !== false && (docProp as any).showFooter !== false,

        textAlign: (docProp as any).textAlign || docProp.text_align || 'justify',
        receiverTextAlign: (docProp as any).receiverTextAlign || docProp.receiver_text_align || 'left',
    }), [docProp]);

    const formattedContent = useMemo(() => formatDocumentContent(doc.content), [doc.content]);
    const DEFAULT_SIGNATURE_SIZE_MM = 50;
    const getSignatureSize = (signer: any) =>
        Number.isFinite(signer?.signature_size_mm) ? signer.signature_size_mm : DEFAULT_SIGNATURE_SIZE_MM;

    // A4 Dimensions in MM
    const PAGE_HEIGHT_MM = 297;
    const PAGE_WIDTH_MM = 210;

    // Approximate PX per MM (usually 96 DPI -> ~3.78 px/mm, but browsers vary; best to measure)
    // We will use a multiplier derived from a reference element or standard constant.
    const MM_TO_PX = 3.7795275591;

    // Debounced calculation to prevent rapid recalculations
    useEffect(() => {
        // Clear any pending calculation
        if (calculateTimeoutRef.current) {
            clearTimeout(calculateTimeoutRef.current);
        }

        // Debounce the calculation by 300ms
        calculateTimeoutRef.current = setTimeout(() => {
            calculatePages();
        }, 300);

        return () => {
            if (calculateTimeoutRef.current) {
                clearTimeout(calculateTimeoutRef.current);
            }
        };
    }, [formattedContent, doc.showHeader, doc.showFooter, doc.showSignatures, doc.showReceiver, margins]);

    const calculatePages = () => {
        if (!ghostRef.current) return;

        const ghostContent = ghostRef.current.querySelector('.ghost-content');
        if (!ghostContent) return;

        // Group inline nodes into blocks
        const childNodes = Array.from(ghostContent.childNodes);
        const newChildren: HTMLElement[] = [];
        let currentBlock: HTMLElement | null = null;

        const flushBlock = () => {
            if (currentBlock) {
                if (currentBlock.hasChildNodes()) {
                    newChildren.push(currentBlock);
                }
                currentBlock = null;
            }
        };

        const getOrCreateBlock = () => {
            if (!currentBlock) {
                currentBlock = document.createElement('div');
                currentBlock.style.marginBottom = '0px';
                currentBlock.style.minHeight = '1em';
            }
            return currentBlock as HTMLElement;
        };

        childNodes.forEach((node) => {
            if (node.nodeName === 'BR') {
                getOrCreateBlock();
                flushBlock();
            } else if (['TABLE', 'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) {
                flushBlock();
                newChildren.push(node as HTMLElement);
            } else {
                const block = getOrCreateBlock();
                block.appendChild(node.cloneNode(true));
            }
        });
        flushBlock();

        ghostContent.innerHTML = '';
        newChildren.forEach(child => ghostContent.appendChild(child));

        const contentNodes = Array.from(ghostContent.children);
        const headerEl = ghostRef.current.querySelector('.ghost-header');
        const footerEl = ghostRef.current.querySelector('.ghost-footer');
        const metaEl = ghostRef.current.querySelector('.ghost-meta');
        const receiverEl = ghostRef.current.querySelector('.ghost-receiver');
        const signersEl = ghostRef.current.querySelector('.ghost-signers');

        const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
        const measuredFooterHeight = footerEl ? footerEl.getBoundingClientRect().height : 0;
        const footerHeight = Math.max(measuredFooterHeight, 80);
        const metaHeight = metaEl ? metaEl.getBoundingClientRect().height : 0;
        const receiverHeight = receiverEl ? receiverEl.getBoundingClientRect().height : 0;
        const signersHeight = signersEl ? signersEl.getBoundingClientRect().height : 0;

        // Margins in PX
        const marginTopPx = margins.top * MM_TO_PX;
        const marginBottomPx = margins.bottom * MM_TO_PX;

        // Available content height per page (excluding margins, footer, and safety buffer)
        const safetyBuffer = 180; // px - prevents content from overlapping with footer
        const availableHeight = (PAGE_HEIGHT_MM * MM_TO_PX) - marginTopPx - marginBottomPx - footerHeight - safetyBuffer;

        const newPages: React.ReactNode[][] = [];
        let currentPageNodes: React.ReactNode[] = [];
        let currentHeight = 0;
        let isFirstPage = true;

        // First page has extra elements (header, meta, receiver)
        const getFirstPageOffset = () => {
            let offset = 0;
            if (doc.showHeader !== false) offset += headerHeight;
            offset += metaHeight;
            if (doc.showReceiver !== false) offset += receiverHeight;
            offset += 32; // Inter-section spacing
            return offset;
        };

        // Other pages only have header
        const getOtherPageOffset = () => {
            let offset = 0;
            if (doc.showHeader !== false) offset += headerHeight;
            offset += 20; // Spacing
            return offset;
        };

        // Initialize first page height
        currentHeight = getFirstPageOffset();

        // Process content nodes
        contentNodes.forEach((node, index) => {
            const el = node as HTMLElement;
            const nodeHeight = el.getBoundingClientRect().height;
            const computedStyle = window.getComputedStyle(el);
            const nodeMarginTop = parseFloat(computedStyle.marginTop) || 0;
            const nodeMarginBottom = parseFloat(computedStyle.marginBottom) || 0;
            const totalNodeHeight = nodeHeight + nodeMarginTop + nodeMarginBottom;

            // Check if this node fits on current page
            if (currentHeight + totalNodeHeight > availableHeight && currentPageNodes.length > 0) {
                // Current page is full, start a new one
                newPages.push(currentPageNodes);
                currentPageNodes = [];
                currentHeight = getOtherPageOffset();
                isFirstPage = false;
            }

            // Add node to current page
            currentPageNodes.push(
                <div
                    key={`content-${index}`}
                    dangerouslySetInnerHTML={{ __html: el.outerHTML }}
                    style={{ marginBottom: computedStyle.marginBottom, marginTop: computedStyle.marginTop }}
                />
            );
            currentHeight += totalNodeHeight;
        });

        // Check if signers fit on current page
        if (doc.showSignatures !== false && doc.signers && doc.signers.length > 0) {
            const signerBlockHeight = signersHeight + 60; // Including margin-top

            if (currentHeight + signerBlockHeight > availableHeight && currentPageNodes.length > 0) {
                // Push current content to a page, signers will be on next
                newPages.push(currentPageNodes);
                currentPageNodes = [];
            }
        }

        // Push the last page (may be empty if signers are on their own page, but they render via isLastPage)
        newPages.push(currentPageNodes);

        // Ensure at least one page
        if (newPages.length === 0) {
            newPages.push([]);
        }

        setPages(newPages);
    };

    return (
        <>
            {/* Ghost Container for Measurements (Hidden) - OUTSIDE zoom transform */}
            <div
                ref={ghostRef}
                style={{
                    position: 'absolute',
                    top: -9999,
                    left: -9999,
                    width: `${PAGE_WIDTH_MM}mm`,
                    paddingLeft: `${margins.left}mm`,
                    paddingRight: `${margins.right}mm`,
                    boxSizing: 'border-box',
                    visibility: 'hidden',
                    transform: 'none', // Ensure no transform affects measurements
                }}
                className="font-serif text-[12pt] leading-normal no-print"
            >
                {/* Replicate exact styling of components for accurate measure */}

                {/* Header */}
                <div className="ghost-header text-center mb-8 border-b-2 border-black pb-4 relative min-h-[100px] flex items-center justify-center">
                    {doc.logo_url && <img src={doc.logo_url} className="h-24 w-auto" />}
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-[14pt] mb-1">{doc.headerTitle}</h1>
                        <h2 className="font-bold text-[16pt] mb-1 whitespace-pre-line">{doc.headerOrgName}</h2>
                        {doc.senderUnit && <p className="text-[11pt] whitespace-pre-line">{doc.senderUnit}</p>}
                    </div>
                    {doc.right_logo_url && <img src={doc.right_logo_url} className="h-24 w-auto" />}
                </div>

                {/* Meta */}
                <div className="ghost-meta flex justify-between items-start mb-8 text-[11pt]">
                    <div className="space-y-1">
                        {doc.decisionNumber && <p><span className="font-bold">Karar No:</span> {doc.decisionNumber}</p>}
                        <p><span className="font-bold">Konu:</span> {doc.subject}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p><span className="font-bold">Tarih:</span> {new Date(doc.date).toLocaleDateString('tr-TR')}</p>
                        <p><span className="font-bold">Sayı:</span> {doc.document_number || '----------'}</p>
                    </div>
                </div>

                {/* Receiver */}
                <div className="ghost-receiver mb-8 font-bold text-[12pt] uppercase">
                    <p>{doc.receiver}</p>
                </div>

                {/* Content */}
                <div
                    className="ghost-content mb-12"
                    style={{ textAlign: doc.textAlign as any, whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: formattedContent }} // This puts all p tags as children
                />

                {/* Signers */}
                <div className="ghost-signers mt-12 flex justify-end gap-8 flex-wrap">
                    {/* Dummy content to measure height */}
                    <div className="h-[50mm] w-[150px]"></div>
                </div>

                {/* Footer */}
                {doc.showFooter !== false && (
                    <div
                        className="ghost-footer absolute border-t border-[#cbd5e1] pt-2 text-[8pt] text-[#64748b] flex justify-between"
                        style={{
                            bottom: `${margins.bottom}mm`,
                            left: `${margins.left}mm`,
                            right: `${margins.right}mm`
                        }}
                    >
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

            {/* Actual Pages Rendering - with zoom transform */}
            <div className="flex flex-col gap-8 print-pages-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                {pages.map((pageContent: React.ReactNode[], pageIndex: number) => {
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === pages.length - 1;

                    return (
                        <div
                            key={pageIndex}
                            style={{
                                backgroundColor: 'white',
                                color: 'black',
                                paddingTop: `${margins.top}mm`,
                                paddingBottom: `${margins.bottom}mm`,
                                paddingLeft: `${margins.left}mm`,
                                paddingRight: `${margins.right}mm`,
                                height: `${PAGE_HEIGHT_MM}mm`,
                                width: `${PAGE_WIDTH_MM}mm`,
                                overflow: 'hidden'
                            }}
                            className="shadow-[0_4px_24px_rgba(0,0,0,0.1)] text-[12pt] font-serif leading-normal relative printable-content mx-auto"
                        >
                            {/* Header (On All Pages) */}
                            {doc.showHeader !== false && (
                                <div className="text-center mb-8 border-b-2 border-black pb-4 relative min-h-[100px] flex items-center justify-center">
                                    {doc.logo_url && (
                                        <img src={doc.logo_url} alt="Sol Logo" className="absolute left-0 top-0 h-24 w-auto object-contain" />
                                    )}
                                    <div className="flex flex-col items-center">
                                        <h1 className="font-bold text-[14pt] mb-1">{doc.headerTitle}</h1>
                                        <h2 className="font-bold text-[16pt] mb-1 whitespace-pre-line">{doc.headerOrgName}</h2>
                                        {doc.senderUnit && <p className="text-[11pt] whitespace-pre-line">{doc.senderUnit}</p>}
                                    </div>
                                    {doc.right_logo_url && (
                                        <img src={doc.right_logo_url} alt="Sağ Logo" className="absolute right-0 top-0 h-24 w-auto object-contain" />
                                    )}
                                </div>
                            )}

                            {/* Page 1 Specifics: Meta, Receiver */}
                            {isFirstPage && (
                                <>
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
                                </>
                            )}

                            {/* Main (Split) Content */}
                            <div
                                style={{ textAlign: doc.textAlign as any, whiteSpace: 'pre-wrap' }}
                                className={isLastPage && !doc.showSignatures && !doc.signers?.length ? "mb-0" : "mb-4"}
                            >
                                {pageContent}
                            </div>

                            {/* Signers (Only on Last Page) */}
                            {isLastPage && doc.showSignatures !== false && doc.signers && doc.signers.length > 0 && (
                                <div className="mt-12 flex justify-end gap-8 flex-wrap">
                                    {doc.signers.map((signer: any, index: number) => (
                                        <div key={index} className="text-center min-w-[150px]">
                                            <p className="font-bold whitespace-nowrap">{signer.name}</p>
                                            <p className="text-[10pt] mb-0 leading-none">{signer.title}</p>
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

                            {/* Footer (On All Pages) */}
                            {doc.showFooter !== false && (
                                <div
                                    className="absolute border-t border-[#cbd5e1] pt-2 text-[8pt] text-[#64748b] flex justify-between"
                                    style={{
                                        bottom: `${margins.bottom}mm`,
                                        left: `${margins.left}mm`,
                                        right: `${margins.right}mm`
                                    }}
                                >
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
                })}
            </div>
        </>
    );
}

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(A4PreviewComponent);
