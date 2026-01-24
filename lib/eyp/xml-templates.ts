import { UstVeri, BelgeHedef } from './types';

export const generateUstVeriXml = (data: UstVeri): string => {
    // This is a simplified XML generator. For production, consider using a proper XML builder.
    // Conforming to EYP 2.0 standards (Conceptual)

    const sender = data.gonderen;
    const receiver = data.alici[0]; // Assuming primary receiver for simplicity

    return `<?xml version="1.0" encoding="UTF-8"?>
<ustveri:Ustveri xmlns:ustveri="http://www.tccb.gov.tr/eyazisma/1.0/ustveri">
    <ustveri:BellesikDosya>
        <ustveri:DosyaAdi>${data.bellesikDosya.dosyaAdi}</ustveri:DosyaAdi>
        <ustveri:MimeTuru>${data.bellesikDosya.mimeTuru}</ustveri:MimeTuru>
        <ustveri:Boyut>${data.bellesikDosya.boyut}</ustveri:Boyut>
        <ustveri:Ozet algoritma="${data.bellesikDosya.ozet.algoritma}">${data.bellesikDosya.ozet.deger}</ustveri:Ozet>
    </ustveri:BellesikDosya>
    <ustveri:BelgeId>${data.belgeNo}</ustveri:BelgeId>
    <ustveri:Konu>${encodeXml(data.konu)}</ustveri:Konu>
    <ustveri:Tarih>${data.tarih}</ustveri:Tarih>
    <ustveri:Gonderen>
        <ustveri:Id>${sender.id}</ustveri:Id>
        <ustveri:Adi>${encodeXml(sender.adi)}</ustveri:Adi>
    </ustveri:Gonderen>
    <ustveri:Alicilar>
        ${data.alici.map(a => `
        <ustveri:Alici>
            <ustveri:Id>${a.id}</ustveri:Id>
            <ustveri:Adi>${encodeXml(a.adi)}</ustveri:Adi>
        </ustveri:Alici>`).join('')}
    </ustveri:Alicilar>
</ustveri:Ustveri>`;
};

export const generateBelgeHedefXml = (data: BelgeHedef): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<belgehedef:BelgeHedef xmlns:belgehedef="http://www.tccb.gov.tr/eyazisma/1.0/belgehedef">
    ${data.hedefler.map(h => `
    <belgehedef:Hedef>
        <belgehedef:URI>${encodeXml(h.hedef)}</belgehedef:URI>
        <belgehedef:Amac>${encodeXml(h.amac || 'Gereği')}</belgehedef:Amac>
    </belgehedef:Hedef>`).join('')}
</belgehedef:BelgeHedef>`;
};

// OPC [Content_Types].xml
export const generateContentTypesXml = (): string => {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="pdf" ContentType="application/pdf"/>
    <Default Extension="imz" ContentType="application/pkcs7-signature"/>
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Override PartName="/Ustveri/Ustveri.xml" ContentType="application/xml"/>
    <Override PartName="/BelgeHedef/BelgeHedef.xml" ContentType="application/xml"/>
</Types>`;
};

// OPC _rels/.rels
export const generateRootRelsXml = (): string => {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://www.tccb.gov.tr/eyazisma/iliskiler/ustveri" Target="/Ustveri/Ustveri.xml"/>
    <Relationship Id="rId2" Type="http://www.tccb.gov.tr/eyazisma/iliskiler/belgehedef" Target="/BelgeHedef/BelgeHedef.xml"/>
    <Relationship Id="rId3" Type="http://www.tccb.gov.tr/eyazisma/iliskiler/ustyazi" Target="/UstYazi/UstYazi.pdf"/>
</Relationships>`;
};

function encodeXml(s: string): string {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
