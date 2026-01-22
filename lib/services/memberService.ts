
import { supabase } from '@/lib/supabase'
import { Logger } from '@/lib/logger'

export interface MemberDocument {
    id: string
    member_id: string
    document_name: string
    document_type: string
    file_url: string
    file_size: number
    uploaded_by: string
    uploaded_at: string
    is_active: boolean
}

export const MemberService = {
    // Üye bilgilerini getir
    async getMember(memberId: string) {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', memberId)
            .single()

        if (error) throw error
        return data
    },

    // Tanımları getir
    async getDefinitions(type: string) {
        const { data, error } = await supabase
            .from('general_definitions')
            .select('id, type, label, description, sort_order, is_active')
            .eq('type', type)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('label', { ascending: true })

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
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData?.session?.access_token

        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', path)

        const response = await fetch('/api/members/documents', {
            method: 'POST',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            body: formData
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(payload?.message || 'Upload failed')
        }

        return payload?.path || path
    },

    // Belge kaydı oluştur (Database)
    async createDocumentRecord(document: any) {
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
            .eq('is_active', true)
            .order('uploaded_at', { ascending: false })

        if (error) throw error
        return data as MemberDocument[]
    },

    // Belge sil
    async deleteDocument(id: string, filePath: string) {
        // 1. Storage'dan sil
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData?.session?.access_token

        const response = await fetch('/api/members/documents', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
            },
            body: JSON.stringify({ path: filePath })
        })

        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
            throw new Error(payload?.message || 'Delete failed')
        }

        // 2. DB'den sil
        const { error: dbError } = await supabase
            .from('member_documents')
            .delete()
            .eq('id', id)

        if (dbError) throw dbError
        return true
    },

    // İstifa işlemi
    async resignMember(
        memberId: string,
        petitionFile: File,
        adminUserId: string,
        resignationReason: string,
        resignationDate: string,
        sendSms: boolean = false,
        sendEmail: boolean = false
    ) {
        try {
            // Önce üye bilgilerini al (e-posta göndermek için)
            const member = await this.getMember(memberId)

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
                document_name: petitionFile.name,
                file_url: publicUrlData.publicUrl,
                file_size: petitionFile.size,
                uploaded_by: adminUserId
            })

            // 3. Üye statüsünü ve istifa nedenini güncelle
            await this.updateMember(memberId, {
                membership_status: 'resigned',
                is_active: false,
                resignation_reason: resignationReason,
                resignation_date: resignationDate
            })

            await Logger.log({
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: memberId,
                details: {
                    change: 'resignation',
                    reason: resignationReason,
                    date: resignationDate,
                    admin_id: adminUserId
                },
                userId: adminUserId
            })

            // 4. Bildirimler
            if (sendSms && member.phone) {
                console.log(`TODO: Send SMS notification to ${member.phone}`)
                // SMS servisi entegrasyonu eklenecek
            }

            if (sendEmail && member.email) {
                try {
                    const memberName = `${member.first_name} ${member.last_name}`
                    const response = await fetch('/api/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'resignation',
                            to: member.email,
                            memberName,
                            resignationReason,
                            resignationDate
                        })
                    })
                    if (response.ok) {
                        console.log(`E-posta bildirimi gönderildi: ${member.email}`)
                    } else {
                        console.error('E-posta API hatası:', await response.text())
                    }
                } catch (emailError) {
                    console.error('E-posta gönderme hatası:', emailError)
                    // E-posta hatası işlemi durdurmaz, sadece log'a yazar
                }
            }

            return true
        } catch (error) {
            console.error('İstifa işlemi hatası:', error)
            throw error
        }
    }
}
