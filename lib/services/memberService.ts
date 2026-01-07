
import { supabase } from '@/lib/supabase'

export interface MemberDocument {
    id: string
    member_id: string
    document_type: 'resignation_petition' | 'personnel_file' | 'other'
    file_name: string
    file_url: string
    file_size: number
    mime_type: string
    uploaded_by: string
    created_at: string
}

export const MemberService = {
    // Tanımları getir
    async getDefinitions(type: string) {
        const { data, error } = await supabase
            .from('general_definitions')
            .select('*')
            .eq('definition_type', type)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        if (error) throw error
        return data || []
    },

    // Üye bilgilerini güncelle
    async updateMember(id: string, data: any) {
        const { error } = await supabase
            .from('members')
            .update(data)
            .eq('id', id)

        if (error) throw error
        return true
    },

    // Belge yükle (Storage)
    async uploadDocument(file: File, path: string) {
        const { data, error } = await supabase
            .storage
            .from('member-documents')
            .upload(path, file)

        if (error) throw error
        return data.path
    },

    // Belge kaydı oluştur (Database)
    async createDocumentRecord(document: Partial<MemberDocument>) {
        const { error } = await supabase
            .from('member_documents')
            .insert(document)

        if (error) throw error
        return true
    },

    // Üyenin belgelerini getir
    async getMemberDocuments(memberId: string) {
        const { data, error } = await supabase
            .from('member_documents')
            .select('*')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as MemberDocument[]
    },

    // Belge sil
    async deleteDocument(id: string, filePath: string) {
        // 1. Storage'dan sil
        const { error: storageError } = await supabase
            .storage
            .from('member-documents')
            .remove([filePath])

        if (storageError) throw storageError

        // 2. DB'den sil
        const { error: dbError } = await supabase
            .from('member_documents')
            .delete()
            .eq('id', id)

        if (dbError) throw dbError
        return true
    },

    // İstifa işlemi
    async resignMember(memberId: string, petitionFile: File, adminUserId: string) {
        try {
            // 1. Dilekçeyi yükle
            const fileExt = petitionFile.name.split('.').pop()
            const fileName = `resignation_${memberId}_${Date.now()}.${fileExt}`
            const filePath = `${memberId}/${fileName}`

            await this.uploadDocument(petitionFile, filePath)

            // 2. Belge kaydı oluştur
            const { data: publicUrlData } = supabase.storage.from('member-documents').getPublicUrl(filePath)

            await this.createDocumentRecord({
                member_id: memberId,
                document_type: 'resignation_petition',
                file_name: petitionFile.name,
                file_url: publicUrlData.publicUrl,
                file_size: petitionFile.size,
                mime_type: petitionFile.type,
                uploaded_by: adminUserId
            })

            // 3. Üye statüsünü güncelle
            await this.updateMember(memberId, {
                membership_status: 'resigned',
                is_active: false
            })

            return true
        } catch (error) {
            console.error('İstifa işlemi hatası:', error)
            throw error
        }
    }
}
