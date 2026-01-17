'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Shield,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { Role } from '@/lib/types';

export default function RolesPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        checkPermissionAndLoad();
    }, [router]);

    const checkPermissionAndLoad = async () => {
        const user = AdminAuth.getCurrentUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }

        // Rol yönetimi için 'users.manage' veya 'definitions.manage' yetkisi kontrolü
        // veya sadece super admin
        if (!PermissionManager.canManageDefinitions(user) && !PermissionManager.isSuperAdmin(user)) {
            router.push('/admin/dashboard');
            return;
        }

        loadRoles();
    };

    const loadRoles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('roles')
                .select('*')
                .order('name');

            if (error) throw error;
            setRoles(data || []);
        } catch (error) {
            console.error('Roller yüklenirken hata:', error);
            setMessage({ type: 'error', text: 'Roller yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu rolü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        // Sistem rolü kontrolü
        const role = roles.find(r => r.id === id);
        if (role?.is_system_role) {
            alert('Sistem rolleri silinemez.');
            return;
        }

        setDeletingId(id);
        try {
            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Rol başarıyla silindi' });
            setRoles(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Rol silinirken hata:', error);
            setMessage({ type: 'error', text: 'Rol silinirken bir hata oluştu' });
        } finally {
            setDeletingId(null);
        }
    };

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <Link
                            href="/admin/definitions"
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Geri Dön"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Rol Yönetimi</h1>
                            <p className="text-slate-600">Sistemdeki kullanıcı rollerini ve yetkilerini yönetin.</p>
                        </div>
                    </div>
                    <Link
                        href="/admin/definitions/roles/new"
                        className="inline-flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Yeni Rol Ekle</span>
                    </Link>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Rol adı ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        Rol bulunamadı.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {filteredRoles.map((role) => (
                            <div key={role.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-semibold text-slate-900">{role.name}</h3>
                                        {role.is_system_role && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                Sistem
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{role.description || 'Açıklama yok'}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Link
                                        href={`/admin/definitions/roles/${role.id}`}
                                        className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </Link>
                                    {!role.is_system_role && (
                                        <button
                                            onClick={() => handleDelete(role.id)}
                                            disabled={deletingId === role.id}
                                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="Sil"
                                        >
                                            {deletingId === role.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-5 h-5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
