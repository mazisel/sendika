import JSZip from 'jszip';
import { EYPPackageConfig } from './types';
import { generateUstVeriXml, generateBelgeHedefXml, generateContentTypesXml, generateRootRelsXml } from './xml-templates';

export class EYPBuilder {
    static async buildPackage(config: EYPPackageConfig): Promise<Blob> {
        const zip = new JSZip();

        // 1. [Content_Types].xml
        zip.file('[Content_Types].xml', generateContentTypesXml());

        // 2. _rels/.rels
        const relsFolder = zip.folder('_rels');
        if (relsFolder) {
            relsFolder.file('.rels', generateRootRelsXml());
        }

        // 3. UstYazi Folder
        const ustYaziFolder = zip.folder('UstYazi');
        if (ustYaziFolder) {
            ustYaziFolder.file('UstYazi.pdf', config.ustYaziPdf);
        }

        // 4. Ustveri Folder
        const ustVeriFolder = zip.folder('Ustveri');
        if (ustVeriFolder) {
            const xmlContent = generateUstVeriXml(config.ustVeri);
            ustVeriFolder.file('Ustveri.xml', xmlContent);
        }

        // 5. BelgeHedef Folder
        const belgeHedefFolder = zip.folder('BelgeHedef');
        if (belgeHedefFolder) {
            const xmlContent = generateBelgeHedefXml(config.belgeHedef);
            belgeHedefFolder.file('BelgeHedef.xml', xmlContent);
        }

        // 6. Imzalar Folder (Optional but standard)
        if (config.imza) {
            const imzalarFolder = zip.folder('Imzalar');
            if (imzalarFolder) {
                imzalarFolder.file('ImzaCades.imz', config.imza);
            }
        }

        // 7. Ekler Folder (Optional)
        if (config.attachments && config.attachments.length > 0) {
            const eklerFolder = zip.folder('Ekler');
            if (eklerFolder) {
                config.attachments.forEach(att => {
                    eklerFolder.file(att.fileName, att.content);
                });
            }
        }

        // Generate Blob
        return await zip.generateAsync({ type: 'blob', mimeType: 'application/octet-stream' });
    }
}
