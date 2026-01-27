'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Archive, FileText, Eye, Trash2, MoreVertical,
    Calendar, User, Globe, Lock, Plus, Loader2
} from 'lucide-react';
import { DocumentService } from '@/lib/services/documentService';
import { DocumentTemplate } from '@/lib/types/document-management';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { toast } from 'react-hot-toast';
import { formatDateSafe } from '@/lib/dateUtils';

export default function DocumentPoolPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'mine' | 'public'>('all');
    const [user, setUser] = useState<any>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const currentUser = AdminAuth.getCurrentUser();
        setUser(currentUser);
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [filter, user]);

    const loadTemplates = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const { data, error } = await DocumentService.getTemplates({
                search: searchQuery || undefined,
                onlyPublic: filter === 'public',
                onlyMine: filter === 'mine',
                userId: user.id
            });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Şablonlar yüklenirken hata:', err);
            toast.error('Şablonlar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadTemplates();
    };

    const handleUseTemplate = (templateId: string) => {
        router.push(`/admin/documents/create?template=${templateId}`);
    };

    const handleDeleteTemplate = async (id: string) => {
        setDeleting(true);
        try {
            const { error } = await DocumentService.deleteTemplate(id);
            if (error) throw error;

            toast.success('Şablon silindi');
            setTemplates(prev => prev.filter(t => t.id !== id));
            setDeleteConfirmId(null);
        } catch (err) {
            console.error('Şablon silinirken hata:', err);
            toast.error('Şablon silinemedi');
        } finally {
            setDeleting(false);
        }
    };

    const canManageTemplate = (template: DocumentTemplate) => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        if (template.created_by === user.id) return true;
        if (PermissionManager.hasPermission(user, 'documents.templates.manage')) return true;
        return false;
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                        <Archive className="w-7 h-7 mr-3 text-indigo-600" />
                        Belge Havuzu
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Kayıtlı şablonlardan belge oluşturun veya yeni şablon ekleyin
                    </p>
                </div>

                <button
                    onClick={() => router.push('/admin/documents/create')}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Belge
                </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Şablon adı veya konu ara..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        >
                            <option value="all">Tümü</option>
                            <option value="mine">Benim Şablonlarım</option>
                            <option value="public">Genel Şablonlar</option>
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Ara
                        </button>
                    </div>
                </form>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Archive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Henüz şablon yok
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                        Belge oluştururken "Havuza Kaydet" ile şablon ekleyebilirsiniz
                    </p>
                    <button
                        onClick={() => router.push('/admin/documents/create')}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Belge Oluştur
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow group"
                        >
                            {/* Card Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                                {template.name}
                                            </h3>
                                            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                                                {template.is_public ? (
                                                    <span className="flex items-center text-green-600">
                                                        <Globe className="w-3 h-3 mr-1" />
                                                        Genel
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-slate-400">
                                                        <Lock className="w-3 h-3 mr-1" />
                                                        Özel
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3">
                                {template.description && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {template.description}
                                    </p>
                                )}

                                {template.subject && (
                                    <div className="text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Konu:</span>
                                        <span className="ml-2 text-slate-700 dark:text-slate-300">
                                            {template.subject}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-4">
                                    <span className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {formatDateSafe(template.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <button
                                    onClick={() => handleUseTemplate(template.id)}
                                    className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    <Eye className="w-4 h-4 mr-1.5" />
                                    Kullan
                                </button>

                                {canManageTemplate(template) && (
                                    <button
                                        onClick={() => setDeleteConfirmId(template.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        title="Şablonu Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            Şablonu Sil
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Bu şablonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deleting}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => handleDeleteTemplate(deleteConfirmId)}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                            >
                                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
