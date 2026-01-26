import { UstVeri, BelgeHedef } from './types';

// UTF-8 BOM - İmzager ve diğer .NET uygulamaları için gerekli
const BOM = '\uFEFF';

export interface PaketOzetiConfig {
    paketId: string;
    references: {
        uri: string;
        digestValue: string;
    }[];
}

export interface NihaiOzetConfig {
    paketId: string;
    references: {
        uri: string;
        digestValue: string;
    }[];
}

export interface CorePropertiesConfig {
    identifier: string;
    created: string;
    creator: string;
    subject: string;
}

export interface ImzalayanBilgisi {
    ilkAdi: string;
    soyadi: string;
    unvan: string;
    makam: string;
}

export interface BelgeImzaConfig {
    imzalayanlar: ImzalayanBilgisi[];
    tarih: string;
}

// PaketOzeti.xml - EYP 1.3 standardı
export const generatePaketOzetiXml = (config: PaketOzetiConfig): string => {
    const references = config.references.map(ref => `
  <Reference URI="${ref.uri}" Type="http://eyazisma.dpt/bilesen#dahili">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>${ref.digestValue}</DigestValue>
  </Reference>`).join('');

    return `${BOM}<?xml version="1.0" encoding="utf-8"?>
<PaketOzeti xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Id="${config.paketId}" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">${references}
</PaketOzeti>`;
};

// NihaiOzet.xml - Tüm dosyaların hash'lerini içerir
export const generateNihaiOzetXml = (config: NihaiOzetConfig): string => {
    const references = config.references.map(ref => `
  <Reference URI="${ref.uri}" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>${ref.digestValue}</DigestValue>
  </Reference>`).join('');

    return `${BOM}<?xml version="1.0" encoding="utf-8"?>
<NihaiOzet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Id="${config.paketId}" xmlns="urn:dpt:eyazisma:schema:xsd:NihaiOzet-1">${references}
</NihaiOzet>`;
};

// Ustveri.xml - EYP 1.3 standardı
export const generateUstVeriXml = (data: UstVeri): string => {
    const sender = data.gonderen;
    const dagitimListesi = data.alici.map(a => `
    <tipler:Dagitim>
      <tipler:KurumKurulus>
        <tipler:KKK>${a.id}</tipler:KKK>
        <tipler:Adi languageID="TR">${encodeXml(a.adi)}</tipler:Adi>
        <tipler:IletisimBilgisi>
          <tipler:Telefon></tipler:Telefon>
          <tipler:EPosta></tipler:EPosta>
          <tipler:Adres languageID="TR"></tipler:Adres>
          <tipler:Il languageID="TR"></tipler:Il>
          <tipler:Ilce languageID="TR"></tipler:Ilce>
          <tipler:Ulke languageID="TR">Türkiye</tipler:Ulke>
        </tipler:IletisimBilgisi>
      </tipler:KurumKurulus>
      <tipler:Ivedilik>NRM</tipler:Ivedilik>
      <tipler:DagitimTuru>GRG</tipler:DagitimTuru>
      <tipler:Miat>PT0S</tipler:Miat>
    </tipler:Dagitim>`).join('');

    return `${BOM}<?xml version="1.0" encoding="utf-8"?>
<Ustveri xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:Ustveri-1">
  <tipler:BelgeId>${data.belgeId || generateGUID()}</tipler:BelgeId>
  <tipler:Konu languageID="TR">${encodeXml(data.konu)}</tipler:Konu>
  <tipler:Tarih>${data.tarih}T00:00:00Z</tipler:Tarih>
  <tipler:BelgeNo>${encodeXml(data.belgeNo)}</tipler:BelgeNo>
  <tipler:GuvenlikKodu>TSD</tipler:GuvenlikKodu>
  <tipler:MimeTuru>application/pdf</tipler:MimeTuru>
  <tipler:OzId schemeID="GUID">${generateGUID()}</tipler:OzId>
  <tipler:DagitimListesi>${dagitimListesi}
  </tipler:DagitimListesi>
  <tipler:Dil>tur</tipler:Dil>
  <tipler:Olusturan>
    <tipler:TuzelSahis>
      <tipler:Id schemeID="MERSIS">${sender.id}</tipler:Id>
      <tipler:Adi languageID="TR">${encodeXml(sender.adi)}</tipler:Adi>
    </tipler:TuzelSahis>
  </tipler:Olusturan>
  <tipler:DosyaAdi>${encodeXml(data.bellesikDosya.dosyaAdi)}</tipler:DosyaAdi>
</Ustveri>`;
};

// BelgeHedef.xml - EYP 1.3 standardı  
export const generateBelgeHedefXml = (data: BelgeHedef): string => {
    const hedefler = data.hedefler.map(h => `
    <tipler:Hedef>
      <tipler:KurumKurulus>
        <tipler:KKK>${h.kkk || '00000000'}</tipler:KKK>
        <tipler:Adi languageID="TR">${encodeXml(h.hedef)}</tipler:Adi>
        <tipler:IletisimBilgisi>
          <tipler:Telefon></tipler:Telefon>
          <tipler:EPosta></tipler:EPosta>
          <tipler:Adres languageID="TR"></tipler:Adres>
          <tipler:Il languageID="TR"></tipler:Il>
          <tipler:Ilce languageID="TR"></tipler:Ilce>
          <tipler:Ulke languageID="TR">Türkiye</tipler:Ulke>
        </tipler:IletisimBilgisi>
      </tipler:KurumKurulus>
    </tipler:Hedef>`).join('');

    return `${BOM}<?xml version="1.0" encoding="utf-8"?>
<BelgeHedef xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:BelgeHedef-1">
  <tipler:HedefListesi>${hedefler}
  </tipler:HedefListesi>
</BelgeHedef>`;
};

// BelgeImza.xml - İmzalayan bilgileri (çoklu imzacı destekli)
export const generateBelgeImzaXml = (config: BelgeImzaConfig): string => {
    const imzaListesi = config.imzalayanlar.map(imzalayan => `
    <tipler:Imza>
      <tipler:Imzalayan>
        <tipler:Kisi>
          <tipler:IlkAdi>${encodeXml(imzalayan.ilkAdi)}</tipler:IlkAdi>
          <tipler:Soyadi>${encodeXml(imzalayan.soyadi)}</tipler:Soyadi>
          <tipler:Unvan>${encodeXml(imzalayan.unvan)}</tipler:Unvan>
        </tipler:Kisi>
      </tipler:Imzalayan>
      <tipler:Makam>${encodeXml(imzalayan.makam)}</tipler:Makam>
      <tipler:Amac languageID="TR">İmzalama</tipler:Amac>
      <tipler:Tarih>${config.tarih}</tipler:Tarih>
    </tipler:Imza>`).join('');

    return `${BOM}<?xml version="1.0" encoding="utf-8"?>
<BelgeImza xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:BelgeImza-1">
  <tipler:ImzaListesi>${imzaListesi}
  </tipler:ImzaListesi>
</BelgeImza>`;
};

// OPC [Content_Types].xml
export const generateContentTypesXml = (): string => {
    return `${BOM}<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="pdf" ContentType="application/pdf" /><Default Extension="psmdcp" ContentType="application/vnd.openxmlformats-package.core-properties+xml" /><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Default Extension="xml" ContentType="application/xml" /><Default Extension="imz" ContentType="application/octet-stream" /></Types>`;
};

// OPC _rels/.rels
export const generateRootRelsXml = (config: {
    ustYaziFileName: string;
    corePropsId: string;
}): string => {
    return `${BOM}<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://eyazisma.dpt/iliskiler/ustyazi" Target="/UstYazi/${config.ustYaziFileName}" Id="IdUstYazi" /><Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="/package/services/metadata/core-properties/${config.corePropsId}.psmdcp" Id="R${config.corePropsId.substring(0, 16)}" /><Relationship Type="http://eyazisma.dpt/iliskiler/belgehedef" Target="/BelgeHedef/BelgeHedef.xml" Id="IdBelgeHedef" /><Relationship Type="http://eyazisma.dpt/iliskiler/ustveri" Target="/Ustveri/Ustveri.xml" Id="IdUstveri" /><Relationship Type="http://eyazisma.dpt/iliskiler/paketozeti" Target="/PaketOzeti/PaketOzeti.xml" Id="IdPaketOzeti" /><Relationship Type="http://eyazisma.dpt/iliskiler/belgeimza" Target="/Imzalar/BelgeImza.xml" Id="IdBelgeImza" /><Relationship Type="http://eyazisma.dpt/iliskiler/nihaiozet" Target="/NihaiOzet/NihaiOzet.xml" Id="IdNihaiOzet" /></Relationships>`;
};

// PaketOzeti/_rels/PaketOzeti.xml.rels - İmza ilişkisi
export const generatePaketOzetiRelsXml = (): string => {
    return `${BOM}<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://eyazisma.dpt/iliskiler/imzacades" Target="../Imzalar/ImzaCades.imz" Id="IdImzaCades" /></Relationships>`;
};

// Core Properties (.psmdcp)
export const generateCorePropertiesXml = (config: CorePropertiesConfig): string => {
    return `${BOM}<?xml version="1.0" encoding="utf-8"?><coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:identifier>${config.identifier}</dc:identifier><dcterms:created xsi:type="dcterms:W3CDTF">${config.created}</dcterms:created><dc:creator>${encodeXml(config.creator)}</dc:creator><dc:subject>${encodeXml(config.subject)}</dc:subject><category>RESMIYAZISMA</category><contentType>application/eyazisma</contentType><version>1.3</version><revision>sendika-eyp-builder 1.0.0</revision></coreProperties>`;
};

// Legacy export for compatibility
export const generateCoreXml = generateCorePropertiesXml;

function encodeXml(s: string): string {
    if (!s) return '';
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function generateGUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().toUpperCase();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}
