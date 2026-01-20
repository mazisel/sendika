'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Save, X, User, Calendar } from 'lucide-react';
import { PermissionManager } from '@/lib/permissions';
import { logAuditAction } from '@/lib/audit-logger';

interface StickyMessage {
    id: string;
    message: string;
    created_by: string;
    created_at: string;
    creator_name?: string;
}

export default function StickyMessagePage() {
    const [message, setMessage] = useState('');
    const [currentMessage, setCurrentMessage] = useState<StickyMessage | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasPermission, setHasPermission] = useState(true);

    useEffect(() => {
        checkPermission();
        loadMessage();
    }, []);

    const checkPermission = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Get current user from admin_users
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('*')
                .eq('email', user.email)
                .single();

            if (adminUser && !PermissionManager.canManageStickyMessages(adminUser)) {
                setHasPermission(false);
            }
        }
    };

    const loadMessage = async () => {
        try {
            const { data, error } = await supabase
                .from('sticky_messages')
                .select(`
                    *,
                    creator:admin_users!sticky_messages_created_by_fkey(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Mesaj yükleme hatası:', error);
            }

            if (data && data.length > 0) {
                const item = data[0];
                setCurrentMessage({
                    ...item,
                    creator_name: item.creator?.full_name
                });
                setMessage(item.message || '');
            }
        } catch (error) {
            console.error('Hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!message.trim()) {
            alert('Lütfen bir mesaj girin');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('Oturum geçersiz');
                return;
            }

            // Get current user from admin_users
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!adminUser) {
                alert('Yönetici kullanıcı bulunamadı');
                return;
            }

            const { error } = await supabase
                .from('sticky_messages')
                .insert({
                    message: message.trim(),
                    created_by: adminUser.id
                });

            if (error) {
                console.error('Kaydetme hatası:', error);
                alert('Mesaj kaydedilemedi');
                return;
            }

            // Audit Log
            await logAuditAction({
                action: 'CREATE',
                entityType: 'STICKY_MESSAGE',
                details: { message: message.trim() }
            });

            alert('Mesaj başarıyla kaydedildi!');
            loadMessage();
        } catch (error) {
            console.error('Hata:', error);
            alert('Bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        if (!currentMessage) return;

        if (!confirm('Sabit mesajı silmek istediğinizden emin misiniz?')) {
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('sticky_messages')
                .delete()
                .eq('id', currentMessage.id);

            if (error) {
                console.error('Silme hatası:', error);
                alert('Mesaj silinemedi');
                return;
            }

            // Audit Log
            await logAuditAction({
                action: 'DELETE',
                entityType: 'STICKY_MESSAGE',
                entityId: currentMessage.id,
                details: { message: currentMessage.message }
            });

            setMessage('');
            setCurrentMessage(null);
            alert('Mesaj başarıyla silindi');
        } catch (error) {
            console.error('Hata:', error);
            alert('Bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-slate-600 dark:text-slate-400">Yükleniyor...</div>
            </div>
        );
    }

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                    <X className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Yetkiniz Yok</h2>
                <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                    Bu sayfaya erişmek için gerekli yetkilere sahip değilsiniz.
                    Lütfen sistem yöneticinizle iletişime geçin.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Sabit Metin</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Üst menüde sabit olarak gösterilecek mesajı düzenleyin
                    </p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            {/* Current Message Info */}
            {currentMessage && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    <strong>Ekleyen:</strong> {currentMessage.creator_name || 'Bilinmiyor'}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-slate-700 dark:text-slate-300">
                                    <strong>Tarih:</strong> {new Date(currentMessage.created_at).toLocaleString('tr-TR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Editor */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Mesaj Metni
                </label>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Örn: Önemli duyuru: Yarın saat 14:00'de genel toplantı yapılacaktır."
                    className="w-full h-32 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:text-slate-100 resize-none"
                    maxLength={500}
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {message.length}/500 karakter
                    </span>
                    <div className="flex space-x-2">
                        {currentMessage && (
                            <button
                                onClick={handleClear}
                                disabled={saving}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                <span>Temizle</span>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving || !message.trim()}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {message.trim() && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Önizleme</h3>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <MessageSquare className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-800 dark:text-slate-200">{message}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
