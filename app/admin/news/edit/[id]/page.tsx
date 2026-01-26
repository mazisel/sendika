'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';
import { Category } from '@/lib/types';
import { Logger } from '@/lib/logger';
import Link from 'next/link';
import NotificationSelector from '@/components/admin/NotificationSelector';
import { NotificationService } from '@/lib/services/notificationService';

export default function EditNews() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
    const [uploading, setUploading] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [notificationChannels, setNotificationChannels] = useState({ push: false, sms: false, email: false });
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        loadCategories();
        loadNews();
    }, []);

    const loadCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (!error && data) {
                setCategories(data);
            }
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
        }
    };

    const loadNews = async () => {
        try {
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;
            if (data) {
                setTitle(data.title);
                setContent(data.content);
                setExcerpt(data.excerpt || '');
                setImageUrl(data.image_url || '');
                setCategoryId(data.category_id || '');
                setIsPublished(data.is_published);

                // If has image url, default to showing it via URL method first, or keep generic?
                // Let's decide based on if it's external or internal, but simpler is just show it.
                // We'll leave uploadMethod as 'file' defaulting to upload new? 
                // Or if existing image, maybe show URL field if it looks like URL?
                // Actually, logic in new page uses 'file' upload by default.
                // If existing data has url, we can switch to 'url' to show it, or just show preview.
                if (data.image_url) {
                    setUploadMethod('url');
                }
            }
        } catch (error) {
            console.error('Haber yüklenirken hata:', error);
            setError('Haber yüklenirken hata oluştu veya bulunamadı.');
        } finally {
            setFetching(false);
        }
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
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
            const slug = generateSlug(title);
            let finalImageUrl = imageUrl;

            // Eğer dosya yükleme seçilmişse ve dosya varsa, önce dosyayı yükle
            if (uploadMethod === 'file' && imageFile) {
                setUploading(true);
                const uploadResult = await StorageService.uploadImage(imageFile);

                if (!uploadResult.success) {
                    setError(uploadResult.error || 'Resim yüklenirken hata oluştu');
                    setUploading(false);
                    setLoading(false);
                    return;
                }

                finalImageUrl = uploadResult.url || '';
                setUploading(false);
            }

            const { error } = await supabase
                .from('news')
                .update({
                    title,
                    content,
                    excerpt: excerpt || null,
                    image_url: finalImageUrl || null,
                    category_id: categoryId || null,
                    slug,
                    is_published: isPublished,
                    updated_at: new Date().toISOString()
                    // published_at update logic? Only if switching from unpublished to published?
                    // Usually we keep original published date, or update it. Let's keep it simple.
                })
                .eq('id', params.id);

            if (error) {
                console.error('Update Error:', error);
                setError('Haber güncellenirken hata oluştu');
                return;
            }

            await Logger.log({
                action: 'UPDATE',
                entityType: 'System' as any,
                entityId: params.id as string,
                details: { title, is_published: isPublished },
                userId: user.id
            });

            // Send notifications if any channel selected
            const hasSelectedChannel = Object.values(notificationChannels).some(v => v);
            if (hasSelectedChannel) {
                await NotificationService.sendContentNotification('news', params.id as string, notificationChannels, {
                    title: title,
                    message: excerpt || content.substring(0, 100),
                    imageUrl: finalImageUrl
                });
            }

            router.push('/admin/news');

        } catch (error) {
            console.error('Handler Error:', error);
            setError('Haber güncellenirken hata oluştu');
        } finally {
            setLoading(false);
            setUploading(false);
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
                            <Link href="/admin/news" className="text-blue-600 hover:text-blue-800">
                                ← Haberler
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900">Haber Düzenle</h1>
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
                                    placeholder="Haber başlığını girin"
                                />
                            </div>

                            <div>
                                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
                                    Özet
                                </label>
                                <textarea
                                    id="excerpt"
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    placeholder="Kısa özet (isteğe bağlı)"
                                />
                            </div>

                            <div>
                                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                                    Kategori
                                </label>
                                <select
                                    id="categoryId"
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="">Kategori seçin (isteğe bağlı)</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Resim
                                </label>

                                {/* Upload Method Selection */}
                                <div className="flex space-x-4 mb-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="uploadMethod"
                                            value="file"
                                            checked={uploadMethod === 'file'}
                                            onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-900">Dosya Yükle</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="uploadMethod"
                                            value="url"
                                            checked={uploadMethod === 'url'}
                                            onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="ml-2 text-sm text-gray-900">URL Gir</span>
                                    </label>
                                </div>

                                {uploadMethod === 'file' ? (
                                    <div>
                                        <input
                                            type="file"
                                            id="imageFile"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const validation = StorageService.validateImageFile(file);
                                                    if (!validation.valid) {
                                                        setError(validation.error || 'Geçersiz dosya');
                                                        return;
                                                    }
                                                    setImageFile(file);
                                                    setError('');
                                                }
                                            }}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        {imageFile ? (
                                            <p className="mt-2 text-sm text-gray-600">
                                                Seçilen dosya: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                                            </p>
                                        ) : imageUrl ? (
                                            <p className="mt-2 text-sm text-gray-600">
                                                Mevcut resim: <a href={imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Görüntüle</a>
                                            </p>
                                        ) : null}
                                        <p className="mt-1 text-sm text-gray-500">
                                            JPEG, PNG, GIF veya WebP formatında, maksimum 5MB
                                        </p>
                                    </div>
                                ) : (
                                    <input
                                        type="url"
                                        id="imageUrl"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                )}
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
                                    rows={12}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    placeholder="Haber içeriğini girin"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isPublished"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">
                                    Hemen yayınla
                                </label>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <div className="mb-2">
                                    <span className="text-sm font-bold text-gray-700">Bildirim Gönder (Opsiyonel)</span>
                                    <p className="text-xs text-gray-500">Haber güncellendiğinde tekrar bildirim göndermek için seçiniz.</p>
                                </div>
                                <NotificationSelector
                                    channels={notificationChannels}
                                    onChange={setNotificationChannels}
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <Link
                                    href="/admin/news"
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    İptal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading || uploading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                                >
                                    {uploading ? 'Resim yükleniyor...' : loading ? 'Güncelleniyor...' : 'Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
