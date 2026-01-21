-- Add distinct permissions for Tools (Calendar, Sticky Message)
-- Previously these were shared with 'announcements.manage', causing confusion.

INSERT INTO permissions (key, name, description, group_name) VALUES
('sticky_message.manage', 'Sabit Metin Yönetimi', 'Üst banttaki kayan yazı/sabit mesaj alanını yönetme', 'tools'),
('calendar.manage', 'Ajanda Yönetimi', 'Ortak takvim ve etkinlikleri yönetme', 'tools')
ON CONFLICT (key) DO NOTHING;
