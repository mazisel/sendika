import { supabase } from '@/lib/supabase';
import { Decision, DMDocument, DocumentType, BoardType, DocumentTemplate } from '@/lib/types/document-management';

export const DocumentService = {
    // --- Decisions ---

    async getDecisions(filters?: { board_type?: BoardType, status?: string }) {
        let query = supabase.from('dm_decisions').select('*').order('created_at', { ascending: false });

        if (filters?.board_type) {
            query = query.eq('board_type', filters.board_type);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        return await query;
    },

    async getDecisionById(id: string) {
        return await supabase.from('dm_decisions').select('*').eq('id', id).single();
    },

    async createDecision(decision: Partial<Decision>) {
        // Auto-generate number if final
        // In a real app, we might reserve a number first or generate on trigger.
        // For now, we assume simple insert. Number generation usually happens when finalizing.

        return await supabase.from('dm_decisions').insert([decision]).select().single();
    },

    async updateDecision(id: string, updates: Partial<Decision>) {
        return await supabase.from('dm_decisions').update(updates).eq('id', id).select().single();
    },

    // --- Documents ---

    async getDocuments(filters?: { type?: DocumentType, status?: string }) {
        let query = supabase.from('dm_documents').select('*').order('created_at', { ascending: false });

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        return await query;
    },

    async getDocumentById(id: string) {
        return await supabase.from('dm_documents').select('*').eq('id', id).single();
    },

    async createDocument(doc: Partial<DMDocument>) {
        return await supabase.from('dm_documents').insert([doc]).select().single();
    },

    async updateDocument(id: string, updates: Partial<DMDocument>) {
        return await supabase.from('dm_documents').update(updates).eq('id', id).select().single();
    },

    // --- Sequence Generation ---

    async generateNextSequence(type: DocumentType | 'decision', year: number): Promise<string> {
        // Call the database function to atomically increment and get
        const { data, error } = await supabase.rpc('get_next_dm_sequence', {
            p_year: year,
            p_type: type
        });

        if (error) {
            console.error('Error generating sequence:', error);
            throw error;
        }

        const seq = data as number;
        const seqStr = seq.toString().padStart(3, '0'); // 001, 002...

        // Format: 
        // Decision: 2024/001
        // Incoming: 2024/E/001
        // Outgoing: 2024/G/001 (or just 2024/001 as previously defined)
        // Internal: 2024/I/001

        if (type === 'decision') {
            return `${year}/${seqStr}`;
        } else if (type === 'incoming') {
            return `${year}/E/${seqStr}`;
        } else if (type === 'outgoing') {
            return `${year}/${seqStr}`;
        } else if (type === 'internal') {
            return `${year}/I/${seqStr}`;
        }

        return `${year}/${seqStr}`;
    },

    // --- Attachments ---

    async uploadAttachment(file: File, parentId: string, parentType: 'decision' | 'document') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${parentType}-${parentId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Upload to Storage
        // Assumption: Bucket 'official-documents' exists. If not, this throws error.
        const { error: uploadError } = await supabase.storage
            .from('official-documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Insert metadata to dm_attachments
        const user = (await supabase.auth.getUser()).data.user;
        const { data, error: dbError } = await supabase
            .from('dm_attachments')
            .insert([{
                parent_id: parentId,
                parent_type: parentType,
                file_path: filePath,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: user?.id
            }])
            .select()
            .single();

        if (dbError) throw dbError;
        return data;
    },

    async getAttachments(parentId: string) {
        // Also get public URL for convenience
        const { data: attachments, error } = await supabase
            .from('dm_attachments')
            .select('*')
            .eq('parent_id', parentId);

        if (error) throw error;

        // Map signatures to include publicUrl if manageable, or just let UI handle it.
        // Let's attach a temporary url getter on the client side usually.
        return attachments;
    },

    async getAttachmentUrl(path: string) {
        const { data } = supabase.storage.from('official-documents').getPublicUrl(path);
        return data.publicUrl;
    },

    // --- Document Templates (Belge Havuzu) ---

    async getTemplates(filters?: { search?: string; onlyPublic?: boolean; onlyMine?: boolean; userId?: string }) {
        let query = supabase
            .from('dm_document_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.search) {
            query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        if (filters?.onlyPublic) {
            query = query.eq('is_public', true);
        }

        if (filters?.onlyMine && filters?.userId) {
            query = query.eq('created_by', filters.userId);
        }

        return await query;
    },

    async getTemplateById(id: string) {
        return await supabase
            .from('dm_document_templates')
            .select('*')
            .eq('id', id)
            .single();
    },

    async saveAsTemplate(template: Partial<DocumentTemplate>) {
        const user = (await supabase.auth.getUser()).data.user;
        return await supabase
            .from('dm_document_templates')
            .insert([{
                ...template,
                created_by: user?.id
            }])
            .select()
            .single();
    },

    async updateTemplate(id: string, updates: Partial<DocumentTemplate>) {
        return await supabase
            .from('dm_document_templates')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
    },

    async deleteTemplate(id: string) {
        return await supabase
            .from('dm_document_templates')
            .delete()
            .eq('id', id);
    },

    // --- Document Defaults (Settings) ---

    async getDocumentDefaults() {
        const { data, error } = await supabase
            .from('dm_document_defaults')
            .select('*')
            .single();

        // Return null if no row found (initial state)
        if (error && error.code === 'PGRST116') return { data: null, error: null };

        return { data, error };
    },

    async saveDocumentDefaults(defaults: any) {
        const user = (await supabase.auth.getUser()).data.user;

        // Check if exists
        const { data: existing } = await this.getDocumentDefaults();

        if (existing) {
            return await supabase
                .from('dm_document_defaults')
                .update({
                    ...defaults,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            return await supabase
                .from('dm_document_defaults')
                .insert([{
                    ...defaults,
                    created_by: user?.id
                }])
                .select()
                .single();
        }
    },

    // --- Authorized Signers ---

    async getAuthorizedSigners() {
        const { data, error } = await supabase
            .from('dm_authorized_signers')
            .select(`
                *,
                user:admin_users (
                    id,
                    full_name,
                    role,
                    signature_url
                )
            `)
            .order('sort_order', { ascending: true });

        return { data, error };
    },

    async addAuthorizedSigner(userId: string, title?: string) {
        const user = (await supabase.auth.getUser()).data.user;

        return await supabase
            .from('dm_authorized_signers')
            .insert([{
                user_id: userId,
                title: title,
                created_by: user?.id
            }])
            .select()
            .single();
    },

    async removeAuthorizedSigner(id: string) {
        return await supabase
            .from('dm_authorized_signers')
            .delete()
            .eq('id', id);
    },

    async updateAuthorizedSignerOrder(items: { id: string, sort_order: number }[]) {
        // Simple sequential update for now
        // A stored procedure would be better for batch updates but this works for small lists
        const updates = items.map(item =>
            supabase
                .from('dm_authorized_signers')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        return await Promise.all(updates);
    }
};
