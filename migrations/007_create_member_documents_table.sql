-- Üye özlük dosyaları tablosu
CREATE TABLE IF NOT EXISTS member_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES admin_users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_member_documents_member_id ON member_documents(member_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_uploaded_at ON member_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_member_documents_is_active ON member_documents(is_active);
