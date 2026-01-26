export interface EYPPackageConfig {
    ustYaziPdf: Blob | ArrayBuffer;
    ustYaziFileName?: string; // Custom filename for the PDF
    ustVeri: UstVeri;
    belgeHedef: BelgeHedef;
    imza?: ArrayBuffer; // CAdES signature content
    imzaBilgileri?: ImzaBilgisi[]; // Multiple signers support
    imzaBilgisi?: ImzaBilgisi; // Single signer (backward compatibility)
    attachments?: EYPAttachment[];
}

export interface EYPAttachment {
    fileName: string;
    content: Blob | ArrayBuffer;
    mimeType: string;
}

export interface ImzaBilgisi {
    ilkAdi: string;
    soyadi: string;
    unvan: string;
    makam: string;
}

// Çoklu imzacı için
export type ImzaBilgileri = ImzaBilgisi[];

// Ustveri.xml structure
export interface UstVeri {
    senaryo: 'e-Yazışma Paketi';
    belgeId?: string; // GUID - auto-generated if not provided
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
    tarih: string; // ISO format YYYY-MM-DD
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
    hedef: string; // Kurum adı
    kkk?: string; // Kurum Kayıt Kodu
    amac?: string;
}

export interface EntityInfo {
    id: string; // VKN, TCKN, MERSIS or KKK
    adi: string; // Kurum adı or Kişi adı
    rol?: string; // e.g. "Gonderen"
}
