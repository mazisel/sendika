import JSZip from 'jszip';
import fs from 'fs';

const zip = new JSZip();

const paketId = '9CE14C62-867E-4F38-84CB-32359EE35A73';
const corePropsId = 'e4f10b8943654880bc081a6d355d8e37';
const pdfFileName = 'test-document.pdf';

// Dummy PDF
const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF');

// Dosyaları doğrudan path ile ekle (folder() kullanmadan)
zip.file('UstYazi/' + pdfFileName, dummyPdf);

zip.file('package/services/metadata/core-properties/' + corePropsId + '.psmdcp', 
`<?xml version="1.0" encoding="utf-8"?><coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"><dc:identifier>${paketId}</dc:identifier><dcterms:created xsi:type="dcterms:W3CDTF">2026-01-24T12:00:00Z</dcterms:created><dc:creator>Test Kurum</dc:creator><dc:subject>Test Konu</dc:subject><category>RESMIYAZISMA</category><contentType>application/eyazisma</contentType><version>1.3</version><revision>test 1.0.0</revision></coreProperties>`);

zip.file('_rels/.rels', 
`<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Type="http://eyazisma.dpt/iliskiler/ustyazi" Target="/UstYazi/${pdfFileName}" Id="IdUstYazi" /><Relationship Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="/package/services/metadata/core-properties/${corePropsId}.psmdcp" Id="Rab1b0fae68d440ca" /><Relationship Type="http://eyazisma.dpt/iliskiler/belgehedef" Target="/BelgeHedef/BelgeHedef.xml" Id="IdBelgeHedef" /><Relationship Type="http://eyazisma.dpt/iliskiler/ustveri" Target="/Ustveri/Ustveri.xml" Id="IdUstveri" /><Relationship Type="http://eyazisma.dpt/iliskiler/paketozeti" Target="/PaketOzeti/PaketOzeti.xml" Id="IdPaketOzeti" /><Relationship Type="http://eyazisma.dpt/iliskiler/belgeimza" Target="/Imzalar/BelgeImza.xml" Id="IdBelgeImza" /><Relationship Type="http://eyazisma.dpt/iliskiler/nihaiozet" Target="/NihaiOzet/NihaiOzet.xml" Id="IdNihaiOzet" /></Relationships>`);

zip.file('BelgeHedef/BelgeHedef.xml', 
`<?xml version="1.0" encoding="utf-8"?>
<BelgeHedef xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:BelgeHedef-1">
  <tipler:HedefListesi>
    <tipler:Hedef>
      <tipler:KurumKurulus>
        <tipler:KKK>12345678</tipler:KKK>
        <tipler:Adi languageID="TR">Test Alıcı</tipler:Adi>
        <tipler:IletisimBilgisi>
          <tipler:Telefon></tipler:Telefon>
          <tipler:EPosta></tipler:EPosta>
          <tipler:Adres languageID="TR"></tipler:Adres>
          <tipler:Il languageID="TR"></tipler:Il>
          <tipler:Ilce languageID="TR"></tipler:Ilce>
          <tipler:Ulke languageID="TR">Türkiye</tipler:Ulke>
        </tipler:IletisimBilgisi>
      </tipler:KurumKurulus>
    </tipler:Hedef>
  </tipler:HedefListesi>
</BelgeHedef>`);

zip.file('Ustveri/Ustveri.xml',
`<?xml version="1.0" encoding="utf-8"?>
<Ustveri xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:Ustveri-1">
  <tipler:BelgeId>${paketId}</tipler:BelgeId>
  <tipler:Konu languageID="TR">Test Belgesi</tipler:Konu>
  <tipler:Tarih>2026-01-24T00:00:00Z</tipler:Tarih>
  <tipler:BelgeNo>1</tipler:BelgeNo>
  <tipler:GuvenlikKodu>TSD</tipler:GuvenlikKodu>
  <tipler:MimeTuru>application/pdf</tipler:MimeTuru>
  <tipler:OzId schemeID="GUID">12345678-1234-1234-1234-123456789012</tipler:OzId>
  <tipler:DagitimListesi>
    <tipler:Dagitim>
      <tipler:KurumKurulus>
        <tipler:KKK>12345678</tipler:KKK>
        <tipler:Adi languageID="TR">Test Alıcı</tipler:Adi>
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
    </tipler:Dagitim>
  </tipler:DagitimListesi>
  <tipler:Dil>tur</tipler:Dil>
  <tipler:Olusturan>
    <tipler:TuzelSahis>
      <tipler:Id schemeID="MERSIS">000000000000000</tipler:Id>
      <tipler:Adi languageID="TR">Test Gönderen</tipler:Adi>
    </tipler:TuzelSahis>
  </tipler:Olusturan>
  <tipler:DosyaAdi>${pdfFileName}</tipler:DosyaAdi>
</Ustveri>`);

zip.file('PaketOzeti/PaketOzeti.xml',
`<?xml version="1.0" encoding="utf-8"?>
<PaketOzeti xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Id="${paketId}" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
  <Reference URI="/BelgeHedef/BelgeHedef.xml" Type="http://eyazisma.dpt/bilesen#dahili">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</DigestValue>
  </Reference>
  <Reference URI="/UstYazi/${pdfFileName}" Type="http://eyazisma.dpt/bilesen#dahili">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</DigestValue>
  </Reference>
  <Reference URI="/Ustveri/Ustveri.xml" Type="http://eyazisma.dpt/bilesen#dahili">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=</DigestValue>
  </Reference>
</PaketOzeti>`);

zip.file('[Content_Types].xml', 
`<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="pdf" ContentType="application/pdf" /><Default Extension="psmdcp" ContentType="application/vnd.openxmlformats-package.core-properties+xml" /><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" /><Default Extension="xml" ContentType="application/xml" /><Default Extension="imz" ContentType="application/octet-stream" /></Types>`);

zip.file('Imzalar/BelgeImza.xml',
`<?xml version="1.0" encoding="utf-8"?>
<BelgeImza xmlns:tipler="urn:dpt:eyazisma:schema:xsd:Tipler-1" xmlns="urn:dpt:eyazisma:schema:xsd:BelgeImza-1">
  <tipler:ImzaListesi>
    <tipler:Imza>
      <tipler:Imzalayan>
        <tipler:Kisi>
          <tipler:IlkAdi>Test</tipler:IlkAdi>
          <tipler:Soyadi>Kullanici</tipler:Soyadi>
          <tipler:Unvan>Yetkili</tipler:Unvan>
        </tipler:Kisi>
      </tipler:Imzalayan>
      <tipler:Makam>Yetkili</tipler:Makam>
      <tipler:Amac languageID="TR">İmzalama</tipler:Amac>
      <tipler:Tarih>2026-01-24T00:00:00Z</tipler:Tarih>
    </tipler:Imza>
  </tipler:ImzaListesi>
</BelgeImza>`);

zip.file('NihaiOzet/NihaiOzet.xml',
`<?xml version="1.0" encoding="utf-8"?>
<NihaiOzet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Id="${paketId}" xmlns="urn:dpt:eyazisma:schema:xsd:NihaiOzet-1">
  <Reference URI="/BelgeHedef/BelgeHedef.xml" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</DigestValue>
  </Reference>
  <Reference URI="/Imzalar/BelgeImza.xml" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=</DigestValue>
  </Reference>
  <Reference URI="/UstYazi/${pdfFileName}" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</DigestValue>
  </Reference>
  <Reference URI="/Ustveri/Ustveri.xml" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=</DigestValue>
  </Reference>
  <Reference URI="/PaketOzeti/PaketOzeti.xml" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE=</DigestValue>
  </Reference>
  <Reference URI="/package/services/metadata/core-properties/${corePropsId}.psmdcp" Type="http://eyazisma.dpt/bilesen#dahili" xmlns="urn:dpt:eyazisma:schema:xsd:PaketOzeti-1">
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
    <DigestValue>FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF=</DigestValue>
  </Reference>
</NihaiOzet>`);

// Generate - klasör entry'leri olmadan
const blob = await zip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE'
});

fs.writeFileSync('test-v2.eyp', blob);
console.log('Test EYP v2 created: test-v2.eyp');

// List contents
console.log('\nGenerated EYP v2 contents:');
const testZip = await JSZip.loadAsync(blob);
for (const [filename, file] of Object.entries(testZip.files)) {
    if (!file.dir) {
        console.log('  ' + filename);
    }
}
