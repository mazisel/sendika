export type DecisionStatus = 'draft' | 'final' | 'cancelled' | 'revised';
export type BoardType = 'management' | 'audit' | 'discipline';

export interface Decision {
    id: string;
    decision_number: string;
    decision_date: string;
    meeting_number: string;
    board_type: BoardType;
    title: string;
    content: string;
    status: DecisionStatus;
    tags: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
}

export type DocumentType = 'incoming' | 'outgoing' | 'internal';
export type DocumentStatus = 'registered' | 'draft' | 'pending_approval' | 'sent' | 'archived' | 'cancelled';

export interface DMDocument {
    id: string;
    type: DocumentType;
    document_number: string;
    reference_date: string;
    sender?: string;
    receiver?: string;
    subject: string;
    description?: string;
    category_code?: string;
    status: DocumentStatus;
    related_document_id?: string;
    created_by: string;
    assigned_to?: string;
    created_at: string;
    updated_at: string;

    // Presentation
    header_title?: string;
    header_org_name?: string;
    sender_unit?: string;
    footer_org_name?: string;
    footer_address?: string;
    footer_contact?: string;
    footer_phone?: string;
    decision_number?: string;
    logo_url?: string;
    right_logo_url?: string;
    text_align?: 'left' | 'center' | 'right' | 'justify';
    receiver_text_align?: 'left' | 'center' | 'right' | 'justify';

    // Visibility
    show_header?: boolean;
    show_date?: boolean;
    show_sayi?: boolean;
    show_konu?: boolean;
    show_karar_no?: boolean;
    show_receiver?: boolean;
    show_signatures?: boolean;
    show_footer?: boolean;

    // Signers
    signers?: any[]; // JSONB
}

export type AttachmentParentType = 'decision' | 'document';

export interface DMAttachment {
    id: string;
    parent_id: string;
    parent_type: AttachmentParentType;
    file_path: string;
    file_name: string;
    file_type: string;
    file_size?: number;
    uploaded_by: string;
    created_at: string;
}

export interface DocumentTemplate {
    id: string;
    name: string;
    description?: string;
    category_code?: string;
    subject?: string;
    receiver?: string;
    content?: string;
    sender_unit?: string;
    text_align?: 'left' | 'center' | 'right' | 'justify';
    receiver_text_align?: 'left' | 'center' | 'right' | 'justify';
    logo_url?: string;
    right_logo_url?: string;
    footer_org_name?: string;
    footer_address?: string;
    footer_contact?: string;
    footer_phone?: string;
    signers?: Array<{ name: string; title: string; user_id?: string; signature_url?: string; }>;
    is_public?: boolean;
    decision_number?: string;
    header_title?: string;
    header_org_name?: string;
    show_header?: boolean;
    show_date?: boolean;
    show_sayi?: boolean;
    show_konu?: boolean;
    show_karar_no?: boolean;
    show_receiver?: boolean;
    show_signatures?: boolean;
    show_footer?: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

