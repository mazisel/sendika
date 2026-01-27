import jsPDF from 'jspdf';
import { DMDocument } from '@/lib/types/document-management';
import { stripInlineFormatting } from '@/lib/utils/documentFormatting';

export const generateDocumentPDF = async (doc: DMDocument): Promise<Blob> => {
    // Create new PDF document (A4 size, units in mm)
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Font settings - assuming standard fonts for now
    // For Turkish characters, we might need a custom font, but jsPDF standard fonts support basic Latin.
    // Ideally, add a font that supports Turkish characters properly.
    // For this implementation, we use standard Helvetica/Times.

    const margin = 20;
    let yPos = margin;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(220, 38, 38); // Red color for T.C.
    pdf.text('T.C.', 105, yPos, { align: 'center' });
    yPos += 7;

    pdf.setTextColor(0, 0, 0); // Black
    pdf.setFontSize(14);
    pdf.text('SENDİKA YÖNETİM SİSTEMİ', 105, yPos, { align: 'center' });
    yPos += 6;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Genel Merkez Yönetim Kurulu', 105, yPos, { align: 'center' });

    // Line separator
    yPos += 5;
    pdf.setDrawColor(220, 38, 38);
    pdf.line(margin, yPos, 210 - margin, yPos);

    // Metadata (Sayı, Konu, Tarih)
    yPos += 15;
    pdf.setFontSize(11);

    // Sayı
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sayı:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.document_number, margin + 15, yPos);

    // Tarih (Right aligned)
    const dateStr = new Date(doc.reference_date).toLocaleDateString('tr-TR');
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tarih:', 160, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dateStr, 175, yPos);

    yPos += 7;
    // Konu
    pdf.setFont('helvetica', 'bold');
    pdf.text('Konu:', margin, yPos);
    pdf.setFont('helvetica', 'normal');
    // Handle text wrapping for Subject if long
    const subjectLines = pdf.splitTextToSize(doc.subject, 100);
    pdf.text(subjectLines, margin + 15, yPos);
    yPos += (subjectLines.length * 6) + 10;

    // Receiver
    if (doc.receiver) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Sayın:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(doc.receiver, margin + 15, yPos);
        yPos += 15;
    }

    // Body Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    // Basic text wrapping for description
    // Note: HTML/Rich text requires html2canvas or advanced parsing. 
    // Assuming plain text or simple content for now.
    const content = stripInlineFormatting(doc.description || '');
    const splitContent = pdf.splitTextToSize(content, 170); // 210 - 2*margin
    pdf.text(splitContent, margin, yPos);

    // Signature Area
    // Calculate position for footer
    const pageHeight = 297;
    let signY = pageHeight - 50;

    // Check if content pushes signature down
    const contentHeight = splitContent.length * 6;
    if (yPos + contentHeight > signY) {
        pdf.addPage();
        signY = margin;
    }

    if (doc.sender) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(doc.sender, 160, signY, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.text('İmza', 160, signY + 5, { align: 'center' });
    }

    return pdf.output('blob');
};
