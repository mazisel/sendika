import { supabase } from '@/lib/supabase';

export interface EYPPackage {
    id: string;
    document_id: string;
    document_number: string;
    storage_path: string;
    file_size?: number;
    hash_value?: string;
    status: 'created' | 'signed' | 'sent' | 'delivered' | 'failed';
    signature_path?: string;
    signed_at?: string;
    signed_by?: string;
    sent_at?: string;
    kep_tracking_id?: string;
    created_by?: string;
    created_at: string;
}

export const EYPService = {
    /**
     * Upload EYP package to storage and save metadata
     */
    async uploadPackage(
        documentId: string,
        documentNumber: string,
        eypBlob: Blob,
        hashValue: string,
        createdBy: string
    ): Promise<{ success: boolean; data?: EYPPackage; error?: string }> {
        try {
            const year = new Date().getFullYear();
            const safeDocNum = documentNumber.replace(/[\/\\:*?"<>|]/g, '_');
            const storagePath = `${year}/${safeDocNum}.eyp`;

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('eyp-packages')
                .upload(storagePath, eypBlob, {
                    contentType: 'application/octet-stream',
                    upsert: true
                });

            if (uploadError) {
                console.error('EYP upload error:', uploadError);
                return { success: false, error: 'Dosya yüklenemedi: ' + uploadError.message };
            }

            // 2. Save metadata to database
            const { data, error: dbError } = await supabase
                .from('eyp_packages')
                .insert({
                    document_id: documentId,
                    document_number: documentNumber,
                    storage_path: storagePath,
                    file_size: eypBlob.size,
                    hash_value: hashValue,
                    status: 'created',
                    created_by: createdBy
                })
                .select()
                .single();

            if (dbError) {
                console.error('EYP metadata save error:', dbError);
                return { success: false, error: 'Metadata kaydedilemedi: ' + dbError.message };
            }

            return { success: true, data };
        } catch (err: any) {
            console.error('EYP service error:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Get EYP packages for a document
     */
    async getPackagesByDocument(documentId: string): Promise<EYPPackage[]> {
        const { data, error } = await supabase
            .from('eyp_packages')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching EYP packages:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get download URL for an EYP package
     */
    async getDownloadUrl(storagePath: string): Promise<string | null> {
        const { data } = await supabase.storage
            .from('eyp-packages')
            .createSignedUrl(storagePath, 3600); // 1 hour validity

        return data?.signedUrl || null;
    },

    /**
     * Update EYP package status
     */
    async updateStatus(
        packageId: string,
        status: EYPPackage['status'],
        additionalData?: Partial<EYPPackage>
    ): Promise<boolean> {
        const { error } = await supabase
            .from('eyp_packages')
            .update({ status, ...additionalData, updated_at: new Date().toISOString() })
            .eq('id', packageId);

        if (error) {
            console.error('Error updating EYP status:', error);
            return false;
        }

        return true;
    }
};
