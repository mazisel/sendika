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
