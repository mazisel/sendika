import JSZip from 'jszip';
import fs from 'fs';

// Örnek EYP'yi yükle ve sadece XML dosyalarını değiştir
const sampleBuffer = fs.readFileSync('84879bdf-9589-48d5-a9c0-4ff767f768bf-102da4ca-1769151363598.eyp');
const sampleZip = await JSZip.loadAsync(sampleBuffer);

// Yeni bir zip oluştur
const newZip = new JSZip();

// Örnek EYP'deki tüm dosyaları kopyala
for (const [filename, file] of Object.entries(sampleZip.files)) {
    if (!file.dir) {
        const content = await file.async('nodebuffer');
        newZip.file(filename, content);
    }
}

// Bu kopyalanmış EYP'yi kaydet (test için)
const copyBlob = await newZip.generateAsync({ 
    type: 'nodebuffer',
    compression: 'DEFLATE'
});
fs.writeFileSync('test-copy.eyp', copyBlob);

console.log('Örnek EYP kopyalandı: test-copy.eyp');
console.log('\nOrijinal vs Kopya karşılaştırması:');
console.log('Orijinal boyut:', sampleBuffer.length);
console.log('Kopya boyut:', copyBlob.length);

// İçerikleri listele
console.log('\nKopya içeriği:');
const copyCheck = await JSZip.loadAsync(copyBlob);
for (const [fn, f] of Object.entries(copyCheck.files)) {
    if (!f.dir) {
        console.log('  ' + fn + ' (' + (await f.async('nodebuffer')).length + ' bytes)');
    }
}
