import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { Member } from './types';

export const exportToExcel = (data: Member[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(formatDataForExport(data));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Üyeler');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(dataBlob, `${fileName}.xlsx`);
};

export const exportToCSV = (data: Member[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(formatDataForExport(data));
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const dataBlob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8' });
    saveAs(dataBlob, `${fileName}.csv`);
};

export const exportToPDF = (data: Member[], fileName: string) => {
    const doc = new jsPDF();

    // Add a simple title
    doc.setFontSize(18);
    doc.text('Üye Listesi', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('tr-TR');
    doc.text(`Oluşturulma Tarihi: ${dateStr}`, 14, 30);

    const tableData = formatDataForPDF(data);

    // AutoTable
    autoTable(doc, {
        head: [['Üye No', 'TC Kimlik', 'Ad', 'Soyad', 'İl / İlçe', 'Durum', 'Telefon']],
        body: tableData,
        startY: 35,
        styles: {
            font: 'helvetica', // Standard font, might struggle with some TR chars without custom font
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
    });

    doc.save(`${fileName}.pdf`);
};

const formatDataForExport = (data: Member[]) => {
    return data.map(member => ({
        'Üye No': member.membership_number,
        'TC Kimlik': member.tc_identity,
        'Ad': member.first_name,
        'Soyad': member.last_name,
        'Cinsiyet': member.gender,
        'Baba Adı': member.father_name,
        'Ana Adı': member.mother_name,
        'Doğum Yeri': member.birth_place,
        'Doğum Tarihi': member.birth_date ? new Date(member.birth_date).toLocaleDateString('tr-TR') : '',
        'Kan Grubu': member.blood_group,
        'Eğitim': member.education_level,
        'Medeni Durum': member.marital_status,
        'İl': member.city,
        'İlçe': member.district,
        'Adres': member.address,
        'Telefon': member.phone,
        'E-posta': member.email,
        'İş Yeri': member.workplace,
        'Kurum': member.institution,
        'Kadro': member.position,
        'Kurum Sicil': member.institution_register_number,
        'Emekli Sicil': member.retirement_register_number,
        'Üyelik Durumu': member.membership_status === 'active' ? 'Aktif' : member.membership_status === 'pending' ? 'Beklemede' : 'Pasif',
        'Aidat Durumu': member.due_status === 'paid' ? 'Ödendi' : 'Ödenmedi',
        'Üyelik Başlangıç': member.membership_start_date ? new Date(member.membership_start_date).toLocaleDateString('tr-TR') : '',
        'Üyelik Bitiş': member.membership_end_date ? new Date(member.membership_end_date).toLocaleDateString('tr-TR') : '',
    }));
};

const formatDataForPDF = (data: Member[]) => {
    return data.map(member => [
        member.membership_number || '-',
        member.tc_identity,
        member.first_name,
        member.last_name,
        `${member.city} / ${member.district}`,
        member.membership_status === 'active' ? 'Aktif' : member.membership_status === 'pending' ? 'Beklemede' : 'Pasif',
        member.phone
    ]);
};
