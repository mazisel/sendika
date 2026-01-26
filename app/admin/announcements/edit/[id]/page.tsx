'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';
import Link from 'next/link';
import NotificationSelector from '@/components/admin/NotificationSelector';
import { NotificationService } from '@/lib/services/notificationService';

export default function EditAnnouncement() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<'general' | 'urgent' | 'info' | 'warning'>('general');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [notificationChannels, setNotificationChannels] = useState({ push: false, sms: false, email: false });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        loadAnnouncement();
    }, []);

    const loadAnnouncement = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;
            if (data) {
                setTitle(data.title);
                setContent(data.content);
                setType(data.type);
                setStartDate(new Date(data.start_date).toISOString().split('T')[0]);
                setEndDate(data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '');
                setIsActive(data.is_active);
            }
        } catch (error) {
            console.error('Duyuru yüklenirken hata:', error);
            setError('Duyuru yüklenirken hata oluştu veya bulunamadı.');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const user = AdminAuth.getCurrentUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }

        try {
            const { error } = await supabase
                .from('announcements')
                .update({
                    title,
                    content,
                    type,
                    is_active: isActive,
                    start_date: new Date(startDate).toISOString(),
                    end_date: endDate ? new Date(endDate).toISOString() : null,
                    // created_by is not updated
                })
                .eq('id', params.id);

            if (error) {
                console.error('Update Error:', error);
                setError('Duyuru güncellenirken hata oluştu');
                return;
            }

            await Logger.log({
                action: 'UPDATE',
                entityType: 'System' as any,
                entityId: params.id as string,
                details: { title, is_active: isActive },
                userId: user.id
            });

            // Send notifications if any channel selected
            // Only send if explicit user action? Yes, reuse the selector logic.
            const hasSelectedChannel = Object.values(notificationChannels).some(v => v);
            if (hasSelectedChannel) {
                await NotificationService.sendContentNotification('announcement', params.id as string, notificationChannels, {
                    title: title,
                    message: content
                });
            }

            router.push('/admin/announcements');

        } catch (error) {
            console.error('Handler Error:', error);
            setError('Duyuru güncellenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <Link href="/admin/announcements" className="text-blue-600 hover:text-blue-800">
                                ← Duyurular
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900">Duyuru Düzenle</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white shadow rounded-lg">
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                    Başlık *
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    placeholder="Duyuru başlığını girin"
                                />
                            </div>

                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                                    Duyuru Türü *
                                </label>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'general' | 'urgent' | 'info' | 'warning')}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="general">Genel</option>
                                    <option value="info">Bilgi</option>
                                    <option value="warning">Uyarı</option>
                                    <option value="urgent">Acil</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                                    İçerik *
                                </label>
                                <textarea
                                    id="content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                    rows={8}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    placeholder="Duyuru içeriğini girin"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                                        Başlangıç Tarihi *
                                    </label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                                        Bitiş Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">Boş bırakılırsa süresiz olur</p>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                    Duyuru aktif
                                </label>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <div className="mb-2">
                                    <span className="text-sm font-bold text-gray-700">Bildirim Gönder (Opsiyonel)</span>
                                    <p className="text-xs text-gray-500">Duyuru güncellendiğinde tekrar bildirim göndermek için seçiniz.</p>
                                </div>
                                <NotificationSelector
                                    channels={notificationChannels}
                                    onChange={setNotificationChannels}
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <Link
                                    href="/admin/announcements"
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    İptal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Güncelleniyor...' : 'Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
