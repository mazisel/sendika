import JSZip from 'jszip';
import { EYPPackageConfig } from './types';
import {
    generateUstVeriXml,
    generateBelgeHedefXml,
    generateContentTypesXml,
    generateRootRelsXml,
    generatePaketOzetiXml,
    generatePaketOzetiRelsXml,
    generateCorePropertiesXml,
    generateBelgeImzaXml,
    generateNihaiOzetXml,
    PaketOzetiConfig,
    NihaiOzetConfig
} from './xml-templates';

// String'i UTF-8 Uint8Array'e çevir (BOM dahil)
function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

// SHA-256 hash hesaplama - Base64 formatında döner
async function calculateSHA256Base64(data: Uint8Array | ArrayBuffer | Blob): Promise<string> {
    let buffer: ArrayBuffer;

    if (data instanceof Uint8Array) {
        buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    } else if (data instanceof Blob) {
        buffer = await data.arrayBuffer();
    } else {
        buffer = data;
    }

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const bytes = new Uint8Array(hashBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } else {
        // Fallback for non-secure contexts (development only)
        console.warn('crypto.subtle not available, using fallback');
        const bytes = new Uint8Array(buffer);
        let hash = 0x811c9dc5;
        for (let i = 0; i < bytes.length; i++) {
            hash ^= bytes[i];
            hash = Math.imul(hash, 0x01000193);
        }
        // Generate a pseudo-base64 hash (NOT secure - dev only)
        return btoa(String(hash).padStart(32, '0'));
    }
}

// UUID v4 oluştur
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().toUpperCase();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}

export class EYPBuilder {
    static async buildPackage(config: EYPPackageConfig): Promise<Blob> {
        console.log('[EYPBuilder] Starting build...');
        const zip = new JSZip();
        const paketId = generateUUID();
        const corePropsId = generateUUID().toLowerCase().replace(/-/g, '');
        console.log('[EYPBuilder] IDs generated:', { paketId, corePropsId });

        // PDF dosya adı
        const pdfFileName = config.ustYaziFileName ||
            `${config.ustVeri.belgeNo.replace(/[\/\\]/g, '-')}-${Date.now()}.pdf`;

        // Güncel tarih
        const now = new Date().toISOString();
        const tarihForImza = config.ustVeri.tarih + 'T00:00:00Z';

        // PDF'i ArrayBuffer olarak al
        const pdfBuffer = config.ustYaziPdf instanceof Blob
            ? await config.ustYaziPdf.arrayBuffer()
            : config.ustYaziPdf;
        const pdfBytes = new Uint8Array(pdfBuffer);

        // 1. XML içerikleri oluştur ve byte'lara çevir
        const updatedUstVeri = {
            ...config.ustVeri,
            belgeId: paketId,
            bellesikDosya: {
                ...config.ustVeri.bellesikDosya,
                dosyaAdi: pdfFileName
            }
        };

        const ustVeriXml = generateUstVeriXml(updatedUstVeri);
        const ustVeriBytes = stringToBytes(ustVeriXml);

        const belgeHedefXml = generateBelgeHedefXml(config.belgeHedef);
        const belgeHedefBytes = stringToBytes(belgeHedefXml);

        // BelgeImza.xml - Çoklu imzacı desteği
        // imzaBilgileri (çoklu) veya imzaBilgisi (tekli) kullan
        let imzalayanlar = config.imzaBilgileri || [];
        if (imzalayanlar.length === 0 && config.imzaBilgisi) {
            // Backward compatibility: tek imzacı varsa diziye çevir
            imzalayanlar = [config.imzaBilgisi];
        }
        if (imzalayanlar.length === 0) {
            // Varsayılan imzacı
            imzalayanlar = [{
                ilkAdi: 'Yetkili',
                soyadi: 'Kullanıcı',
                unvan: 'Yetkili',
                makam: 'Yetkili'
            }];
        }

        const belgeImzaXml = generateBelgeImzaXml({
            imzalayanlar,
            tarih: tarihForImza
        });
        const belgeImzaBytes = stringToBytes(belgeImzaXml);

        // Core properties
        const corePropsXml = generateCorePropertiesXml({
            identifier: paketId,
            created: now,
            creator: config.ustVeri.gonderen.adi,
            subject: config.ustVeri.konu
        });
        const corePropsBytes = stringToBytes(corePropsXml);

        // 2. Hash'leri hesapla - AYNI BYTE'lar üzerinden
        const pdfHash = await calculateSHA256Base64(pdfBytes);
        const ustVeriHash = await calculateSHA256Base64(ustVeriBytes);
        const belgeHedefHash = await calculateSHA256Base64(belgeHedefBytes);
        const belgeImzaHash = await calculateSHA256Base64(belgeImzaBytes);
        const corePropsHash = await calculateSHA256Base64(corePropsBytes);

        console.log('[EYPBuilder] Hashes calculated:', {
            pdfHash: pdfHash.substring(0, 20) + '...',
            ustVeriHash: ustVeriHash.substring(0, 20) + '...',
            belgeHedefHash: belgeHedefHash.substring(0, 20) + '...'
        });

        // 3. PaketOzeti.xml oluştur
        const paketOzetiConfig: PaketOzetiConfig = {
            paketId,
            references: [
                { uri: '/BelgeHedef/BelgeHedef.xml', digestValue: belgeHedefHash },
                { uri: `/UstYazi/${pdfFileName}`, digestValue: pdfHash },
                { uri: '/Ustveri/Ustveri.xml', digestValue: ustVeriHash }
            ]
        };
        const paketOzetiXml = generatePaketOzetiXml(paketOzetiConfig);
        const paketOzetiBytes = stringToBytes(paketOzetiXml);
        const paketOzetiHash = await calculateSHA256Base64(paketOzetiBytes);

        // 4. İmza hash'i (varsa)
        let imzaHash = '';
        let imzaBytes: Uint8Array | null = null;
        if (config.imza) {
            if (config.imza instanceof Blob) {
                const buf = await config.imza.arrayBuffer();
                imzaBytes = new Uint8Array(buf);
            } else if (config.imza instanceof ArrayBuffer) {
                imzaBytes = new Uint8Array(config.imza);
            } else if (typeof config.imza === 'string') {
                imzaBytes = stringToBytes(config.imza);
            }
            if (imzaBytes) {
                imzaHash = await calculateSHA256Base64(imzaBytes);
            }
        }

        // 5. NihaiOzet.xml oluştur
        const nihaiOzetRefs: NihaiOzetConfig['references'] = [
            { uri: '/BelgeHedef/BelgeHedef.xml', digestValue: belgeHedefHash },
            { uri: '/Imzalar/BelgeImza.xml', digestValue: belgeImzaHash },
            { uri: `/UstYazi/${pdfFileName}`, digestValue: pdfHash },
            { uri: '/Ustveri/Ustveri.xml', digestValue: ustVeriHash },
            { uri: '/PaketOzeti/PaketOzeti.xml', digestValue: paketOzetiHash },
        ];

        if (imzaBytes && imzaHash) {
            nihaiOzetRefs.push({ uri: '/Imzalar/ImzaCades.imz', digestValue: imzaHash });
        }

        nihaiOzetRefs.push({
            uri: `/package/services/metadata/core-properties/${corePropsId}.psmdcp`,
            digestValue: corePropsHash
        });

        const nihaiOzetXml = generateNihaiOzetXml({
            paketId,
            references: nihaiOzetRefs
        });
        const nihaiOzetBytes = stringToBytes(nihaiOzetXml);

        // 6. Diğer XML'leri byte'lara çevir
        const contentTypesBytes = stringToBytes(generateContentTypesXml());
        const rootRelsBytes = stringToBytes(generateRootRelsXml({
            ustYaziFileName: pdfFileName,
            corePropsId
        }));
        const paketOzetiRelsBytes = stringToBytes(generatePaketOzetiRelsXml());

        // 7. ZIP dosyalarını oluştur - HEPSİ UINT8ARRAY OLARAK

        // [Content_Types].xml
        zip.file('[Content_Types].xml', contentTypesBytes);

        // _rels/.rels
        zip.file('_rels/.rels', rootRelsBytes);

        // package/services/metadata/core-properties/{uuid}.psmdcp
        zip.file(`package/services/metadata/core-properties/${corePropsId}.psmdcp`, corePropsBytes);

        // UstYazi/{dosyaAdi}.pdf
        zip.file(`UstYazi/${pdfFileName}`, pdfBytes);

        // Ustveri/Ustveri.xml
        zip.file('Ustveri/Ustveri.xml', ustVeriBytes);

        // BelgeHedef/BelgeHedef.xml
        zip.file('BelgeHedef/BelgeHedef.xml', belgeHedefBytes);

        // PaketOzeti/PaketOzeti.xml
        zip.file('PaketOzeti/PaketOzeti.xml', paketOzetiBytes);

        // PaketOzeti/_rels/PaketOzeti.xml.rels (imza varsa)
        if (imzaBytes) {
            zip.file('PaketOzeti/_rels/PaketOzeti.xml.rels', paketOzetiRelsBytes);
        }

        // Imzalar/BelgeImza.xml ve ImzaCades.imz
        zip.file('Imzalar/BelgeImza.xml', belgeImzaBytes);
        if (imzaBytes) {
            zip.file('Imzalar/ImzaCades.imz', imzaBytes);
        }

        // NihaiOzet/NihaiOzet.xml
        zip.file('NihaiOzet/NihaiOzet.xml', nihaiOzetBytes);

        // Ekler (Optional)
        if (config.attachments && config.attachments.length > 0) {
            for (const att of config.attachments) {
                let attBytes: Uint8Array;
                if (att.content instanceof Blob) {
                    const buf = await att.content.arrayBuffer();
                    attBytes = new Uint8Array(buf);
                } else if (att.content instanceof ArrayBuffer) {
                    attBytes = new Uint8Array(att.content);
                } else if (typeof att.content === 'string') {
                    attBytes = stringToBytes(att.content);
                } else {
                    attBytes = att.content;
                }
                zip.file(`Ekler/${att.fileName}`, attBytes);
            }
        }

        // Generate Blob
        console.log('[EYPBuilder] Generating ZIP blob...');
        const blob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/octet-stream',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        console.log('[EYPBuilder] ZIP generated, size:', blob.size);
        return blob;
    }

    // PaketOzeti.xml'in hash'ini al (imzalama için)
    static async getPaketOzetiForSigning(config: EYPPackageConfig): Promise<{ xml: string; hash: string }> {
        const paketId = generateUUID();
        const pdfFileName = config.ustYaziFileName ||
            `${config.ustVeri.belgeNo.replace(/[\/\\]/g, '-')}-${Date.now()}.pdf`;

        // PDF'i ArrayBuffer olarak al
        const pdfBuffer = config.ustYaziPdf instanceof Blob
            ? await config.ustYaziPdf.arrayBuffer()
            : config.ustYaziPdf;
        const pdfBytes = new Uint8Array(pdfBuffer);

        const updatedUstVeri = {
            ...config.ustVeri,
            belgeId: paketId,
            bellesikDosya: {
                ...config.ustVeri.bellesikDosya,
                dosyaAdi: pdfFileName
            }
        };

        const ustVeriXml = generateUstVeriXml(updatedUstVeri);
        const ustVeriBytes = stringToBytes(ustVeriXml);

        const belgeHedefXml = generateBelgeHedefXml(config.belgeHedef);
        const belgeHedefBytes = stringToBytes(belgeHedefXml);

        const pdfHash = await calculateSHA256Base64(pdfBytes);
        const ustVeriHash = await calculateSHA256Base64(ustVeriBytes);
        const belgeHedefHash = await calculateSHA256Base64(belgeHedefBytes);

        const paketOzetiConfig: PaketOzetiConfig = {
            paketId,
            references: [
                { uri: '/BelgeHedef/BelgeHedef.xml', digestValue: belgeHedefHash },
                { uri: `/UstYazi/${pdfFileName}`, digestValue: pdfHash },
                { uri: '/Ustveri/Ustveri.xml', digestValue: ustVeriHash }
            ]
        };

        const xml = generatePaketOzetiXml(paketOzetiConfig);
        const xmlBytes = stringToBytes(xml);
        const hash = await calculateSHA256Base64(xmlBytes);

        return { xml, hash };
    }
}
