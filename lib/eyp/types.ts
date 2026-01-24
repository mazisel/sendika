export interface EYPPackageConfig {
    ustYaziPdf: Blob | ArrayBuffer;
    ustVeri: UstVeri;
    belgeHedef: BelgeHedef;
    imza?: ArrayBuffer; // CAdES signature content
    attachments?: EYPAttachment[];
}

export interface EYPAttachment {
    fileName: string;
    content: Blob | ArrayBuffer;
    mimeType: string;
}

// Ustveri.xml structure (Simplified mapping)
export interface UstVeri {
    senaryo: 'e-Yazışma Paketi';
    bellesikDosya: {
        dosyaAdi: string; // e.g. "UstYazi.pdf"
        dosyaImzaliAdi?: string;
        mimeTuru: 'application/pdf';
        boyut: number;
        ozet: {
            algoritma: 'SHA-256';
            deger: string; // Hash of the file
        };
    };
    ustveriDili: 'TR';
    belgeNo: string;
    tarih: string; // ISO format or Specific format
    konu: string;
    gonderen: EntityInfo;
    alici: EntityInfo[];
    dagitim?: {
        geregi: EntityInfo[];
        bilgi: EntityInfo[];
    };
    ilgililer?: string[];
}

export interface BelgeHedef {
    hedefler: HedefInfo[];
}

export interface HedefInfo {
    hedef: string; // URI or Name
    amac?: string;
}

export interface EntityInfo {
    id: string; // VKN or TCKN
    adi: string; // Kurum adı or Kişi adı
    rol?: string; // e.g. "Gonderen"
}
